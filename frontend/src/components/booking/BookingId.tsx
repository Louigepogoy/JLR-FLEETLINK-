'use client';

import { Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { bookingCode, cn } from '@/lib/utils';

/** Booking ID chip (e.g. "Booking ID: BK-1A2B3C4D") that copies the ID when clicked. */
export default function BookingId({ id, className }: { id: string; className?: string }) {
  const code = bookingCode(id);
  const copy = () => {
    navigator.clipboard?.writeText(code).then(
      () => toast.success(`Copied ${code}`),
      () => toast.error('Could not copy the booking ID')
    );
  };
  return (
    <button
      type="button"
      onClick={copy}
      title="Copy booking ID"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md bg-[var(--primary)]/10 px-2 py-0.5 font-mono text-xs font-semibold text-[var(--primary)] hover:bg-[var(--primary)]/20',
        className
      )}
    >
      <span className="font-sans font-normal text-[var(--muted)]">Booking ID:</span> {code}
      <Copy className="h-3 w-3" />
    </button>
  );
}
