'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlarmClock, Calendar, CalendarClock, Clock, FileText, MapPin, MessageCircle, Star, TimerReset } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { IconChip, CalendarCheckIcon } from '@/components/illustrations/MiniIcons';
import EmptyState from '@/components/ui/EmptyState';
import PaymentModal from '@/components/payment/PaymentModal';
import ReportModal from '@/components/reports/ReportModal';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { bookingStatusColors, bookingStatusLabel, formatCurrency, formatDate, formatTime, formatTimestamp, onlineDue, CASH_RESERVATION_PERCENT } from '@/lib/utils';
import { apiErrorMessage, messagesPath, startConversation } from '@/lib/chat';
import ReviewModal from '@/components/reviews/ReviewModal';
import PickupInspectionPanel from '@/components/booking/PickupInspectionPanel';
import PaymentDeadlineNotice from '@/components/booking/PaymentDeadlineNotice';
import BookingPartyCard from '@/components/booking/BookingPartyCard';
import BookingStatusTabs, { matchesBookingTab, type BookingTab } from '@/components/booking/BookingStatusTabs';
import type { InspectionFields } from '@/lib/inspection';
import { fetchPendingReviews, REVIEWS_CHANGED_EVENT, type PendingReview } from '@/lib/reviews';
import BookingId from '@/components/booking/BookingId';
import ExtendBookingModal from '@/components/booking/ExtendBookingModal';

type CustomerBooking = InspectionFields & {
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
  // Late return: started hours past the agreed drop-off and the fee for them (included in total_amount).
  late_hours?: number;
  late_fee?: number | string;
  // Hours added while using the vehicle (end_date/dropoff_time already include them).
  extended_hours?: number;
  // Cash bookings: cash still to pay the owner at pickup.
  payment_option?: 'online' | 'cash';
  cash_due?: number | string;
  with_driver?: boolean;
  driver_fee?: number;
  status: string;
  payment_status: string;
  owner_id: string;
  owner_name: string;
  owner_avatar_url?: string | null;
  owner_verified?: boolean | null;
  owner_email?: string | null;
  owner_phone?: string | null;
  plate_number?: string | null;
  vehicle_id: string;
  images?: string[];
  city?: string;
  barangay?: string;
  pickup_address?: string;
  created_at: string;
};

function MyBookingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<CustomerBooking[]>([]);
  const [tab, setTab] = useState<BookingTab>('all');
  const visibleBookings = bookings.filter((b) => matchesBookingTab(tab, b.status));
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [reportBooking, setReportBooking] = useState<CustomerBooking | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [extendFor, setExtendFor] = useState<CustomerBooking | null>(null);
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([]);
  const [ratingFor, setRatingFor] = useState<PendingReview | null>(null);

  useEffect(() => {
    const loadPending = () => fetchPendingReviews().then(setPendingReviews).catch(() => {});
    loadPending();
    window.addEventListener(REVIEWS_CHANGED_EVENT, loadPending);
    return () => window.removeEventListener(REVIEWS_CHANGED_EVENT, loadPending);
  }, []);

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

  // On the pickup date the renter confirms they're with the owner, which lets the owner hand the vehicle over.
  const markReady = async (bookingId: string) => {
    try {
      await api.post(`/bookings/${bookingId}/ready`);
      toast.success("Thanks! The owner can now hand over the vehicle.");
      fetchBookings();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Could not confirm pickup');
    }
  };

  // A paid booking can be cancelled until pickup time; the refund depends on how close that is.
  const cancelPaidBooking = async (bookingId: string) => {
    try {
      const { data } = await api.get(`/bookings/${bookingId}/cancel-quote`);
      const q = data.data as {
        canCancel: boolean; freeCancelHours: number; early: boolean; percent: number; platformFee: number;
        refundAmount: number; retainedAmount: number;
      };
      if (!q.canCancel) {
        toast.error('This booking can no longer be cancelled. Please contact the owner or support.');
        return;
      }
      const message = q.early
        ? `Cancel this booking? You will get ${formatCurrency(q.refundAmount)} back. The platform keeps a ${formatCurrency(q.platformFee)} service fee (its commission).`
        : `Cancel this booking? It is less than ${q.freeCancelHours} hours before pickup, so you will get ${q.percent}% back `
          + `(${formatCurrency(q.refundAmount)}). The other ${formatCurrency(q.retainedAmount)} goes to the owner for holding the vehicle.`;
      if (!confirm(message)) return;
      await api.patch(`/bookings/${bookingId}/cancel`);
      toast.success(`Booking cancelled. ${formatCurrency(q.refundAmount)} will be refunded.`);
      fetchBookings();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to cancel booking');
    }
  };

  const messageOwner = async (b: CustomerBooking) => {
    try {
      const conversation = await startConversation({ userId: b.owner_id, vehicleId: b.vehicle_id });
      router.push(messagesPath('user', conversation.id));
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not start chat'));
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
      <h2 className="text-2xl font-bold flex items-center gap-3 mb-6"><IconChip icon={CalendarCheckIcon} className="h-10 w-10 rounded-xl" iconClassName="h-7 w-7" />My Bookings</h2>
      {bookings.length > 0 && <BookingStatusTabs bookings={bookings} tab={tab} onChange={setTab} />}
      <div className="space-y-4">
        {visibleBookings.map((b) => (
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
                  <p className="mt-2 flex items-center gap-1 text-sm text-[var(--muted)]">
                    <MapPin className="h-4 w-4 text-[var(--primary)]" />
                    {[b.pickup_address, b.barangay, b.city].filter(Boolean).join(', ')}
                  </p>
                  {Number(b.extended_hours) > 0 && (
                    <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2 py-1 text-xs font-semibold text-sky-600 dark:text-sky-400">
                      <TimerReset className="h-3.5 w-3.5" />
                      Extended +{b.extended_hours}h · now ends {formatDate(b.end_date)} {formatTime(b.dropoff_time)}
                    </p>
                  )}
                  {b.with_driver && (
                    <span className="mt-2 block w-fit text-xs px-2 py-1 rounded-full bg-[var(--primary)]/15 text-[var(--primary)]">
                      With Driver
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold">{formatCurrency(b.total_amount)}</p>
                <p className="text-sm text-green-500">Paid: {formatCurrency(b.paid_amount || 0)}</p>
                {Number(b.cash_due) > 0 && (
                  <p className="mt-1 text-sm font-semibold text-amber-600 dark:text-amber-400">
                    {b.status === 'active' || b.status === 'completed' ? 'Cash to owner at return' : 'Cash at pickup'}: {formatCurrency(Number(b.cash_due))}
                  </p>
                )}
                {Number(b.late_fee) > 0 && (
                  <p className="mt-1 flex items-center justify-end gap-1 text-sm font-semibold text-amber-600 dark:text-amber-400">
                    <AlarmClock className="h-4 w-4" />
                    Late return: {b.late_hours}h · {formatCurrency(Number(b.late_fee))}
                  </p>
                )}
                <div className="flex gap-2 mt-2 justify-end">
                  <span className={`text-xs px-2 py-1 rounded-full capitalize ${bookingStatusColors[b.status]}`}>{bookingStatusLabel(b.status)}</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-[var(--primary)]/20 capitalize">{b.payment_status?.replace('_', ' ')}</span>
                </div>
              </div>
            </div>
            <BookingPartyCard
              label="Vehicle owner"
              userId={b.owner_id}
              name={b.owner_name}
              avatarUrl={b.owner_avatar_url}
              verified={b.owner_verified}
              email={b.owner_email}
              phone={b.owner_phone}
              hiddenContactNote={b.status === 'pending' ? "Owner's contact details appear once you pay and your booking is confirmed." : undefined}
            />
            {b.status === 'pending' && b.payment_status === 'pending' && (
              <PaymentDeadlineNotice
                secondsLeft={b.payment_seconds_left}
                onExpired={fetchBookings}
                onPay={() => { setSelected(b as unknown as Record<string, unknown>); setShowPayment(true); }}
              />
            )}
            <PickupInspectionPanel booking={b} onChanged={fetchBookings} />
            <div className="flex flex-wrap gap-3 mt-4">
              {pendingReviews.some((p) => p.booking_id === b.id) && (
                <button
                  className="btn-primary text-sm flex items-center gap-2"
                  onClick={() => setRatingFor(pendingReviews.find((p) => p.booking_id === b.id) || null)}
                >
                  <Star className="h-4 w-4" /> Rate this Trip
                </button>
              )}
              {/* Chat with the owner is open only while the booking is (a finished or cancelled one closes it). */}
              {['pending', 'approved', 'active'].includes(b.status) && (
                <button className="btn-outline text-sm flex items-center gap-2" onClick={() => messageOwner(b)}>
                  <MessageCircle className="h-4 w-4" /> Message Owner
                </button>
              )}
              {['approved', 'active', 'completed'].includes(b.status) && (
                <Link href={`/dashboard/bookings/${b.id}/documents`} className="btn-outline text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Documents
                </Link>
              )}
              {onlineDue(b) > 0 && ['approved', 'active', 'pending'].includes(b.status) && (
                <button
                  className="btn-primary text-sm"
                  onClick={() => { setSelected(b as unknown as Record<string, unknown>); setShowPayment(true); }}
                >
                  {Number(b.cash_due) > 0 ? 'Pay Reservation Fee' : 'Make Payment'}
                </button>
              )}
              {b.status === 'approved' && !b.handed_over_at && b.payment_status === 'partially_paid' && onlineDue(b) > 0 && (
                <p className="w-full text-xs text-amber-600 dark:text-amber-400">
                  The remaining {formatCurrency(onlineDue(b))} is paid online now or in cash to the owner at pickup. If it isn&apos;t paid and
                  the vehicle isn&apos;t picked up within 3 hours of the pickup time, the booking is cancelled and what you paid is kept by the owner.
                </p>
              )}
              {/* A completed trip still owes money only when the vehicle came back late. */}
              {b.status === 'completed' && Number(b.total_amount) - Number(b.paid_amount || 0) > 0 && (
                <button
                  className="btn-primary text-sm flex items-center gap-2"
                  onClick={() => { setSelected(b as unknown as Record<string, unknown>); setShowPayment(true); }}
                >
                  <AlarmClock className="h-4 w-4" />
                  Pay Late Fee · {formatCurrency(Number(b.total_amount) - Number(b.paid_amount || 0))}
                </button>
              )}
              {(b.status === 'active' || (b.status === 'approved' && b.payment_status !== 'pending' && !b.handed_over_at)) && (
                <button className="btn-outline text-sm flex items-center gap-2" onClick={() => setExtendFor(b)}>
                  <TimerReset className="h-4 w-4" /> Add Hours
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
              {/* Always visible once the booking is confirmed, but it only works on the pickup date. */}
              {b.status === 'approved' && !b.handed_over_at && b.payment_status !== 'pending' && (
                b.customer_ready_at ? (
                  <p className="w-full text-xs text-green-600 dark:text-green-400">
                    You confirmed you&apos;re ready. Waiting for the owner to hand over the vehicle.
                  </p>
                ) : (
                  <div className="flex flex-col items-start gap-1">
                    <button
                      className="btn-primary text-sm disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!b.is_pickup_day}
                      title={b.is_pickup_day ? undefined : `Available on your pickup date: ${formatDate(b.start_date)}`}
                      onClick={() => markReady(b.id)}
                    >
                      I&apos;m here — ready for pickup
                    </button>
                    {!b.is_pickup_day && (
                      <span className="text-xs text-[var(--muted)]">
                        Available on {formatDate(b.start_date)}{b.pickup_time ? ` at ${formatTime(b.pickup_time)}` : ''}
                      </span>
                    )}
                  </div>
                )
              )}
              {b.payment_status !== 'pending' && b.payment_status !== 'refunded' && b.status === 'approved' && !b.handed_over_at && (
                <button
                  className="btn-outline text-sm text-red-500"
                  onClick={() => cancelPaidBooking(b.id)}
                >
                  Cancel &amp; Refund
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
            description="Browse available vehicles across the Philippines and book your first ride."
            actionLabel="Browse Vehicles"
            actionHref="/vehicles"
          />
        )}
        {bookings.length > 0 && visibleBookings.length === 0 && (
          <p className="py-8 text-center text-sm text-[var(--muted)]">No bookings in this category.</p>
        )}
      </div>

      {selected && (
        <PaymentModal
          // Only the online part: cash due at pickup is paid to the owner, not here.
          booking={{ id: String(selected.id), total_amount: Number(selected.total_amount) - Number(selected.cash_due || 0), paid_amount: Number(selected.paid_amount || 0), title: String(selected.title) }}
          isOpen={showPayment}
          onClose={() => setShowPayment(false)}
          restInCash={
            selected.payment_option === 'online' && selected.status === 'approved' && !selected.handed_over_at
              ? { minOnline: Math.round(Number(selected.total_amount) * CASH_RESERVATION_PERCENT) / 100, onDone: fetchBookings }
              : undefined
          }
        />
      )}
      <ExtendBookingModal booking={extendFor} onClose={() => setExtendFor(null)} />
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
