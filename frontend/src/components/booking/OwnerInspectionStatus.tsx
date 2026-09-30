'use client';

import { AlertTriangle, CheckCircle2, ShieldCheck, Timer } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import {
  disputeOutcomeLabel, formatCountdown, inspectionStage, useCountdown, type InspectionFields,
} from '@/lib/inspection';

type Props = {
  booking: InspectionFields;
  onChanged: () => void;
};

/** Owner side of the pickup inspection: where the renter's payment is and what unlocks the payout. */
export default function OwnerInspectionStatus({ booking, onChanged }: Props) {
  const stage = inspectionStage(booking);
  const remaining = useCountdown(stage === 'inspecting' ? booking.inspection_seconds_left : 0, onChanged);
  const paid = booking.payment_status !== 'pending' && booking.payment_status !== 'refunded';

  if (stage === 'not_handed_over') {
    if (!paid || booking.status !== 'approved') return null;
    return (
      <div className="mt-4 flex items-start gap-3 rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/5 p-4 text-sm">
        <ShieldCheck className="h-5 w-5 shrink-0 text-[var(--primary)]" />
        <p>
          <span className="font-semibold">The renter has paid — JLR Fleetlink is holding the payment.</span> At the
          meetup, tap <span className="font-semibold">Hand Over Vehicle</span> when you give the keys. Your earnings
          unlock once the renter accepts the vehicle (or the inspection time runs out). Don&apos;t accept cash from the
          renter.
        </p>
      </div>
    );
  }

  if (stage === 'inspecting') {
    return (
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
        <div className="flex items-center gap-3">
          <Timer className="h-5 w-5 shrink-0 text-amber-500" />
          <p>
            <span className="font-semibold">Handed over — the renter is inspecting the vehicle.</span> It&apos;s accepted
            automatically when the time runs out.
          </p>
        </div>
        <p className="font-mono text-xl font-bold text-amber-500">{remaining > 0 ? formatCountdown(remaining) : '0:00'}</p>
      </div>
    );
  }

  if (stage === 'dispute_open' || stage === 'dispute_resolved') {
    const refund = Number(booking.dispute_refund_amount || 0);
    return (
      <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm">
        <p className="flex items-center gap-2 font-semibold text-red-500">
          <AlertTriangle className="h-4 w-4" />
          Renter reported a problem — {disputeOutcomeLabel[booking.dispute_status || 'open']}
        </p>
        {booking.dispute_reason && <p className="mt-1 text-[var(--muted)]">&ldquo;{booking.dispute_reason}&rdquo;</p>}
        {stage === 'dispute_open' && (
          <p className="mt-1">Your payout is on hold while an admin reviews it. Message the renter or support if you can help.</p>
        )}
        {refund > 0 && <p className="mt-1">Refunded to renter: <span className="font-semibold">{formatCurrency(refund)}</span></p>}
        {booking.dispute_admin_notes && <p className="mt-1">Admin note: {booking.dispute_admin_notes}</p>}
      </div>
    );
  }

  if (booking.status !== 'active') return null;
  return (
    <p className="mt-3 flex items-center gap-2 text-sm text-green-500">
      <CheckCircle2 className="h-4 w-4" />
      {stage === 'auto_accepted' ? 'Accepted automatically' : 'Renter accepted the vehicle'} — your earnings are eligible for payout.
    </p>
  );
}
