import { cn } from '@/lib/utils';

export const BOOKING_TABS = [
  { value: 'all', label: 'All', statuses: null },
  { value: 'pending', label: 'Awaiting Payment', statuses: ['pending'] },
  { value: 'approved', label: 'Confirmed', statuses: ['approved'] },
  { value: 'active', label: 'Active', statuses: ['active'] },
  { value: 'completed', label: 'Completed', statuses: ['completed'] },
  { value: 'closed', label: 'Cancelled / Rejected', statuses: ['cancelled', 'rejected'] },
] as const;

export type BookingTab = (typeof BOOKING_TABS)[number]['value'];

export const matchesBookingTab = (tab: BookingTab, status: string) => {
  const statuses = BOOKING_TABS.find((t) => t.value === tab)?.statuses;
  return !statuses || (statuses as readonly string[]).includes(status);
};

/** Status filter with a count per tab, for lists of bookings. */
export default function BookingStatusTabs({ bookings, tab, onChange }: {
  bookings: { status: string }[];
  tab: BookingTab;
  onChange: (tab: BookingTab) => void;
}) {
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {BOOKING_TABS.map((t) => {
        const count = bookings.filter((b) => matchesBookingTab(t.value, b.status)).length;
        return (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm',
              tab === t.value ? 'gradient-bg text-white' : 'btn-outline'
            )}
          >
            {t.label} <span className="opacity-70">({count})</span>
          </button>
        );
      })}
    </div>
  );
}
