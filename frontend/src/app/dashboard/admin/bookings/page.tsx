'use client';

import { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import EmptyState from '@/components/ui/EmptyState';
import api from '@/lib/api';
import { bookingStatusColors, formatCurrency, formatDate } from '@/lib/utils';

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
      <h2 className="text-2xl font-bold mb-6">All Bookings</h2>
      {bookings.length === 0 ? (
        <EmptyState icon={Calendar} title="No bookings found" />
      ) : (
      <div className="space-y-3">
        {bookings.map((b: {
          id: string; title: string; customer_name: string; owner_name: string;
          start_date: string; end_date: string; total_amount: number;
          paid_amount: number; status: string; payment_status: string;
        }) => (
          <div key={b.id} className="glass-card p-4 flex flex-wrap justify-between gap-4">
            <div>
              <p className="font-medium">{b.title}</p>
              <p className="text-xs text-[var(--muted)]">{b.customer_name} → {b.owner_name}</p>
              <p className="text-xs">{formatDate(b.start_date)} - {formatDate(b.end_date)}</p>
            </div>
            <div className="text-right">
              <p className="font-bold">{formatCurrency(b.total_amount)}</p>
              <p className="text-xs text-green-500">Paid: {formatCurrency(b.paid_amount || 0)}</p>
              <div className="flex gap-2 mt-1 justify-end">
                <span className={`text-xs capitalize px-2 py-0.5 rounded-full ${bookingStatusColors[b.status]}`}>{b.status}</span>
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
