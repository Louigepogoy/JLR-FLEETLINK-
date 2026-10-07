'use client';

import { useEffect, useState } from 'react';
import { Camera, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { DisputeIcon, IconChip } from '@/components/illustrations/MiniIcons';
import EmptyState from '@/components/ui/EmptyState';
import api from '@/lib/api';
import { apiErrorMessage } from '@/lib/chat';
import { disputeOutcomeLabel } from '@/lib/inspection';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import BookingId from '@/components/booking/BookingId';

type Dispute = {
  id: string;
  booking_id: string;
  reason: string;
  evidence: { url: string; type: 'image' | 'video' }[];
  status: 'open' | 'refunded' | 'partially_refunded' | 'dismissed';
  refund_amount: string | null;
  refund_method: 'paymongo' | 'manual' | 'partly_manual' | null;
  refund_reference: string | null;
  evidence_requested_at: string | null;
  evidence_request_note: string | null;
  admin_notes: string | null;
  resolved_by_name: string | null;
  resolved_at: string | null;
  created_at: string;
  start_date: string;
  end_date: string;
  total_amount: string;
  paid_amount: string;
  handed_over_at: string;
  inspected_at: string;
  vehicle_title: string;
  brand: string;
  model: string;
  plate_number: string | null;
  vehicle_images: string[] | null;
  customer_name: string;
  customer_email: string;
  owner_name: string;
  owner_email: string;
};

type Action = 'refund_full' | 'refund_partial' | 'dismiss';

const FILTERS = [
  { value: 'open', label: 'Open' },
  { value: 'all', label: 'All' },
];

const statusColors: Record<Dispute['status'], string> = {
  open: 'bg-amber-500/20 text-amber-500',
  refunded: 'bg-red-500/20 text-red-500',
  partially_refunded: 'bg-blue-500/20 text-blue-500',
  dismissed: 'bg-gray-500/20 text-gray-500',
};

const refundMethodLabel: Record<NonNullable<Dispute['refund_method']>, string> = {
  paymongo: 'sent automatically via PayMongo',
  manual: 'manual — admin sends it',
  partly_manual: 'partly via PayMongo, rest sent manually',
};

const formatDateTime =(value: string) => new Date(value).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });

