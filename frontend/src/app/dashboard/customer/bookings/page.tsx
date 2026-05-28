'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import PaymentModal from '@/components/payment/PaymentModal';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function CustomerBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [showPayment, setShowPayment] = useState(false);

  const fetchBookings = () => {
    api.get('/bookings/my').then((res) => setBookings(res.data.data)).catch(() => {});
  };

  useEffect(() => { fetchBookings(); }, []);

  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-500',
    approved: 'bg-green-500/20 text-green-500',
    rejected: 'bg-red-500/20 text-red-500',
    active: 'bg-blue-500/20 text-blue-500',
    completed: 'bg-gray-500/20 text-gray-500',
    cancelled: 'bg-red-500/20 text-red-500',
  };

  return (
    <DashboardLayout role="customer">
      <h2 className="text-2xl font-bold mb-6">My Bookings</h2>
      <div className="space-y-4">
        {bookings.map((b: {
          id: string; title: string; brand: string; model: string;
          start_date: string; end_date: string; total_amount: number;
          paid_amount: number; status: string; payment_status: string;
        }) => (
          <div key={b.id} className="glass-card p-6">
            <div className="flex flex-wrap justify-between gap-4">
              <div>
                <h3 className="font-semibold text-lg">{b.title}</h3>
                <p className="text-sm text-[var(--muted)]">{b.brand} {b.model}</p>
                <p className="text-sm mt-1">{formatDate(b.start_date)} → {formatDate(b.end_date)}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold">{formatCurrency(b.total_amount)}</p>
                <p className="text-sm text-green-500">Paid: {formatCurrency(b.paid_amount || 0)}</p>
                <div className="flex gap-2 mt-2 justify-end">
                  <span className={`text-xs px-2 py-1 rounded-full capitalize ${statusColor[b.status]}`}>{b.status}</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-[var(--primary)]/20 capitalize">{b.payment_status?.replace('_', ' ')}</span>
                </div>
              </div>
            </div>
            {b.payment_status !== 'fully_paid' && ['approved', 'active', 'pending'].includes(b.status) && (
              <button
                className="btn-primary mt-4 text-sm"
                onClick={() => { setSelected(b as unknown as Record<string, unknown>); setShowPayment(true); }}
              >
                Make Payment
              </button>
            )}
          </div>
        ))}
        {bookings.length === 0 && (
          <div className="glass-card p-12 text-center text-[var(--muted)]">No bookings found</div>
        )}
      </div>

      {selected && (
        <PaymentModal
          booking={{ id: String(selected.id), total_amount: Number(selected.total_amount), paid_amount: Number(selected.paid_amount || 0), title: String(selected.title) }}
          isOpen={showPayment}
          onClose={() => setShowPayment(false)}
          onSuccess={fetchBookings}
        />
      )}
    </DashboardLayout>
  );
}
