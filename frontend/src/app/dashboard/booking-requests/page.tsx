'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { IconChip, RequestsIcon } from '@/components/illustrations/MiniIcons';
import EmptyState from '@/components/ui/EmptyState';
import ReportModal from '@/components/reports/ReportModal';
import api from '@/lib/api';
import { Calendar, CalendarClock, CheckCircle2, Clock, KeyRound, MessageCircle, Star } from 'lucide-react';
import { bookingStatusColors, bookingStatusLabel, formatCurrency, formatDate, formatTime, formatTimestamp } from '@/lib/utils';
import { apiErrorMessage, messagesPath, startConversation } from '@/lib/chat';
import ReviewModal from '@/components/reviews/ReviewModal';
import OwnerInspectionStatus from '@/components/booking/OwnerInspectionStatus';
import PaymentDeadlineNotice from '@/components/booking/PaymentDeadlineNotice';
import BookingPartyCard from '@/components/booking/BookingPartyCard';
import BookingStatusTabs, { matchesBookingTab, type BookingTab } from '@/components/booking/BookingStatusTabs';
import type { InspectionFields } from '@/lib/inspection';
import {
  fetchPendingReviews, notifyReviewsChanged, REVIEWS_CHANGED_EVENT, type PendingReview,
} from '@/lib/reviews';
import BookingId from '@/components/booking/BookingId';

type OwnerBooking = InspectionFields & {
  id: string;
  title: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string | null;
  customer_avatar_url?: string | null;
  customer_verified?: boolean | null;
  brand?: string;
  model?: string;
  plate_number?: string | null;
  images?: string[];
  start_date: string;
  end_date: string;
  pickup_time?: string;
  dropoff_time?: string;
  total_amount: number;
  paid_amount: number;
  with_driver?: boolean;
  driver_fee?: number;
  status: string;
  payment_status: string;
  created_at: string;
};