/** Ask the renter to upload photo/video proof before deciding a refund. */
function RequestEvidence({ dispute, onRequested }: { dispute: Dispute; onRequested: () => void }) {
  const [note, setNote] = useState(dispute.evidence_request_note || '');
  const [sending, setSending] = useState(false);

  const send = async () => {
    setSending(true);
    try {
      await api.post(`/disputes/${dispute.id}/request-evidence`, { note: note.trim() || undefined });
      toast.success(`Asked ${dispute.customer_name} for evidence`);
      onRequested();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not request evidence'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
      <p className="flex items-center gap-2 font-semibold"><Camera className="h-4 w-4 text-amber-500" /> Request evidence from the renter</p>
      {dispute.evidence_requested_at ? (
        <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
          Requested {formatDateTime(dispute.evidence_requested_at)} — waiting for the renter to upload. You can send a reminder.
        </p>
      ) : (
        <p className="mt-1 text-sm text-[var(--muted)]">
          The renter gets a notification and can upload photos or videos from My Bookings.
        </p>
      )}
      <input
        className="input-field mt-3 text-sm"
        maxLength={1000}
        placeholder="What should they show? e.g. close-up of the dent and the plate number (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <button onClick={send} disabled={sending} className="btn-outline mt-3 text-sm">
        {sending ? 'Sending...' : dispute.evidence_requested_at ? 'Send Reminder' : 'Request Evidence'}
      </button>
    </div>
  );
}

function ResolveForm({ dispute, onResolved }: { dispute: Dispute; onResolved: () => void }) {
  // Refunds need proof; without any evidence only a dismissal is possible.
  const hasEvidence = dispute.evidence.length > 0;
  const [action, setAction] = useState<Action>(hasEvidence ? 'refund_full' : 'dismiss');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const paid = Number(dispute.paid_amount);

  const submit = async () => {
    const summary = {
      refund_full: `a FULL refund of ${formatCurrency(paid)} to ${dispute.customer_name} (owner not paid)`,
      refund_partial: `a partial refund of ${formatCurrency(Number(amount) || 0)} to ${dispute.customer_name} (owner gets the rest)`,
      dismiss: `dismissing the dispute with no refund (owner gets paid in full)`,
    }[action];
    const refundNote = action === 'dismiss' ? '' : ' The money is sent back to the renter automatically through PayMongo.';
    if (!confirm(`Confirm ${summary}?${refundNote}`)) return;
    setSaving(true);
    const resolve = (manual: boolean) => api.post(`/disputes/${dispute.id}/resolve`, {
      action,
      amount: action === 'refund_partial' ? Number(amount) : undefined,
      notes: notes.trim() || undefined,
      manual: manual || undefined,
    });
    try {
      const res = await resolve(false);
      const method = res.data.data.refund_method;
      toast.success(method === 'paymongo' ? 'Dispute resolved — refund sent through PayMongo'
        : method === 'partly_manual' ? 'Dispute resolved — part of the refund must be sent manually'
          : 'Dispute resolved');
      onResolved();
    } catch (err) {
      const data = (err as { response?: { data?: { canRefundManually?: boolean } } }).response?.data;
      // PayMongo couldn't refund (e.g. low balance, too old): offer to record it as a manual refund.
      if (data?.canRefundManually && confirm(
        `${apiErrorMessage(err, 'Automatic refund failed')}\n\nRecord it as a MANUAL refund instead? You will send the money to ${dispute.customer_name} yourself (GCash/bank).`
      )) {
        try {
          await resolve(true);
          toast.success('Dispute resolved — send the refund manually');
          onResolved();
        } catch (retryErr) {
          toast.error(apiErrorMessage(retryErr, 'Failed to resolve dispute'));
        }
      } else if (!data?.canRefundManually) {
        toast.error(apiErrorMessage(err, 'Failed to resolve dispute'));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-[var(--card-border)] p-4">
      <p className="mb-3 font-semibold">Decision</p>
      {!hasEvidence && (
        <p className="mb-3 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400">
          No photo or video evidence yet — you can&apos;t refund without proof. Request evidence above, or dismiss.
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-3">
        {([
          ['refund_full', 'Full refund', 'Vehicle not as listed'],
          ['refund_partial', 'Partial refund', 'Minor issue, split the payment'],
          ['dismiss', 'Dismiss', 'No valid problem'],
        ] as const).map(([value, label, hint]) => {
          const locked = value !== 'dismiss' && !hasEvidence;
          return (
          <label
            key={value}
            className={cn(
              'rounded-lg border p-3 text-sm',
              locked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
              action === value ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--card-border)]'
            )}
          >
            <input type="radio" name={`action-${dispute.id}`} value={value} checked={action === value}
              disabled={locked} onChange={() => setAction(value)} className="sr-only" />
            <span className="block font-medium">{label}</span>
            <span className="text-xs text-[var(--muted)]">{hint}</span>
          </label>
          );
        })}
      </div>
      {action === 'refund_partial' && (
        <input
          type="number" min="1" max={paid - 0.01} step="0.01"
          className="input-field mt-3"
          placeholder={`Refund amount (less than ${formatCurrency(paid)})`}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      )}
      <textarea
        rows={2}
        className="input-field mt-3 resize-none text-sm"
        placeholder="Note to the customer and owner (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <button onClick={submit} disabled={saving} className="btn-primary mt-3 text-sm">
        {saving ? 'Saving...' : 'Resolve Dispute'}
      </button>
    </div>
  );
}

export default function AdminDisputesPage() {
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('open');
  const [disputes, setDisputes] = useState<Dispute[]>([]);

  const fetchDisputes = (status = filter) =>
    api.get('/disputes', { params: { status } }).then((res) => setDisputes(res.data.data)).catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => { fetchDisputes(filter); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <DashboardLayout role="admin">
        <div className="skeleton h-8 w-56 mb-6" />
        <div className="skeleton h-64 rounded-2xl" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin">
      <h2 className="text-2xl font-bold flex items-center gap-3 mb-2"><IconChip icon={DisputeIcon} className="h-10 w-10 rounded-xl" iconClassName="h-7 w-7" />Pickup Disputes</h2>
      <p className="text-sm text-[var(--muted)] mb-4">
        Renters who rejected a vehicle at pickup. The booking was already cancelled (its dates are open again); the owner&apos;s payout stays on hold until you decide who gets the money. Compare the
        listing photos with the renter&apos;s evidence, then refund or dismiss. Refunds go back to the renter
        automatically through PayMongo (the platform keeps PayMongo&apos;s fee); if that fails you can record it as a
        manual refund instead.
      </p>
      <div className="mb-6 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn('rounded-full px-4 py-1.5 text-sm', filter === f.value ? 'gradient-bg text-white' : 'btn-outline')}
          >
            {f.label}
          </button>
        ))}
      </div>

      {disputes.length === 0 ? (
        <EmptyState icon={ShieldAlert} title="No disputes" description="No renter has reported a problem at pickup." />
      ) : (
        <div className="space-y-6">
          {disputes.map((d) => (
            <div key={d.id} className="glass-card p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">{d.vehicle_title}</h3>
                  <BookingId id={d.booking_id} className="mt-1" />
                  <p className="text-sm text-[var(--muted)]">
                    {d.brand} {d.model}{d.plate_number ? ` · ${d.plate_number}` : ''} · {formatDate(d.start_date)} — {formatDate(d.end_date)}
                  </p>
                  <p className="mt-1 text-sm">
                    Renter: <span className="font-medium">{d.customer_name}</span> ({d.customer_email}) · Owner:{' '}
                    <span className="font-medium">{d.owner_name}</span> ({d.owner_email})
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Handed over {formatDateTime(d.handed_over_at)} · Rejected {formatDateTime(d.inspected_at)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-[var(--muted)]">Paid (held)</p>
                  <p className="text-xl font-bold">{formatCurrency(Number(d.paid_amount))}</p>
                  <span className={cn('mt-1 inline-block rounded-full px-2 py-1 text-xs', statusColors[d.status])}>
                    {disputeOutcomeLabel[d.status]}
                  </span>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-red-500/5 p-4 text-sm">
                <p className="font-medium text-red-500">Renter&apos;s complaint</p>
                <p className="mt-1 whitespace-pre-wrap">{d.reason}</p>
              </div>

              <div className="mt-4 grid gap-6 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-medium">Listing photos</p>
                  <div className="flex flex-wrap gap-2">
                    {(d.vehicle_images || []).slice(0, 6).map((url) => (
                      <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="Listing" className="h-24 w-24 rounded-lg object-cover" />
                      </a>
                    ))}
                    {!d.vehicle_images?.length && <p className="text-sm text-[var(--muted)]">No listing photos</p>}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium">Renter&apos;s evidence</p>
                  <div className="flex flex-wrap gap-2">
                    {d.evidence.map((e) => (e.type === 'video' ? (
                      <video key={e.url} src={e.url} controls preload="metadata" className="h-24 w-40 rounded-lg bg-black" />
                    ) : (
                      <a key={e.url} href={e.url} target="_blank" rel="noopener noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={e.url} alt="Evidence" className="h-24 w-24 rounded-lg object-cover" />
                      </a>
                    )))}
                    {!d.evidence.length && <p className="text-sm font-medium text-amber-600 dark:text-amber-400">No photos or videos yet — request evidence before refunding</p>}
                  </div>
                </div>
              </div>

              {d.status === 'open' ? (
                <>
                  <RequestEvidence dispute={d} onRequested={() => fetchDisputes()} />
                  <ResolveForm key={`${d.id}-${d.evidence.length}`} dispute={d} onResolved={() => fetchDisputes()} />
                </>
              ) : (
                <div className="mt-4 text-sm text-[var(--muted)]">
                  {d.refund_amount && (
                    <p>
                      Refunded: <span className="font-semibold text-[var(--foreground)]">{formatCurrency(Number(d.refund_amount))}</span>
                      {d.refund_method && <span> · {refundMethodLabel[d.refund_method]}</span>}
                    </p>
                  )}
                  {d.refund_reference && <p className="break-all">PayMongo ref: {d.refund_reference}</p>}
                  {d.admin_notes && <p>Note: {d.admin_notes}</p>}
                  {d.resolved_at && <p>Resolved by {d.resolved_by_name || 'admin'} on {formatDateTime(d.resolved_at)}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
