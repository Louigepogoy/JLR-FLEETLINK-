'use client';

import { Hourglass } from 'lucide-react';
import { formatCountdown, useCountdown } from '@/lib/inspection';

type Props = {
  secondsLeft: number | null | undefined;
  onExpired: () => void;
  // Renter side: a pay button. Owner side: omitted, it just shows the countdown.
  onPay?: () => void;
};

/** Countdown until an unpaid booking is cancelled automatically. */
export default function PaymentDeadlineNotice({ secondsLeft, onExpired, onPay }: Props) {
  const remaining = useCountdown(secondsLeft, onExpired);

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-amber-500/50 bg-amber-500/10 p-4 text-sm">
      <div className="flex items-center gap-3">
        <Hourglass className="h-5 w-5 shrink-0 text-amber-500" />
        <p>
          {onPay ? (
            <><span className="font-semibold">Pay to confirm your booking.</span> The owner doesn&apos;t need to approve it — it&apos;s confirmed as soon as you pay. Unpaid bookings are cancelled automatically.</>
          ) : (
            <><span className="font-semibold">Awaiting the renter&apos;s payment.</span> Nothing to do yet — it&apos;s confirmed automatically once they pay, or cancelled if they don&apos;t.</>
          )}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <p className="font-mono text-xl font-bold text-amber-500" aria-label="Time left to pay">
          {formatCountdown(remaining)}
        </p>
        {onPay && remaining > 0 && (
          <button onClick={onPay} className="btn-primary text-sm">Pay Now</button>
        )}
      </div>
    </div>
  );
}
