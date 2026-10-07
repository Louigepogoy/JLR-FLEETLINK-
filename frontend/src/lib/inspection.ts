import { useEffect, useState } from 'react';

// Unpaid bookings are cancelled after this long (must match PAYMENT_WINDOW_MINUTES in the backend).
export const PAYMENT_WINDOW_MINUTES = 30;

// Pickup-inspection fields the booking list endpoints return alongside each booking.
export type InspectionFields = {
  status: string;
  payment_status: string;
  handed_over_at?: string | null;
  inspection_deadline?: string | null;
  inspection_result?: 'accepted' | 'auto_accepted' | 'rejected' | null;
  inspection_seconds_left?: number | null;
  // Seconds before an unpaid booking is cancelled (null once paid).
  payment_seconds_left?: number | null;
  // True only on the booking's pickup date (Philippine time) — the one day the owner can hand it over.
  is_pickup_day?: boolean;
  dispute_id?: string | null;
  dispute_status?: 'open' | 'refunded' | 'partially_refunded' | 'dismissed' | null;
  dispute_reason?: string | null;
  dispute_refund_amount?: number | string | null;
  dispute_admin_notes?: string | null;
  dispute_evidence?: { url: string; type: 'image' | 'video' }[] | null;
  // Set while an admin is waiting for the renter to upload (more) evidence.
  dispute_evidence_requested_at?: string | null;
  dispute_evidence_request_note?: string | null;
};

export type InspectionStage =
  | 'not_handed_over'
  | 'inspecting'
  | 'accepted'
  | 'auto_accepted'
  | 'dispute_open'
  | 'dispute_resolved';

export const inspectionStage = (b: InspectionFields): InspectionStage => {
  if (b.inspection_result === 'rejected') return b.dispute_status === 'open' ? 'dispute_open' : 'dispute_resolved';
  if (b.inspection_result === 'auto_accepted') return 'auto_accepted';
  if (b.inspection_result === 'accepted') return 'accepted';
  if (b.handed_over_at && b.status === 'approved') return 'inspecting';
  return 'not_handed_over';
};

export const disputeOutcomeLabel: Record<string, string> = {
  open: 'Under admin review',
  refunded: 'Full refund',
  partially_refunded: 'Partial refund',
  dismissed: 'Dismissed — no refund',
};

export const formatCountdown = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

/**
 * Counts down from the server-computed seconds left (not the client clock, which may be wrong) and
 * calls onExpire once when it reaches zero so the page can refetch the auto-accepted booking.
 */
export const useCountdown = (secondsLeft: number | null | undefined, onExpire?: () => void) => {
  // Elapsed seconds since the current secondsLeft arrived; a new server value starts over at 0.
  const [tick, setTick] = useState({ from: secondsLeft, elapsed: 0 });
  const elapsed = tick.from === secondsLeft ? tick.elapsed : 0;
  const remaining = Math.max(0, (secondsLeft ?? 0) - elapsed);

  useEffect(() => {
    if (!secondsLeft || secondsLeft <= 0) return;
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const passed = Math.floor((Date.now() - startedAt) / 1000);
      setTick({ from: secondsLeft, elapsed: passed });
      if (passed >= secondsLeft) {
        clearInterval(timer);
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(timer);
    // onExpire is intentionally not a dependency: restarting the timer on every render would reset it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  return remaining;
};
