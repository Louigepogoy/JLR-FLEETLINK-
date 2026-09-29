'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import EmptyState from '@/components/ui/EmptyState';
import ReportModal from '@/components/reports/ReportModal';
import api from '@/lib/api';
import { Calendar, CheckCircle2, Clock, KeyRound, MessageCircle, Star } from 'lucide-react';
import { bookingStatusColors, formatCurrency, formatDate, formatTime } from '@/lib/utils';
import { apiErrorMessage, messagesPath, profilePath, startConversation } from '@/lib/chat';
import ReviewModal from '@/components/reviews/ReviewModal';
import {
  fetchPendingReviews, notifyReviewsChanged, REVIEWS_CHANGED_EVENT, type PendingReview,
} from '@/lib/reviews';

type OwnerBooking = {
  id: string;
  title: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
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
};

export default function BookingRequestsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<OwnerBooking[]>([]);
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
    approved: 'Booking approved',
    rejected: 'Booking rejected',
    active: 'Marked as picked up',
    completed: 'Rental completed! Please rate your renter.',
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
      <h2 className="text-2xl font-bold mb-6">Booking Requests</h2>
      <div className="space-y-4">
        {bookings.map((b) => (
          <div key={b.id} className="glass-card p-6">
            <div className="flex flex-wrap justify-between gap-4">
              <div>
                <h3 className="font-semibold">{b.title}</h3>
                <p className="text-sm text-[var(--muted)]">
                  <Link href={profilePath(b.customer_id)} className="text-[var(--primary)] hover:underline">{b.customer_name}</Link>
                  {' '}- {b.customer_email}
                </p>
                <p className="text-sm mt-1 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-[var(--primary)]" />
                  {formatDate(b.start_date)} {formatTime(b.pickup_time)} — {formatDate(b.end_date)} {formatTime(b.dropoff_time)}
                </p>
                {b.with_driver && (
                  <span className="mt-2 inline-block text-xs px-2 py-1 rounded-full bg-[var(--primary)]/15 text-[var(--primary)]">
                    With Driver — provide a driver for this trip
                  </span>
                )}
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">{formatCurrency(b.total_amount)}</p>
                <p className="text-sm text-green-500">Paid: {formatCurrency(b.paid_amount || 0)}</p>
                <span className={`text-xs capitalize px-2 py-1 rounded-full mt-1 inline-block ${bookingStatusColors[b.status]}`}>{b.status}</span>
              </div>
            </div>
            {b.status === 'pending' && (
              <div className="flex gap-3 mt-4">
                <button onClick={() => updateStatus(b.id, 'approved')} className="btn-primary text-sm py-2">Approve</button>
                <button onClick={() => updateStatus(b.id, 'rejected')} className="btn-outline text-sm py-2 text-red-500">Reject</button>
              </div>
            )}
            {['approved', 'active'].includes(b.status) && (
              <div className="flex flex-wrap gap-3 mt-4">
                {b.status === 'approved' && (
                  <button onClick={() => updateStatus(b.id, 'active')} className="btn-outline text-sm py-2 flex items-center gap-2">
                    <KeyRound className="h-4 w-4" /> Mark as Picked Up
                  </button>
                )}
                <button onClick={() => updateStatus(b.id, 'completed')} className="btn-primary text-sm py-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Mark as Returned (Complete)
                </button>
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
            title="No booking requests yet"
            description="Requests from renters interested in your vehicles will show up here."
          />
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
