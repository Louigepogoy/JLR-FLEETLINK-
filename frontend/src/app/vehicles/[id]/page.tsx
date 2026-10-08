'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { BadgeCheck, Calendar, Car, Clock, Fuel, Hash, Loader2, MapPin, MessageCircle, Phone, ShieldAlert, ShieldCheck, Settings2, User, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import BookingProgress from '@/components/booking/BookingProgress';
import PaymentModal from '@/components/payment/PaymentModal';
import EmptyState from '@/components/ui/EmptyState';
import ImageGallery from '@/components/vehicles/ImageGallery';
import api from '@/lib/api';
import { canRent, useAuthStore } from '@/store/authStore';
import { addRentalDays, formatCurrency, formatDate, formatTime, localDateString, CASH_RESERVATION_PERCENT, onlineDue } from '@/lib/utils';
import { apiErrorMessage, messagesPath, profilePath, startConversation } from '@/lib/chat';
import { formatPlace, getProvince, PHILIPPINES_CENTER } from '@/lib/philippines';
import { PickupMap } from '@/components/maps';
import type { ReviewSummary } from '@/lib/reviews';
import ReviewList from '@/components/reviews/ReviewList';
import { PAYMENT_WINDOW_MINUTES } from '@/lib/inspection';
import { RatingBadge } from '@/components/reviews/StarRating';
import { rentalAgreementTerms, RENTAL_AGREEMENT_VERSION } from '@/lib/rentalAgreement';

const MAX_RENTAL_DAYS = 30;

