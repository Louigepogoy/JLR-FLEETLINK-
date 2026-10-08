'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { canList, canRent, useAuthStore } from '@/store/authStore';
import {
  BrowseCarIcon, CalendarCheckIcon, CrownIcon, EarningsIcon, IconChip, type MiniIcon, MyVehicleIcon, OverviewIcon,
  PendingIcon, RequestsIcon, SupportIcon, TrendUpIcon,
} from '@/components/illustrations/MiniIcons';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

function StatCard({ icon, label, value }: { icon: MiniIcon; label: string; value: string | number }) {
  return (
    <div className="glass-card flex items-center gap-4 p-6">
      <IconChip icon={icon} className="h-14 w-14 rounded-2xl" iconClassName="h-9 w-9" />
      <div className="money-box flex-1">
        <p className="money-fit font-bold">{value}</p>
        <p className="text-sm text-[var(--muted)]">{label}</p>
      </div>
    </div>
  );
}

// Top of the customer and owner dashboards: who this dashboard is for and the main next step.
function WelcomeBanner({ name, kind }: { name: string; kind: 'customer' | 'owner' }) {
  const copy = kind === 'customer'
    ? {
      badge: 'Customer Dashboard',
      title: `Hi, ${name}! Where are you headed next?`,
      text: 'Find a verified ride near you, track your bookings, and pay securely.',
      primary: { href: '/vehicles', label: 'Browse Vehicles' },
      secondary: { href: '/dashboard/bookings', label: 'My Bookings' },
    }
    : {
      badge: 'Owner Dashboard',
      title: `Hi, ${name}! Here's how your fleet is doing.`,
      text: 'Manage your listings, respond to booking requests, and track your earnings.',
      primary: { href: '/dashboard/vehicles', label: 'Add or Manage Vehicles' },
      secondary: { href: '/dashboard/booking-requests', label: 'Booking Requests' },
    };
  return (
    <div className="mb-8 rounded-2xl gradient-bg p-6 text-white sm:p-8">
      <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wide">{copy.badge}</span>
      <h2 className="mt-3 text-2xl font-bold sm:text-3xl">{copy.title}</h2>
      <p className="mt-2 max-w-xl text-sm text-white/85">{copy.text}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link href={copy.primary.href} className="min-h-11 inline-flex items-center rounded-xl bg-white px-5 text-sm font-bold text-[var(--primary-dark)] hover:opacity-90">
          {copy.primary.label}
        </Link>
        <Link href={copy.secondary.href} className="min-h-11 inline-flex items-center rounded-xl border border-white/60 px-5 text-sm font-bold text-white hover:bg-white/10">
          {copy.secondary.label}
        </Link>
      </div>
    </div>
  );
}

