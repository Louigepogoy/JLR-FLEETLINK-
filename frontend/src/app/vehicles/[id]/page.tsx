'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Calendar, Car, Clock, Fuel, Hash, MapPin, Phone, ShieldAlert, Settings2, User, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import BookingProgress from '@/components/booking/BookingProgress';
import PaymentModal from '@/components/payment/PaymentModal';
import EmptyState from '@/components/ui/EmptyState';
import ImageGallery from '@/components/vehicles/ImageGallery';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';

export default function VehicleDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [vehicle, setVehicle] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(2);
  const [dates, setDates] = useState({ startDate: '', endDate: '', pickupTime: '09:00', dropoffTime: '17:00' });
  const [booking, setBooking] = useState<Record<string, unknown> | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [maintenanceDates, setMaintenanceDates] = useState<{ id: string; start_date: string; end_date: string }[]>([]);

  useEffect(() => {
    api.get(`/vehicles/${id}`).then((res) => setVehicle(res.data.data)).catch(() => toast.error('Vehicle not found')).finally(() => setLoading(false));
    api.get(`/vehicles/${id}/maintenance-dates`).then((res) => setMaintenanceDates(res.data.data)).catch(() => {});
  }, [id]);

  const days = dates.startDate && dates.endDate
    ? Math.max(Math.ceil((new Date(dates.endDate).getTime() - new Date(dates.startDate).getTime()) / 86400000) + 1, 1)
    : 0;
  const total = vehicle ? days * parseFloat(String(vehicle.price_per_day)) : 0;

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
    if (!dates.startDate || !dates.endDate) {
      toast.error('Please select dates');
      return;
    }
    setBookingLoading(true);
    try {
      const res = await api.post('/bookings', { vehicleId: id, ...dates });
      setBooking(res.data.data);
      setStep(4);
      toast.success('Booking created! Proceed to payment.');
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

  const city = String(vehicle.city || vehicle.location || 'Cebu City');
  const barangay = vehicle.barangay ? String(vehicle.barangay) : '';
  const pickupAddress = vehicle.pickup_address ? String(vehicle.pickup_address) : 'Owner-provided pickup point';
  const latitude = Number(vehicle.latitude || 10.3157);
  const longitude = Number(vehicle.longitude || 123.8854);
  const pickupQuery = encodeURIComponent(
    [pickupAddress, barangay, city, 'Cebu', 'Philippines'].filter(Boolean).join(', ')
  );
  const mapSrc = `https://maps.google.com/maps?q=${pickupQuery || `${latitude},${longitude}`}&z=17&output=embed`;
  const images = Array.isArray(vehicle.images) ? vehicle.images as string[] : [];
  const isOwner = isAuthenticated && user?.id === vehicle.owner_id;

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <BookingProgress currentStep={booking ? 4 : step} />

          <div className="grid lg:grid-cols-2 gap-8">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="glass-card overflow-hidden">
              <ImageGallery images={images} alt={String(vehicle.title)} className="h-72" />
              <div className="p-6">
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-3 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-semibold">Available in {city}</span>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 text-xs font-semibold">Cebu Province Verified</span>
                </div>
                <h1 className="text-3xl font-bold mb-2">{String(vehicle.title)}</h1>
                <p className="text-[var(--muted)] mb-4">{String(vehicle.brand)} {String(vehicle.model)} - {String(vehicle.year)}</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { icon: MapPin, val: [city, barangay].filter(Boolean).join(', ') },
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
                  <div className="flex items-center gap-3">
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
                      <p className="font-medium text-[var(--foreground)]">
                        {String(vehicle.owner_name || 'Vehicle owner')}
                      </p>
                      <p className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-[var(--primary)]" />
                        {String(vehicle.owner_phone || 'No phone provided')}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 overflow-hidden rounded-xl border border-[var(--card-border)]">
                  <div className="px-4 py-3 bg-[var(--primary)]/10 text-sm">
                    <p className="font-semibold">Static pickup preview</p>
                    <p className="text-[var(--muted)]">City: {city}</p>
                    {barangay && <p className="text-[var(--muted)]">Barangay: {barangay}</p>}
                    <p className="text-[var(--muted)]">Pickup area: {pickupAddress}</p>
                  </div>
                  <iframe
                    title="Static pickup map preview"
                    src={mapSrc}
                    className="h-56 w-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
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

              {isOwner ? (
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

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-sm text-[var(--muted)]">Pickup Date</label>
                      <input type="date" className="input-field mt-1" value={dates.startDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setDates({ ...dates, startDate: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-sm text-[var(--muted)]">Pickup Time</label>
                      <input type="time" className="input-field mt-1" value={dates.pickupTime}
                        onChange={(e) => setDates({ ...dates, pickupTime: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-sm text-[var(--muted)]">Return Date</label>
                      <input type="date" className="input-field mt-1" value={dates.endDate}
                        min={dates.startDate || new Date().toISOString().split('T')[0]}
                        onChange={(e) => setDates({ ...dates, endDate: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-sm text-[var(--muted)]">Return Time</label>
                      <input type="time" className="input-field mt-1" value={dates.dropoffTime}
                        onChange={(e) => setDates({ ...dates, dropoffTime: e.target.value })} />
                    </div>
                  </div>

                  {days > 0 && (
                    <div className="bg-[var(--primary)]/10 rounded-xl p-4 mb-6">
                      <div className="flex justify-between text-sm mb-1">
                        <span>{formatCurrency(Number(vehicle.price_per_day))} x {days} days</span>
                        <span>{formatCurrency(total)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span className="text-[var(--primary)]">{formatCurrency(total)}</span>
                      </div>
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

                  <button onClick={handleBook} disabled={bookingLoading || days === 0} className="btn-primary w-full">
                    {bookingLoading ? 'Booking...' : 'Confirm Cebu Booking'}
                  </button>
                </>
              ) : (
                <div>
                  <h3 className="font-semibold mb-4 text-green-500">Booking Created</h3>
                  <div className="space-y-2 text-sm mb-6">
                    <p className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[var(--primary)]" />
                      Pickup: {formatDate(String(booking.start_date))} at {formatTime(String(booking.pickup_time || '09:00'))}
                    </p>
                    <p className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[var(--primary)]" />
                      Return: {formatDate(String(booking.end_date))} at {formatTime(String(booking.dropoff_time || '17:00'))}
                    </p>
                    <p>Total: {formatCurrency(Number(booking.total_amount))}</p>
                    <p>Paid: {formatCurrency(Number(booking.paid_amount || 0))}</p>
                    <p>Status: <span className="capitalize">{String(booking.payment_status)}</span></p>
                  </div>
                  {booking.payment_status !== 'fully_paid' && (
                    <button onClick={() => setShowPayment(true)} className="btn-primary w-full mb-3">
                      Make Payment
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
        </div>
      </main>
      <Footer />

      {booking && (
        <PaymentModal
          booking={{ id: String(booking.id), total_amount: Number(booking.total_amount), paid_amount: Number(booking.paid_amount || 0), title: String(vehicle.title) }}
          isOpen={showPayment}
          onClose={() => setShowPayment(false)}
        />
      )}
    </>
  );
}
