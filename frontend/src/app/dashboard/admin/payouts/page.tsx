'use client';

import { useEffect, useState } from 'react';
import { History, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { IconChip, WalletIcon } from '@/components/illustrations/MiniIcons';
import EmptyState from '@/components/ui/EmptyState';
import api from '@/lib/api';
import { bookingCode, cn, formatCurrency, formatTimestamp } from '@/lib/utils';

type PendingPayout = {
  owner_id: string;
  owner_name: string;
  owner_email: string;
  payout_method: 'gcash' | 'bank' | null;
  account_name: string | null;
  account_number: string | null;
  account_status: 'unverified' | 'verified' | null;
  pending_amount: number;
  pending_transactions: number;
};

type PayoutSource = 'accepted' | 'auto_accepted' | 'dispute' | 'account_added' | 'manual' | 'legacy';

type PayoutRecord = {
  id: string;
  reference: string;
  amount: string;
  owner_name: string | null;
  owner_email: string | null;
  payout_method: 'gcash' | 'bank' | null;
  account_name: string | null;
  account_number: string | null;
  source: PayoutSource;
  paid_by_name: string | null;
  booking_ids: string[];
  created_at: string;
};

const sourceLabel: Record<PayoutSource, { label: string; className: string }> = {
  accepted: { label: 'Auto · renter accepted', className: 'bg-green-500/15 text-green-600 dark:text-green-400' },
  auto_accepted: { label: 'Auto · inspection time ended', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  dispute: { label: 'Auto · dispute closed', className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
  account_added: { label: 'Auto · payout account added', className: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' },
  manual: { label: 'Manual · admin', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  legacy: { label: 'Earlier payout', className: 'bg-gray-500/15 text-gray-500' },
};

export default function AdminPayoutsPage() {
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<PendingPayout[]>([]);
  const [history, setHistory] = useState<PayoutRecord[]>([]);
  const [payingId, setPayingId] = useState<string | null>(null);

  const fetchPayouts = () =>
    Promise.all([
      api.get('/transactions/payouts/pending').then((res) => setPayouts(res.data.data)).catch(() => {}),
      api.get('/transactions/payouts/history').then((res) => setHistory(res.data.data)).catch(() => {}),
    ]).finally(() => setLoading(false));

  useEffect(() => { fetchPayouts(); }, []);

  const handleMarkPaid = async (ownerId: string, ownerName: string) => {
    if (!confirm(`Confirm that you already sent this payout to ${ownerName}? This cannot be undone.`)) return;
    setPayingId(ownerId);
    try {
      const res = await api.post(`/transactions/payouts/${ownerId}/mark-paid`);
      toast.success(`Marked ${formatCurrency(res.data.data.totalPaid)} as paid to ${ownerName}`);
      fetchPayouts();
    } catch {
      toast.error('Failed to mark payout as paid');
    } finally {
      setPayingId(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="admin">
        <div className="skeleton h-8 w-56 mb-6" />
        <div className="skeleton h-64 rounded-2xl" />
      </DashboardLayout>
    );
  }

  const totalPaidOut = history.reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <DashboardLayout role="admin">
      <h2 className="text-2xl font-bold flex items-center gap-3 mb-2"><IconChip icon={WalletIcon} className="h-10 w-10 rounded-xl" iconClassName="h-7 w-7" />Owner Payouts</h2>
      <p className="text-sm text-[var(--muted)] mb-6">
        Owner earnings are sent automatically to the owner&apos;s saved GCash/bank account as soon as the renter
        accepts the vehicle (or the inspection time runs out, or a dispute closes without a full refund). Owners
        listed here have earnings waiting — usually because they haven&apos;t added a payout account yet; it&apos;s sent
        automatically once they do. You can still mark an amount as paid manually here. Every payout, automatic or
        manual, is recorded in the history below.
      </p>

      <h3 className="font-semibold mb-3">Waiting to be paid</h3>
      {payouts.length === 0 ? (
        <EmptyState icon={Wallet} title="No pending payouts" description="All owner earnings have been paid out." />
      ) : (
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)]">
                <th className="text-left p-4">Owner</th>
                <th className="text-left p-4">Payout Method</th>
                <th className="text-left p-4">Account</th>
                <th className="text-left p-4">Pending Amount</th>
                <th className="text-left p-4">Transactions</th>
                <th className="text-left p-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.owner_id} className="border-b border-[var(--card-border)] hover:bg-[var(--primary)]/5">
                  <td className="p-4">
                    <p className="font-medium">{p.owner_name}</p>
                    <p className="text-xs text-[var(--muted)]">{p.owner_email}</p>
                  </td>
                  <td className="p-4 capitalize">{p.payout_method || <span className="text-red-500">Not set</span>}</td>
                  <td className="p-4">
                    {p.account_name ? (
                      <>
                        <p>{p.account_name}</p>
                        <p className="text-xs text-[var(--muted)]">{p.account_number}</p>
                      </>
                    ) : (
                      <span className="text-red-500 text-xs">Owner hasn&apos;t set a payout account</span>
                    )}
                  </td>
                  <td className="p-4 font-bold text-[var(--primary)]">{formatCurrency(p.pending_amount)}</td>
                  <td className="p-4">{p.pending_transactions}</td>
                  <td className="p-4">
                    <button
                      onClick={() => handleMarkPaid(p.owner_id, p.owner_name)}
                      disabled={payingId === p.owner_id}
                      className="btn-outline text-xs py-2"
                    >
                      {payingId === p.owner_id ? 'Saving...' : 'Mark as Paid'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-10 mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="font-semibold flex items-center gap-2"><History className="h-4 w-4 text-[var(--primary)]" /> Payout History</h3>
          <p className="text-sm text-[var(--muted)]">Every payout sent to owners, automatic and manual.</p>
        </div>
        <p className="text-sm">
          <span className="text-[var(--muted)]">Total paid out: </span>
          <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(totalPaidOut)}</span>
        </p>
      </div>
      {history.length === 0 ? (
        <EmptyState icon={History} title="No payouts yet" description="Payouts appear here as soon as they are sent." />
      ) : (
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)]">
                <th className="text-left p-4">Date</th>
                <th className="text-left p-4">Owner</th>
                <th className="text-left p-4">Amount</th>
                <th className="text-left p-4">Sent To</th>
                <th className="text-left p-4">How</th>
                <th className="text-left p-4">Bookings</th>
                <th className="text-left p-4">Reference</th>
              </tr>
            </thead>
            <tbody>
              {history.map((p) => (
                <tr key={p.id} className="border-b border-[var(--card-border)] hover:bg-[var(--primary)]/5">
                  <td className="p-4 whitespace-nowrap text-xs">{formatTimestamp(p.created_at)}</td>
                  <td className="p-4">
                    <p className="font-medium">{p.owner_name || 'Deleted user'}</p>
                    {p.owner_email && <p className="text-xs text-[var(--muted)]">{p.owner_email}</p>}
                  </td>
                  <td className="p-4 font-bold text-green-600 dark:text-green-400 whitespace-nowrap">{formatCurrency(Number(p.amount))}</td>
                  <td className="p-4">
                    {p.account_number ? (
                      <>
                        <p className="capitalize">{p.payout_method === 'gcash' ? 'GCash' : 'Bank'} · {p.account_number}</p>
                        <p className="text-xs text-[var(--muted)]">{p.account_name}</p>
                      </>
                    ) : (
                      <span className="text-xs text-[var(--muted)]">Not recorded</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={cn('rounded-full px-2 py-1 text-xs whitespace-nowrap', sourceLabel[p.source].className)}>
                      {sourceLabel[p.source].label}
                    </span>
                    {p.source === 'manual' && p.paid_by_name && (
                      <p className="mt-1 text-xs text-[var(--muted)]">by {p.paid_by_name}</p>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-0.5 font-mono text-xs">
                      {p.booking_ids.length ? p.booking_ids.map((id) => <span key={id} className="whitespace-nowrap">{bookingCode(id)}</span>) : <span className="text-[var(--muted)]">—</span>}
                    </div>
                  </td>
                  <td className="p-4 font-mono text-xs whitespace-nowrap">{p.reference}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
