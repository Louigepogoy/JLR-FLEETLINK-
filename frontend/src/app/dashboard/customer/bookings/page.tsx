'use client';

import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import PaymentModal from '@/components/payment/PaymentModal';
import ReportModal from '@/components/reports/ReportModal';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

type CustomerBooking = {
  id: string;
  title: string;
  brand: string;
  model: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  paid_amount: number;
  status: string;
  payment_status: string;
  owner_id: string;
  owner_name: string;
  images?: string[];
  city?: string;
  barangay?: string;
  pickup_address?: string;
};

export default function CustomerBookingsPage() {
  const [bookings, setBookings] = useState<CustomerBooking[]>([]);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [reportBooking, setReportBooking] = useState<CustomerBooking | null>(null);
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
        {bookings.map((b) => (
          <div key={b.id} className="glass-card p-6">
            <div className="flex flex-wrap justify-between gap-4">
              <div className="flex gap-4">
                <div className="h-24 w-32 shrink-0 overflow-hidden rounded-xl bg-[var(--primary)]/10">
                  {b.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.images[0]} alt={b.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-[var(--muted)]">No photo</div>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{b.title}</h3>
                  <p className="text-sm text-[var(--muted)]">{b.brand} {b.model}</p>
                  <p className="text-sm mt-1">{formatDate(b.start_date)} to {formatDate(b.end_date)}</p>
                  <p className="mt-2 flex items-center gap-1 text-sm text-[var(--muted)]">
                    <MapPin className="h-4 w-4 text-[var(--primary)]" />
                    {[b.pickup_address, b.barangay, b.city].filter(Boolean).join(', ')}
                  </p>
                </div>
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
            <button
              className="btn-outline mt-4 text-sm text-red-500 sm:ml-3"
              onClick={() => setReportBooking(b)}
            >
              Report Owner
            </button>
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
      {reportBooking && (
        <ReportModal
          isOpen={!!reportBooking}
          onClose={() => setReportBooking(null)}
          bookingId={reportBooking.id}
          reportedUserId={reportBooking.owner_id}
          reportedName={reportBooking.owner_name || 'Owner'}
        />
      )}
    </DashboardLayout>
  );
}
