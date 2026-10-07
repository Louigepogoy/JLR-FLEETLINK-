'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
  CalendarCheckIcon, CrownIcon, IconChip, type MiniIcon, MyVehicleIcon, OverviewIcon, PendingIcon, RequestsIcon, TrendUpIcon,
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

export default function DashboardOverviewPage() {
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
      <h2 className="text-2xl font-bold flex items-center gap-3 mb-6"><IconChip icon={OverviewIcon} className="h-10 w-10 rounded-xl" iconClassName="h-7 w-7" />Overview</h2>

      <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)] mb-3">As a Renter</h3>
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

      <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)] mb-3">As a Provider</h3>
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <StatCard icon={TrendUpIcon} label="Total Earnings" value={formatCurrency(earnings.total_earnings)} />
        <StatCard icon={MyVehicleIcon} label="Listed Vehicles" value={vehicleCount} />
        <StatCard icon={RequestsIcon} label="Pending Booking Requests" value={pendingRequests} />
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        {[
          { href: '/dashboard/vehicles', icon: MyVehicleIcon, title: 'Manage Vehicles', desc: 'Add, edit, or remove your vehicle listings' },
          { href: '/dashboard/booking-requests', icon: RequestsIcon, title: 'Booking Requests', desc: 'Approve or reject requests on your vehicles' },
          { href: '/dashboard/subscription', icon: CrownIcon, title: 'Subscription', desc: 'Choose a plan to publish and grow your fleet' },
        ].map((item) => (
          <Link key={item.href} href={item.href} className="glass-card group flex gap-4 p-6 hover:border-[var(--primary)] transition-colors">
            <IconChip icon={item.icon} className="h-12 w-12 rounded-xl transition-transform group-hover:scale-105" iconClassName="h-8 w-8" />
            <div>
              <h3 className="font-semibold mb-1">{item.title}</h3>
              <p className="text-sm text-[var(--muted)]">{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </DashboardLayout>
  );
}