function QuickLinks({ items }: { items: { href: string; icon: MiniIcon; title: string; desc: string }[] }) {
  return (
    <div className="grid md:grid-cols-3 gap-6">
      {items.map((item) => (
        <Link key={item.href} href={item.href} className="glass-card group flex gap-4 p-6 hover:border-[var(--primary)] transition-colors">
          <IconChip icon={item.icon} className="h-12 w-12 rounded-xl transition-transform group-hover:scale-105" iconClassName="h-8 w-8" />
          <div>
            <h3 className="font-semibold mb-1">{item.title}</h3>
            <p className="text-sm text-[var(--muted)]">{item.desc}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function DashboardOverviewPage() {
  const user = useAuthStore((s) => s.user);
  // Customer accounts only see renter stats, owner accounts only provider stats.
  const showRenter = canRent(user);
  const showProvider = canList(user);
  // A customer-only or owner-only account gets its own dashboard; older accounts that do both see both halves.
  const kind = showRenter && showProvider ? 'both' : showProvider ? 'owner' : 'customer';
  const firstName = (user?.full_name || user?.username || '').split(' ')[0] || 'there';
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [rentalStats, setRentalStats] = useState({ total: 0, active: 0, pending: 0 });
  const [earnings, setEarnings] = useState({ total_earnings: 0, monthly_earnings: 0, total_transactions: 0 });
  const [vehicleCount, setVehicleCount] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);

  useEffect(() => {
    const rentalPromise = api.get('/bookings/my').then((res) => {
      const data = res.data.data;
      setBookings(data.slice(0, 5));
      setRentalStats({
        total: data.length,
        active: data.filter((b: { status: string }) => ['approved', 'active'].includes(b.status)).length,
        pending: data.filter((b: { status: string }) => b.status === 'pending').length,
      });
    }).catch(() => {});

    const providerPromise = Promise.all([
      api.get('/transactions/earnings'),
      api.get('/vehicles/owner/my-vehicles'),
      api.get('/bookings/owner'),
    ]).then(([earningsRes, vehiclesRes, bookingsRes]) => {
      setEarnings(earningsRes.data.data.summary);
      setVehicleCount(vehiclesRes.data.data.length);
      setPendingRequests(bookingsRes.data.data.filter((b: { status: string }) => b.status === 'pending').length);
    }).catch(() => {});

    Promise.all([rentalPromise, providerPromise]).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <DashboardLayout role="user">
        <div className="skeleton h-8 w-40 mb-6" />
        <div className="skeleton h-4 w-32 mb-3" />
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
        </div>
        <div className="skeleton h-40 rounded-2xl mb-10" />
        <div className="skeleton h-4 w-32 mb-3" />
        <div className="grid md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="user">
      {kind === 'both' ? (
        <h2 className="text-2xl font-bold flex items-center gap-3 mb-6"><IconChip icon={OverviewIcon} className="h-10 w-10 rounded-xl" iconClassName="h-7 w-7" />Overview</h2>
      ) : (
        <WelcomeBanner name={firstName} kind={kind} />
      )}

      {showRenter && (<>
      {kind === 'both' && <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)] mb-3">As a Renter</h3>}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {[
          { icon: CalendarCheckIcon, label: 'Total Bookings', value: rentalStats.total },
          { icon: MyVehicleIcon, label: 'Active Rentals', value: rentalStats.active },
          { icon: PendingIcon, label: 'Pending Approval', value: rentalStats.pending },
        ].map(({ icon, label, value }) => (
          <StatCard key={label} icon={icon} label={label} value={value} />
        ))}
      </div>

      <div className="glass-card p-6 mb-10">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Recent Bookings</h3>
          <Link href="/dashboard/bookings" className="text-sm text-[var(--primary)]">View All</Link>
        </div>
        {bookings.length === 0 ? (
          <p className="text-[var(--muted)] text-center py-8">No bookings yet. <Link href="/vehicles" className="text-[var(--primary)]">Browse vehicles</Link></p>
        ) : (
          <div className="space-y-3">
            {bookings.map((b: { id: string; title: string; start_date: string; end_date: string; total_amount: number; status: string; payment_status: string }) => (
              <div key={b.id} className="flex justify-between items-center p-4 rounded-xl border border-[var(--card-border)]">
                <div>
                  <p className="font-medium">{b.title}</p>
                  <p className="text-xs text-[var(--muted)]">{formatDate(b.start_date)} → {formatDate(b.end_date)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(b.total_amount)}</p>
                  <span className="text-xs capitalize px-2 py-0.5 rounded-full bg-[var(--primary)]/20">{b.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {kind === 'customer' && (
        <QuickLinks items={[
          { href: '/vehicles', icon: BrowseCarIcon, title: 'Browse Vehicles', desc: 'Find cars and motorcycles near you' },
          { href: '/dashboard/bookings', icon: CalendarCheckIcon, title: 'My Bookings', desc: 'Pay, track pickup, and review your rentals' },
          { href: '/dashboard/support', icon: SupportIcon, title: 'Support', desc: 'Get help with a booking or payment' },
        ]} />
      )}
      </>)}

      {showProvider && (<>
      {kind === 'both' && <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)] mb-3">As a Provider</h3>}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <StatCard icon={TrendUpIcon} label="Total Earnings" value={formatCurrency(earnings.total_earnings)} />
        <StatCard icon={MyVehicleIcon} label="Listed Vehicles" value={vehicleCount} />
        <StatCard icon={RequestsIcon} label="Pending Booking Requests" value={pendingRequests} />
      </div>
      <QuickLinks items={[
        { href: '/dashboard/vehicles', icon: MyVehicleIcon, title: 'Manage Vehicles', desc: 'Add, edit, or remove your vehicle listings' },
        kind === 'owner'
          ? { href: '/dashboard/earnings', icon: EarningsIcon, title: 'Earnings', desc: 'See your payouts and set your GCash or bank' }
          : { href: '/dashboard/booking-requests', icon: RequestsIcon, title: 'Booking Requests', desc: 'Approve or reject requests on your vehicles' },
        { href: '/dashboard/subscription', icon: CrownIcon, title: 'Subscription', desc: 'Choose a plan to publish and grow your fleet' },
      ]} />
      </>)}
    </DashboardLayout>
  );
}