export default function BookingRequestsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<OwnerBooking[]>([]);
  const [tab, setTab] = useState<BookingTab>('all');
  const visibleBookings = bookings.filter((b) => matchesBookingTab(tab, b.status));
  const [reportBooking, setReportBooking] = useState<OwnerBooking | null>(null);
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([]);
  const [ratingFor, setRatingFor] = useState<PendingReview | null>(null);

  const fetchBookings = () => api.get('/bookings/owner').then((res) => setBookings(res.data.data)).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { fetchBookings(); }, []);

  useEffect(() => {
    const loadPending = () => fetchPendingReviews().then(setPendingReviews).catch(() => {});
    loadPending();
    window.addEventListener(REVIEWS_CHANGED_EVENT, loadPending);
    return () => window.removeEventListener(REVIEWS_CHANGED_EVENT, loadPending);
  }, []);

  const messageCustomer = async (customerId: string) => {
    try {
      const conversation = await startConversation({ userId: customerId });
      router.push(messagesPath('user', conversation.id));
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not start chat'));
    }
  };

  const statusMessages: Record<string, string> = {
    active: 'Marked as picked up',
    completed: 'Rental completed! Please rate your renter.',
  };

  const needsHandover = (b: OwnerBooking) => b.status === 'approved' && !b.handed_over_at;

  const handOver = async (id: string) => {
    if (!confirm('Hand over the vehicle now? Only do this when the renter is with you and has the keys — their inspection timer starts right away.')) return;
    try {
      await api.post(`/bookings/${id}/handover`);
      toast.success('Vehicle handed over. The renter can now inspect it.');
      fetchBookings();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to hand over the vehicle'));
    }
  };

  const updateStatus = async (id: string, status: string) => {
    if (status === 'completed' && !confirm('Mark this rental as completed? Only do this once the vehicle has been returned.')) return;
    try {
      await api.patch(`/bookings/${id}/status`, { status });
      toast.success(statusMessages[status] || `Booking ${status}`);
      fetchBookings();
      // Completing a rental unlocks ratings, so let the rating prompt pop up right away.
      if (status === 'completed') notifyReviewsChanged();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to update booking'));
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="user">
        <div className="skeleton h-8 w-48 mb-6" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-36 rounded-2xl" />)}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="user">
      <h2 className="text-2xl font-bold flex items-center gap-3 mb-6"><IconChip icon={RequestsIcon} className="h-10 w-10 rounded-xl" iconClassName="h-7 w-7" />Booking Requests</h2>
      {bookings.length > 0 && <BookingStatusTabs bookings={bookings} tab={tab} onChange={setTab} />}
      <div className="space-y-4">
        {visibleBookings.map((b) => (
          <div key={b.id} className={`glass-card p-6 ${needsHandover(b) ? 'border-2 border-amber-500/50' : ''}`}>
            {needsHandover(b) && (
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-amber-500">
                Confirmed booking — hand over the vehicle at pickup
              </p>
            )}
            <div className="flex flex-wrap justify-between gap-4">
              <div className="flex gap-4">
                <div className="h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-[var(--primary)]/10">
                  {b.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.images[0]} alt={b.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-[var(--muted)]">No photo</div>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold">{b.title}</h3>
                  <BookingId id={b.id} className="mt-1" />
                  <p className="text-sm text-[var(--muted)]">
                    {b.brand} {b.model}{b.plate_number ? ` · ${b.plate_number}` : ''}
                  </p>
                  <p className="text-sm mt-1 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-[var(--primary)]" />
                    {formatDate(b.start_date)} {formatTime(b.pickup_time)} — {formatDate(b.end_date)} {formatTime(b.dropoff_time)}
                  </p>
                  <p className="text-xs mt-1 flex items-center gap-1 text-[var(--muted)]">
                    <CalendarClock className="h-3.5 w-3.5 text-[var(--primary)]" />
                    Booked on {formatTimestamp(b.created_at)}
                  </p>
                  {b.with_driver && (
                    <span className="mt-2 inline-block text-xs px-2 py-1 rounded-full bg-[var(--primary)]/15 text-[var(--primary)]">
                      With Driver — provide a driver for this trip
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">{formatCurrency(b.total_amount)}</p>
                <p className="text-sm text-green-500">Paid: {formatCurrency(b.paid_amount || 0)}</p>
                <span className={`text-xs capitalize px-2 py-1 rounded-full mt-1 inline-block ${bookingStatusColors[b.status]}`}>{bookingStatusLabel(b.status)}</span>
              </div>
            </div>
            <BookingPartyCard
              label="Booked by"
              userId={b.customer_id}
              name={b.customer_name}
              avatarUrl={b.customer_avatar_url}
              verified={b.customer_verified}
              email={b.customer_email}
              phone={b.customer_phone}
            />
            {b.status === 'pending' && b.payment_status === 'pending' && (
              <PaymentDeadlineNotice secondsLeft={b.payment_seconds_left} onExpired={fetchBookings} />
            )}
            <OwnerInspectionStatus booking={b} onChanged={fetchBookings} />
            {b.status === 'approved' && !b.handed_over_at && !b.is_pickup_day && (
              <p className="mt-4 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                <CalendarClock className="h-4 w-4 shrink-0" />
                You can hand over the vehicle only on the pickup date: {formatDate(b.start_date)}{b.pickup_time ? ` at ${formatTime(b.pickup_time)}` : ''}.
              </p>
            )}
            {(b.status === 'active' || (b.status === 'approved' && !b.handed_over_at)) && (
              <div className="flex flex-wrap gap-3 mt-4">
                {b.status === 'approved' && b.payment_status !== 'pending' && (
                  <button
                    onClick={() => handOver(b.id)}
                    disabled={!b.is_pickup_day}
                    title={b.is_pickup_day ? undefined : `Available on the pickup date: ${formatDate(b.start_date)}`}
                    className="btn-primary text-sm py-2 flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <KeyRound className="h-4 w-4" /> Hand Over Vehicle
                  </button>
                )}
                {/* Unpaid bookings have nothing held in escrow, so they keep the direct flow. */}
                {b.status === 'approved' && b.payment_status === 'pending' && (
                  <button
                    onClick={() => updateStatus(b.id, 'active')}
                    disabled={!b.is_pickup_day}
                    className="btn-outline text-sm py-2 flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <KeyRound className="h-4 w-4" /> Mark as Picked Up
                  </button>
                )}
                {(b.status === 'active' || b.payment_status === 'pending') && (
                  <button onClick={() => updateStatus(b.id, 'completed')} className="btn-primary text-sm py-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> Mark as Returned (Complete)
                  </button>
                )}
              </div>
            )}
            <div className="flex flex-wrap gap-3 mt-4">
              {pendingReviews.some((p) => p.booking_id === b.id) && (
                <button
                  onClick={() => setRatingFor(pendingReviews.find((p) => p.booking_id === b.id) || null)}
                  className="btn-primary text-sm py-2 flex items-center gap-2"
                >
                  <Star className="h-4 w-4" /> Rate Customer
                </button>
              )}
              <button
                onClick={() => messageCustomer(b.customer_id)}
                className="btn-outline text-sm py-2 flex items-center gap-2"
              >
                <MessageCircle className="h-4 w-4" /> Message Customer
              </button>
              <button
                onClick={() => setReportBooking(b)}
                className="btn-outline text-sm py-2 text-red-500"
              >
                Report Customer
              </button>
            </div>
          </div>
        ))}
        {bookings.length === 0 && (
          <EmptyState
            icon={Calendar}
            title="No bookings yet"
            description="Bookings of your vehicles will show up here."
          />
        )}
        {bookings.length > 0 && visibleBookings.length === 0 && (
          <p className="py-8 text-center text-sm text-[var(--muted)]">No bookings in this category.</p>
        )}
      </div>
      <ReviewModal
        pending={ratingFor}
        onClose={() => setRatingFor(null)}
        onSubmitted={() => setRatingFor(null)}
        laterLabel="Cancel"
      />
      {reportBooking && (
        <ReportModal
          isOpen={!!reportBooking}
          onClose={() => setReportBooking(null)}
          bookingId={reportBooking.id}
          reportedUserId={reportBooking.customer_id}
          reportedName={reportBooking.customer_name || 'Customer'}
        />
      )}
    </DashboardLayout>
  );
}