export default function VehicleDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [vehicle, setVehicle] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(2);
  const [dates, setDates] = useState({ startDate: '', pickupTime: '09:00', rentalDays: 1 });
  const [withDriver, setWithDriver] = useState(false);
  const [paymentOption, setPaymentOption] = useState<'online' | 'cash'>('online');
  // Rental Agreement: accepted with a checkbox and the renter's typed full name as signature.
  const [agreed, setAgreed] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const agreementSigned = agreed && signatureName.trim().length >= 2;
  const [booking, setBooking] = useState<Record<string, unknown> | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [maintenanceDates, setMaintenanceDates] = useState<{ id: string; start_date: string; end_date: string }[]>([]);
  const [bookedDates, setBookedDates] = useState<{ id: string; start_date: string; end_date: string }[]>([]);
  const [messagingOwner, setMessagingOwner] = useState(false);
  const [reviews, setReviews] = useState<ReviewSummary | null>(null);

  useEffect(() => {
    api.get(`/vehicles/${id}`).then((res) => setVehicle(res.data.data)).catch(() => toast.error('Vehicle not found')).finally(() => setLoading(false));
    api.get(`/vehicles/${id}/maintenance-dates`).then((res) => setMaintenanceDates(res.data.data)).catch(() => {});
    api.get(`/vehicles/${id}/booked-dates`).then((res) => setBookedDates(res.data.data)).catch(() => {});
    api.get(`/reviews/vehicle/${id}`)
      .then((res) => setReviews(res.data.data))
      .catch(() => setReviews({ average: null, count: 0, reviews: [] }));
  }, [id]);

  // 1 day = 24 hours: the vehicle is returned at the same time as pickup, `rentalDays` days later.
  const endDate = dates.startDate ? addRentalDays(dates.startDate, dates.rentalDays) : '';
  const dropoffTime = dates.pickupTime;
  const days = dates.startDate ? dates.rentalDays : 0;
  const today = localDateString();
  const nowTime = new Date().toTimeString().slice(0, 5);
  const pickupInPast = dates.startDate === today && dates.pickupTime < nowTime;
  const upcomingBookedDates = bookedDates.filter((b) => b.end_date >= today);
  const hasDateConflict = Boolean(
    dates.startDate && endDate &&
    [...maintenanceDates, ...bookedDates].some(
      (b) => b.start_date <= endDate && b.end_date >= dates.startDate
    )
  );
  const driverFeePerDay = vehicle ? parseFloat(String(vehicle.driver_fee_per_day || 0)) : 0;
  const driverFee = withDriver && vehicle?.driver_available ? days * driverFeePerDay : 0;
  const total = vehicle ? days * parseFloat(String(vehicle.price_per_day)) + driverFee : 0;

  const handleMessageOwner = async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to message the owner');
      router.push('/auth/login');
      return;
    }
    setMessagingOwner(true);
    try {
      const conversation = await startConversation({ vehicleId: String(id) });
      router.push(messagesPath(user?.role, conversation.id));
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not start chat'));
      setMessagingOwner(false);
    }
  };

  const handleBook = async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to book');
      router.push('/auth/login');
      return;
    }
    if (vehicle && user?.id === vehicle.owner_id) {
      toast.error('You cannot book your own vehicle');
      return;
    }
    if (!dates.startDate) {
      toast.error('Please select a pickup date');
      return;
    }
    if (pickupInPast) {
      toast.error('That pickup time has already passed. Please choose a later time.');
      return;
    }
    if (hasDateConflict) {
      toast.error('This vehicle is already booked or unavailable for the selected dates');
      return;
    }
    if (!agreementSigned) {
      toast.error('Please accept the Rental Agreement and type your full name to sign it');
      return;
    }
    setBookingLoading(true);
    try {
      const res = await api.post('/bookings', {
        vehicleId: id,
        startDate: dates.startDate,
        pickupTime: dates.pickupTime,
        endDate,
        dropoffTime,
        withDriver: withDriver && vehicle?.driver_available,
        paymentOption,
        agreeToTerms: true,
        signatureName: signatureName.trim(),
      });
      setBooking(res.data.data);
      setStep(4);
      // Owners don't approve bookings — paying confirms it — so go straight to payment.
      setShowPayment(true);
      toast.success('Booking created! Pay now to confirm it.');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; code?: string } } };
      if (error.response?.data?.code === 'VERIFICATION_REQUIRED') {
        router.push(`/verify-identity?returnTo=${encodeURIComponent(`/vehicles/${id}`)}`);
        return;
      }
      toast.error(error.response?.data?.message || 'Booking failed');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) return (
    <>
      <Navbar />
      <div className="pt-24 flex justify-center"><div className="skeleton w-full max-w-4xl h-96 rounded-2xl" /></div>
    </>
  );

  if (!vehicle) return (
    <>
      <Navbar />
      <main className="pt-24 pb-16 min-h-screen">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <EmptyState
            icon={Car}
            title="Vehicle not found"
            description="This listing may have been removed or is no longer available."
            actionLabel="Browse Vehicles"
            actionHref="/vehicles"
          />
        </div>
      </main>
      <Footer />
    </>
  );

  const city = String(vehicle.city || vehicle.location || '');
  const province = vehicle.province ? String(vehicle.province) : '';
  const barangay = vehicle.barangay ? String(vehicle.barangay) : '';
  const pickupAddress = vehicle.pickup_address ? String(vehicle.pickup_address) : 'Owner-provided pickup point';
  const fallbackPin = getProvince(province) || PHILIPPINES_CENTER;
  const latitude = Number(vehicle.latitude || fallbackPin.lat);
  const longitude = Number(vehicle.longitude || fallbackPin.lng);
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  const images = Array.isArray(vehicle.images) ? vehicle.images as string[] : [];
  const isOwner = isAuthenticated && user?.id === vehicle.owner_id;
  // Admins oversee the platform and can't book vehicles themselves.
  const isAdmin = isAuthenticated && user?.role === 'admin';
  // Owner accounts list vehicles; only customer accounts book them.
  const isOwnerAccount = isAuthenticated && !isAdmin && !canRent(user);

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {!isAdmin && !isOwnerAccount && <BookingProgress currentStep={booking ? 4 : step} />}

          <div className="grid lg:grid-cols-2 gap-8">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="glass-card overflow-hidden">
              <ImageGallery images={images} alt={String(vehicle.title)} className="h-72" />
              <div className="p-6">
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-3 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-semibold">Available in {formatPlace(city, province)}</span>
                  {vehicle.verification_status === 'approved' ? (
                    <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 text-xs font-semibold">
                      <BadgeCheck className="w-3.5 h-3.5" /> Approved by Admin
                    </span>
                  ) : vehicle.verification_status === 'rejected' ? (
                    <span className="px-3 py-1 rounded-full bg-red-500/15 text-red-500 text-xs font-semibold">
                      Rejected by Admin — hidden from Browse Vehicles
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-slate-500/15 text-[var(--muted)] text-xs font-semibold">Pending Admin Review</span>
                  )}
                </div>
                <h1 className="text-3xl font-bold mb-2">{String(vehicle.title)}</h1>
                <p className="text-[var(--muted)] mb-1">{String(vehicle.brand)} {String(vehicle.model)} - {String(vehicle.year)}</p>
                <RatingBadge
                  average={vehicle.avg_rating as number | null}
                  count={Number(vehicle.rating_count || 0)}
                  className="mb-4 flex"
                />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { icon: MapPin, val: formatPlace(city, province, barangay) },
                    { icon: Users, val: `${vehicle.seats} seats` },
                    { icon: Fuel, val: vehicle.fuel_type },
                    { icon: Settings2, val: vehicle.transmission },
                    ...(vehicle.plate_number ? [{ icon: Hash, val: `Plate: ${vehicle.plate_number}` }] : []),
                  ].map(({ icon: Icon, val }) => (
                    <div key={String(val)} className="flex items-center gap-2 text-[var(--muted)]">
                      <Icon className="w-4 h-4 text-[var(--primary)]" />{String(val)}
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
                  <p className="font-semibold mb-3">Owner Contact</p>
                  <Link href={profilePath(String(vehicle.owner_id))} className="flex items-center gap-3 group" title="View owner profile">
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
                      {vehicle.owner_avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={String(vehicle.owner_avatar_url)}
                          alt={String(vehicle.owner_name || 'Vehicle owner')}
                          className="h-full w-full object-cover"
                        />
                      ) : vehicle.owner_name ? (
                        <span className="text-lg font-bold text-[var(--primary)]">
                          {String(vehicle.owner_name).charAt(0).toUpperCase()}
                        </span>
                      ) : (
                        <User className="h-5 w-5 text-[var(--primary)]" />
                      )}
                    </div>
                    <div className="grid gap-1 text-sm text-[var(--muted)]">
                      <p className="font-medium text-[var(--foreground)] group-hover:underline">
                        {String(vehicle.owner_name || 'Vehicle owner')}
                      </p>
                      <RatingBadge
                        average={vehicle.owner_avg_rating as number | null}
                        count={Number(vehicle.owner_rating_count || 0)}
                      />
                      <p className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-[var(--primary)]" />
                        {String(vehicle.owner_phone || 'No phone provided')}
                      </p>
                      <p className="text-xs text-[var(--primary)]">View profile</p>
                    </div>
                  </Link>
                  {!isOwner && (
                    <button
                      onClick={handleMessageOwner}
                      disabled={messagingOwner}
                      className="btn-outline mt-4 flex w-full items-center justify-center gap-2 py-2 text-sm disabled:opacity-50"
                    >
                      {messagingOwner ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                      Message Owner
                    </button>
                  )}
                </div>
                <div className="mt-5 overflow-hidden rounded-xl border border-[var(--card-border)]">
                  <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 bg-[var(--primary)]/10 text-sm">
                    <div>
                      <p className="font-semibold">Pickup location</p>
                      <p className="text-[var(--muted)]">{formatPlace(city, province, barangay)}</p>
                      <p className="text-[var(--muted)]">Pickup area: {pickupAddress}</p>
                    </div>
                    <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="btn-outline shrink-0 py-1.5 px-3 text-xs">
                      Get directions
                    </a>
                  </div>
                  <PickupMap lat={latitude} lng={longitude} className="h-56" />
                </div>
                {Boolean(vehicle.description) && (
                  <p className="mt-4 text-sm text-[var(--muted)]">{String(vehicle.description)}</p>
                )}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <span className="text-3xl font-bold text-[var(--primary)]">{formatCurrency(Number(vehicle.price_per_day))}</span>
                  <span className="text-[var(--muted)]">/day</span>
                </div>
                {vehicle.on_maintenance ? (
                  <span className="px-3 py-1 rounded-full text-sm bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold">Under Maintenance</span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-sm bg-green-500/20 text-green-500 capitalize">{String(vehicle.status)}</span>
                )}
              </div>

              {isAdmin ? (
                <div className="rounded-xl bg-[var(--primary)]/5 p-5 text-center">
                  <ShieldCheck className="w-8 h-8 mx-auto mb-3 text-[var(--primary)]" />
                  <p className="font-semibold mb-1">Admin view</p>
                  <p className="text-sm text-[var(--muted)] mb-4">
                    You&apos;re signed in as an administrator. Admins can view listings but can&apos;t book vehicles.
                  </p>
                  <div className="flex flex-col gap-2">
                    <Link href="/dashboard/admin/approvals" className="btn-primary text-sm">Review Vehicle Verifications</Link>
                    <Link href="/dashboard/admin/bookings" className="btn-outline text-sm">View All Bookings</Link>
                  </div>
                </div>
              ) : isOwnerAccount && !isOwner ? (
                <div className="rounded-xl bg-[var(--primary)]/5 p-5 text-center">
                  <Car className="w-8 h-8 mx-auto mb-3 text-[var(--primary)]" />
                  <p className="font-semibold mb-1">Owner account</p>
                  <p className="text-sm text-[var(--muted)] mb-4">
                    Owner accounts list vehicles and can&apos;t book them. To rent, sign up for a separate Customer account.
                  </p>
                  <Link href="/dashboard/vehicles" className="btn-outline inline-block text-sm">Go to My Vehicles</Link>
                </div>
              ) : isOwner ? (
                <div className="rounded-xl bg-[var(--primary)]/5 p-5 text-center">
                  <Car className="w-8 h-8 mx-auto mb-3 text-[var(--primary)]" />
                  <p className="font-semibold mb-1">This is your own listing</p>
                  <p className="text-sm text-[var(--muted)] mb-4">You can view it here, but you can&apos;t book your own vehicle.</p>
                  <Link href="/dashboard/vehicles" className="btn-outline inline-block text-sm">Manage in My Vehicles</Link>
                </div>
              ) : !booking ? (
                <>
                  <h3 className="font-semibold mb-4 flex items-center gap-2"><Calendar className="w-4 h-4" /> Select Dates & Times</h3>

                  {maintenanceDates.filter((m) => m.end_date >= new Date().toISOString().split('T')[0]).length > 0 && (
                    <div className="mb-4 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">
                      <p className="font-semibold mb-1">Unavailable for maintenance:</p>
                      {maintenanceDates
                        .filter((m) => m.end_date >= new Date().toISOString().split('T')[0])
                        .map((m) => (
                          <p key={m.id}>{formatDate(m.start_date)} - {formatDate(m.end_date)}</p>
                        ))}
                    </div>
                  )}

                  {upcomingBookedDates.length > 0 && (
                    <div className="mb-4 rounded-xl bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
                      <p className="font-semibold mb-1">Already booked:</p>
                      {upcomingBookedDates.map((b) => (
                        <p key={b.id}>{formatDate(b.start_date)} - {formatDate(b.end_date)}</p>
                      ))}
                    </div>
                  )}

                  {hasDateConflict && (
                    <div className="mb-4 rounded-xl bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400 font-semibold">
                      Selected dates overlap with a booking or maintenance block. Please choose different dates.
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-sm text-[var(--muted)]">Pickup Date</label>
                      <input type="date" className="input-field mt-1" value={dates.startDate}
                        min={today}
                        onChange={(e) => setDates({ ...dates, startDate: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-sm text-[var(--muted)]">Pickup Time</label>
                      <input type="time" className="input-field mt-1" value={dates.pickupTime}
                        onChange={(e) => setDates({ ...dates, pickupTime: e.target.value || '09:00' })} />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="text-sm text-[var(--muted)]">Number of days (1 day = 24 hours)</label>
                    <div className="mt-1 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setDates({ ...dates, rentalDays: Math.max(1, dates.rentalDays - 1) })}
                        disabled={dates.rentalDays <= 1}
                        className="btn-outline h-11 w-11 !p-0 text-lg disabled:opacity-40"
                        aria-label="Fewer days"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={MAX_RENTAL_DAYS}
                        className="input-field w-20 text-center"
                        value={dates.rentalDays}
                        onChange={(e) => setDates({
                          ...dates,
                          rentalDays: Math.min(MAX_RENTAL_DAYS, Math.max(1, Math.floor(Number(e.target.value) || 1))),
                        })}
                      />
                      <button
                        type="button"
                        onClick={() => setDates({ ...dates, rentalDays: Math.min(MAX_RENTAL_DAYS, dates.rentalDays + 1) })}
                        disabled={dates.rentalDays >= MAX_RENTAL_DAYS}
                        className="btn-outline h-11 w-11 !p-0 text-lg disabled:opacity-40"
                        aria-label="More days"
                      >
                        +
                      </button>
                      <span className="text-sm text-[var(--muted)]">{dates.rentalDays * 24} hours</span>
                    </div>
                  </div>

                  {dates.startDate && (
                    <div className="mb-4 flex items-start gap-2 rounded-xl border border-[var(--card-border)] p-3 text-sm">
                      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
                      <div>
                        <p>
                          <span className="text-[var(--muted)]">Pickup:</span>{' '}
                          <span className="font-medium">{formatDate(dates.startDate)}, {formatTime(dates.pickupTime)}</span>
                        </p>
                        <p>
                          <span className="text-[var(--muted)]">Return:</span>{' '}
                          <span className="font-medium">{formatDate(endDate)}, {formatTime(dropoffTime)}</span>
                        </p>
                      </div>
                    </div>
                  )}

                  {pickupInPast && (
                    <div className="mb-4 rounded-xl bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400 font-semibold">
                      That pickup time has already passed today. Please choose a later time.
                    </div>
                  )}

                  {Boolean(vehicle.driver_available) && (
                    <label className="flex items-center justify-between gap-3 rounded-xl border border-[var(--card-border)] p-3 mb-4 cursor-pointer">
                      <span className="text-sm">
                        <span className="font-medium">With Driver</span>
                        <span className="block text-xs text-[var(--muted)]">
                          +{formatCurrency(driverFeePerDay)}/day for a driver
                        </span>
                      </span>
                      <input
                        type="checkbox"
                        checked={withDriver}
                        onChange={(e) => setWithDriver(e.target.checked)}
                      />
                    </label>
                  )}

                  {days > 0 && (
                    <div className="bg-[var(--primary)]/10 rounded-xl p-4 mb-6">
                      <div className="flex justify-between text-sm mb-1">
                        <span>{formatCurrency(Number(vehicle.price_per_day))} x {days} day{days > 1 ? 's' : ''}</span>
                        <span>{formatCurrency(days * parseFloat(String(vehicle.price_per_day)))}</span>
                      </div>
                      {driverFee > 0 && (
                        <div className="flex justify-between text-sm mb-1">
                          <span>Driver x {days} day{days > 1 ? 's' : ''}</span>
                          <span>{formatCurrency(driverFee)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span className="text-[var(--primary)]">{formatCurrency(total)}</span>
                      </div>
                      <p className="mt-2 text-[11px] text-[var(--muted)]">1 day = 24 hours. Return the vehicle by the same time you picked it up.</p>
                    </div>
                  )}

                  {days > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium mb-2">How do you want to pay?</p>
                      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Payment option">
                        {([
                          { value: 'online', title: 'Pay online', sub: 'GCash, Maya, or card' },
                          { value: 'cash', title: 'Cash at pickup', sub: `${CASH_RESERVATION_PERCENT}% online to reserve` },
                        ] as const).map((o) => (
                          <button
                            key={o.value}
                            type="button"
                            role="radio"
                            aria-checked={paymentOption === o.value}
                            onClick={() => setPaymentOption(o.value)}
                            className={`rounded-xl border p-3 text-left text-sm transition ${
                              paymentOption === o.value
                                ? 'border-[var(--primary)] bg-[var(--primary)]/10 ring-2 ring-[var(--primary)]/30'
                                : 'border-[var(--card-border)] hover:border-[var(--primary)]/50'
                            }`}
                          >
                            <span className="block font-semibold">{o.title}</span>
                            <span className="block text-xs text-[var(--muted)]">{o.sub}</span>
                          </button>
                        ))}
                      </div>
                      {paymentOption === 'cash' && (
                        <div className="mt-2 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                          <p className="flex justify-between font-semibold">
                            <span>Reservation fee (online now)</span>
                            <span>{formatCurrency(Math.round(total * CASH_RESERVATION_PERCENT) / 100)}</span>
                          </p>
                          <p className="flex justify-between font-semibold">
                            <span>Cash to the owner at pickup</span>
                            <span>{formatCurrency(total - Math.round(total * CASH_RESERVATION_PERCENT) / 100)}</span>
                          </p>
                          <p className="mt-1">
                            Only the online reservation fee is protected by JLR Fleetlink refunds. Pay the cash only when you
                            meet the owner, and inspect the vehicle before you drive off.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {isAuthenticated && user?.approval_status !== 'approved' && (
                    <Link
                      href={`/verify-identity?returnTo=${encodeURIComponent(`/vehicles/${id}`)}`}
                      className="flex items-center gap-2 text-xs p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-3"
                    >
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      Verify your driver&apos;s license to complete a booking.
                    </Link>
                  )}

                  {days > 0 && (
                    <div className="mb-4 rounded-xl border border-[var(--card-border)] p-3">
                      <p className="text-sm font-semibold">Rental Agreement</p>
                      <div className="mt-2 max-h-40 space-y-2 overflow-y-auto rounded-lg bg-[var(--primary)]/5 p-3 text-xs text-[var(--muted)]">
                        {rentalAgreementTerms.map((term, i) => (
                          <p key={term.title}><span className="font-semibold text-[var(--foreground)]">{i + 1}. {term.title}.</span> {term.body}</p>
                        ))}
                        <p className="text-[10px]">Version {RENTAL_AGREEMENT_VERSION}</p>
                      </div>
                      <label className="mt-3 flex items-start gap-2 text-sm">
                        <input type="checkbox" className="mt-1" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                        <span>I have read and agree to the Rental Agreement.</span>
                      </label>
                      <input
                        className="input-field mt-2"
                        placeholder="Type your full name to sign"
                        value={signatureName}
                        maxLength={255}
                        onChange={(e) => setSignatureName(e.target.value)}
                      />
                    </div>
                  )}

                  <button onClick={handleBook} disabled={bookingLoading || days === 0 || hasDateConflict || pickupInPast || !agreementSigned} className="btn-primary w-full disabled:opacity-60">
                    {bookingLoading ? 'Booking...' : paymentOption === 'cash' ? 'Book & Pay Reservation' : 'Book & Pay'}
                  </button>
                </>
              ) : (
                <div>
                  <h3 className="font-semibold mb-1 text-green-500">Booking Created</h3>
                  {booking.payment_status === 'pending' && (
                    <p className="mb-4 text-sm text-amber-500">
                      Pay within {PAYMENT_WINDOW_MINUTES} minutes to confirm it, or it will be cancelled automatically.
                    </p>
                  )}
                  <div className="space-y-2 text-sm mb-6">
                    <p className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[var(--primary)]" />
                      Pickup: {formatDate(String(booking.start_date))} at {formatTime(String(booking.pickup_time || '09:00'))}
                    </p>
                    <p className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[var(--primary)]" />
                      Return: {formatDate(String(booking.end_date))} at {formatTime(String(booking.dropoff_time || '17:00'))}
                    </p>
                    {Boolean(booking.with_driver) && <p>Includes driver: +{formatCurrency(Number(booking.driver_fee || 0))}</p>}
                    <p>Total: {formatCurrency(Number(booking.total_amount))}</p>
                    <p>Paid: {formatCurrency(Number(booking.paid_amount || 0))}</p>
                    {Number(booking.cash_due || 0) > 0 && (
                      <p className="font-semibold text-amber-600 dark:text-amber-400">
                        Cash at pickup: {formatCurrency(Number(booking.cash_due))}
                      </p>
                    )}
                    <p>Status: <span className="capitalize">{String(booking.payment_status)}</span></p>
                  </div>
                  {onlineDue(booking as { total_amount: number; paid_amount: number; cash_due: number }) > 0 && (
                    <button onClick={() => setShowPayment(true)} className="btn-primary w-full mb-3">
                      {Number(booking.cash_due || 0) > 0 ? 'Pay Reservation Fee' : 'Make Payment'}
                    </button>
                  )}
                  {Number(booking.paid_amount || 0) > 0 && (
                    <button
                      onClick={async () => {
                        try {
                          const res = await api.get(`/payments/booking/${booking.id}/receipt`);
                          const latest = res.data.data.payments?.find((p: { invoice_number?: string }) => p.invoice_number);
                          if (latest?.invoice_number) router.push(`/dashboard/receipt/${latest.invoice_number}`);
                          else toast.error('No receipt found yet');
                        } catch {
                          toast.error('Could not load receipt');
                        }
                      }}
                      className="btn-outline w-full mb-3"
                    >
                      View Receipt
                    </button>
                  )}
                  <button onClick={() => router.push('/dashboard/bookings')} className="btn-outline w-full">
                    View My Bookings
                  </button>
                </div>
              )}
            </motion.div>
          </div>

          <div className="mt-8">
            <ReviewList title="Vehicle Reviews" summary={reviews} />
          </div>
        </div>
      </main>
      <Footer />

      {booking && (
        <PaymentModal
          // Only the online part: cash due at pickup is paid to the owner, not here.
          booking={{ id: String(booking.id), total_amount: Number(booking.total_amount) - Number(booking.cash_due || 0), paid_amount: Number(booking.paid_amount || 0), title: String(vehicle.title) }}
          isOpen={showPayment}
          onClose={() => setShowPayment(false)}
        />
      )}
    </>
  );
}
