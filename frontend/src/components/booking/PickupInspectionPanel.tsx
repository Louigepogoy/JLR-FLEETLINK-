'use client';

import { useState } from 'react';
import { Camera, CheckCircle2, ShieldCheck, Timer, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { apiErrorMessage } from '@/lib/chat';
import { formatCurrency, formatTimestamp } from '@/lib/utils';
import {
  AUTO_HANDOVER_HOURS, disputeOutcomeLabel, formatCountdown, inspectionStage, useCountdown, type InspectionFields,
} from '@/lib/inspection';
import AddDisputeEvidence from './AddDisputeEvidence';
import RejectVehicleModal from './RejectVehicleModal';

type Props = {
  booking: InspectionFields & { id: string; title: string };
  onChanged: () => void;
};

/** Customer side of the pickup inspection: what happens to their payment, and accept/reject. */
export default function PickupInspectionPanel({ booking, onChanged }: Props) {
  const stage = inspectionStage(booking);
  const remaining = useCountdown(stage === 'inspecting' ? booking.inspection_seconds_left : 0, onChanged);
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const accept = async () => {
    if (!confirm('Accept this vehicle? Only accept if it matches the listing and you are happy with its condition.')) return;
    setAccepting(true);
    try {
      await api.post(`/bookings/${booking.id}/inspection/accept`);
      toast.success('Vehicle accepted. Enjoy your trip!');
      onChanged();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not accept the vehicle'));
      onChanged();
    } finally {
      setAccepting(false);
    }
  };

  const paid = booking.payment_status !== 'pending' && booking.payment_status !== 'refunded';

  if (stage === 'not_handed_over') {
    if (!paid || booking.status !== 'approved') return null;
    return (
      <div className="mt-4 flex items-start gap-3 rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/5 p-4 text-sm">
        <ShieldCheck className="h-5 w-5 shrink-0 text-[var(--primary)]" />
        <p>
          <span className="font-semibold">Your payment is held safely by JLR Fleetlink.</span> The owner is only paid after
          you check the vehicle at pickup. When the owner hands it over, you&apos;ll get time to accept it or report a
          problem. Don&apos;t pay the owner in cash.
          {booking.auto_handover_at && (
            <span className="mt-1 block text-xs text-[var(--muted)]">
              Please pick it up on time: if it isn&apos;t handed over by {formatTimestamp(booking.auto_handover_at)} ({AUTO_HANDOVER_HOURS} hours
              after your pickup time), it is marked as handed over automatically and your inspection time starts.
            </span>
          )}
        </p>
      </div>
    );
  }

  if (stage === 'inspecting') {
    return (
      <div className="mt-4 rounded-xl border-2 border-amber-500/50 bg-amber-500/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Timer className="h-6 w-6 shrink-0 text-amber-500" />
            <div>
              <p className="font-semibold">Inspect the vehicle now</p>
              <p className="text-sm text-[var(--muted)]">
                Does it match the listing photos? Accept it right away if it&apos;s fine — you don&apos;t have to wait for
                the timer — or reject it if something is wrong. If you don&apos;t respond, it&apos;s accepted automatically.
              </p>
            </div>
          </div>
          <p className="font-mono text-2xl font-bold text-amber-500" aria-label="Time left">
            {remaining > 0 ? formatCountdown(remaining) : '0:00'}
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button onClick={accept} disabled={accepting || remaining === 0} className="btn-primary flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4" /> {accepting ? 'Accepting...' : 'Accept Vehicle'}
          </button>
          <button
            onClick={() => setRejecting(true)}
            disabled={remaining === 0}
            className="flex items-center gap-2 rounded-xl bg-red-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-600 disabled:opacity-50"
          >
            <XCircle className="h-4 w-4" /> Reject Vehicle
          </button>
        </div>
        {rejecting && (
          <RejectVehicleModal
            bookingId={booking.id}
            vehicleTitle={booking.title}
            onClose={() => setRejecting(false)}
            onRejected={() => { setRejecting(false); onChanged(); }}
          />
        )}
      </div>
    );
  }

  if (stage === 'dispute_open' || stage === 'dispute_resolved') {
    const refund = Number(booking.dispute_refund_amount || 0);
    return (
      <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm">
        <p className="font-semibold text-red-500">
          Problem reported — {disputeOutcomeLabel[booking.dispute_status || 'open']}
        </p>
        {booking.dispute_reason && <p className="mt-1 text-[var(--muted)]">&ldquo;{booking.dispute_reason}&rdquo;</p>}
        {stage === 'dispute_open' && (
          <p className="mt-1">Your payment is on hold. An admin will review your evidence and contact you.</p>
        )}
        {stage === 'dispute_open' && booking.dispute_evidence_requested_at && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
            <Camera className="h-4 w-4 shrink-0 text-amber-500" />
            <div>
              <p className="font-semibold text-amber-600 dark:text-amber-400">The admin needs proof before refunding you</p>
              {booking.dispute_evidence_request_note && <p className="mt-0.5">What to show: {booking.dispute_evidence_request_note}</p>}
              <p className="mt-0.5 text-[var(--muted)]">Upload clear photos or videos of the problem below.</p>
            </div>
          </div>
        )}
        {(booking.dispute_evidence?.length ?? 0) > 0 && (
          <p className="mt-2 text-xs text-[var(--muted)]">
            Evidence sent: {booking.dispute_evidence!.length} photo/video file{booking.dispute_evidence!.length > 1 ? 's' : ''}
          </p>
        )}
        {stage === 'dispute_open' && booking.dispute_id && (
          <AddDisputeEvidence
            disputeId={booking.dispute_id}
            existingCount={booking.dispute_evidence?.length ?? 0}
            onAdded={onChanged}
          />
        )}
        {refund > 0 && <p className="mt-1">Refund: <span className="font-semibold">{formatCurrency(refund)}</span></p>}
        {booking.dispute_admin_notes && <p className="mt-1">Admin note: {booking.dispute_admin_notes}</p>}
      </div>
    );
  }

  if (booking.status !== 'active') return null;
  return (
    <p className="mt-3 flex items-center gap-2 text-sm text-green-500">
      <CheckCircle2 className="h-4 w-4" />
      {stage === 'auto_accepted' ? 'Vehicle accepted automatically after the inspection time.' : 'You accepted this vehicle at pickup.'}
    </p>
  );
}
