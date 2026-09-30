'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, CalendarClock, Clock } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { IconChip, CalendarCheckIcon } from '@/components/illustrations/MiniIcons';
import EmptyState from '@/components/ui/EmptyState';
import api from '@/lib/api';
import { profilePath } from '@/lib/chat';
import { bookingStatusColors, bookingStatusLabel, formatCurrency, formatDate, formatTime, formatTimestamp } from '@/lib/utils';

export default function AdminBookingsPage() {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    api.get('/bookings/all').then((res) => setBookings(res.data.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <DashboardLayout role="admin">
        <div className="skeleton h-8 w-48 mb-6" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin">
      <h2 className="text-2xl font-bold flex items-center gap-3 mb-6"><IconChip icon={CalendarCheckIcon} className="h-10 w-10 rounded-xl" iconClassName="h-7 w-7" />All Bookings</h2>
      {bookings.length === 0 ? (
        <EmptyState icon={Calendar} title="No bookings found" />
      ) : (
      <div className="space-y-3">
        {bookings.map((b: {
          id: string; title: string; customer_id: string; customer_name: string; customer_email: string;
          customer_phone: string | null; owner_id: string; owner_name: string; created_at: string;
          start_date: string; end_date: string; pickup_time?: string; dropoff_time?: string;
          total_amount: number; paid_amount: number; status: string; payment_status: string;
        }) => (
          <div key={b.id} className="glass-card p-4 flex flex-wrap justify-between gap-4">
            <div className="space-y-1">
              <p className="font-medium">{b.title}</p>
              <p className="text-sm">
                <span className="text-[var(--muted)]">Booked by: </span>
                <Link href={profilePath(b.customer_id)} className="font-medium text-[var(--primary)] hover:underline">
                  {b.customer_name}
                </Link>
                <span className="text-xs text-[var(--muted)]"> · {b.customer_email}{b.customer_phone ? ` · ${b.customer_phone}` : ''}</span>
              </p>
              <p className="text-xs text-[var(--muted)]">
                Owner:{' '}
                <Link href={profilePath(b.owner_id)} className="hover:underline">{b.owner_name}</Link>
              </p>
              <p className="text-xs flex items-center gap-1">
                <CalendarClock className="h-3.5 w-3.5 text-[var(--primary)]" />
                <span className="text-[var(--muted)]">Booked on:</span> {formatTimestamp(b.created_at)}
              </p>
              <p className="text-xs flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-[var(--primary)]" />
                <span className="text-[var(--muted)]">Rental:</span>
                {formatDate(b.start_date)} {formatTime(b.pickup_time)} — {formatDate(b.end_date)} {formatTime(b.dropoff_time)}
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold">{formatCurrency(b.total_amount)}</p>
              <p className="text-xs text-green-500">Paid: {formatCurrency(b.paid_amount || 0)}</p>
              <div className="flex gap-2 mt-1 justify-end">
                <span className={`text-xs capitalize px-2 py-0.5 rounded-full ${bookingStatusColors[b.status]}`}>{bookingStatusLabel(b.status)}</span>
                <span className="text-xs capitalize px-2 py-0.5 rounded-full bg-green-500/20">{b.payment_status?.replace('_', ' ')}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}
    </DashboardLayout>
  );
}
