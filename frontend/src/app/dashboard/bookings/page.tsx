'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar, Clock, FileText, MapPin } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import EmptyState from '@/components/ui/EmptyState';
import PaymentModal from '@/components/payment/PaymentModal';
import ReportModal from '@/components/reports/ReportModal';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { bookingStatusColors, formatCurrency, formatDate, formatTime } from '@/lib/utils';

type CustomerBooking = {
  id: string;
  title: string;
  brand: string;
  model: string;
  start_date: string;
  end_date: string;
  pickup_time?: string;
  dropoff_time?: string;
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

function MyBookingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<CustomerBooking[]>([]);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [reportBooking, setReportBooking] = useState<CustomerBooking | null>(null);
  const [showPayment, setShowPayment] = useState(false);

  const fetchBookings = () => {
    api.get('/bookings/my').then((res) => setBookings(res.data.data)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchBookings(); }, []);

  useEffect(() => {
    const payment = searchParams.get('payment');
    if (!payment) return;
    router.replace('/dashboard/bookings');

    if (payment === 'failed') {
      toast.error('Payment was not completed');
      return;
    }

    toast.success('Payment received! Confirming with our system...');
    // The webhook that finalizes the payment may land a moment after PayMongo redirects back — poll briefly,
    // and also proactively reconcile against PayMongo directly in case the webhook never arrives.
    api.post('/paymongo/reconcile').catch(() => {}).finally(() => fetchBookings());
    let attempts = 0;
    const interval = setInterval(() => {
      attempts += 1;
      fetchBookings();
      if (attempts >= 6) clearInterval(interval);
    }, 2000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const cancelBooking = async (bookingId: string) => {
    if (!confirm('Cancel this booking? This cannot be undone.')) return;
    try {
      await api.patch(`/bookings/${bookingId}/cancel`);
      toast.success('Booking cancelled');
      fetchBookings();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to cancel booking');
    }
  };

  const viewReceipt = async (bookingId: string) => {
    try {
      const res = await api.get(`/payments/booking/${bookingId}/receipt`);
      const latest = res.data.data.payments?.find((p: { invoice_number?: string }) => p.invoice_number);
      if (latest?.invoice_number) {
        router.push(`/dashboard/receipt/${latest.invoice_number}`);
      } else {
        toast.error('No payment receipt found for this booking');
      }
    } catch {
      toast.error('Could not load receipt');
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="user">
        <div className="skeleton h-8 w-40 mb-6" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-40 rounded-2xl" />)}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="user">
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
                  <p className="text-sm mt-1 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-[var(--primary)]" />
                    {formatDate(b.start_date)} {formatTime(b.pickup_time)} — {formatDate(b.end_date)} {formatTime(b.dropoff_time)}
                  </p>
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
                  <span className={`text-xs px-2 py-1 rounded-full capitalize ${bookingStatusColors[b.status]}`}>{b.status}</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-[var(--primary)]/20 capitalize">{b.payment_status?.replace('_', ' ')}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-4">
              {b.payment_status !== 'fully_paid' && ['approved', 'active', 'pending'].includes(b.status) && (
                <button
                  className="btn-primary text-sm"
                  onClick={() => { setSelected(b as unknown as Record<string, unknown>); setShowPayment(true); }}
                >
                  Make Payment
                </button>
              )}
              {(b.paid_amount || 0) > 0 && (
                <button
                  className="btn-outline text-sm flex items-center gap-2"
                  onClick={() => viewReceipt(b.id)}
                >
                  <FileText className="h-4 w-4" /> View Receipt
                </button>
              )}
              {b.payment_status === 'pending' && ['pending', 'approved'].includes(b.status) && (
                <button
                  className="btn-outline text-sm text-red-500"
                  onClick={() => cancelBooking(b.id)}
                >
                  Cancel Booking
                </button>
              )}
            </div>
            <button
              className="btn-outline mt-4 text-sm text-red-500 sm:ml-3"
              onClick={() => setReportBooking(b)}
            >
              Report Owner
            </button>
          </div>
        ))}
        {bookings.length === 0 && (
          <EmptyState
            icon={Calendar}
            title="No bookings yet"
            description="Browse available vehicles in Cebu and book your first ride."
            actionLabel="Browse Vehicles"
            actionHref="/vehicles"
          />
        )}
      </div>

      {selected && (
        <PaymentModal
          booking={{ id: String(selected.id), total_amount: Number(selected.total_amount), paid_amount: Number(selected.paid_amount || 0), title: String(selected.title) }}
          isOpen={showPayment}
          onClose={() => setShowPayment(false)}
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

export default function MyBookingsPage() {
  return (
    <Suspense fallback={null}>
      <MyBookingsContent />
    </Suspense>
  );
}
