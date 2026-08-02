'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, Car, CreditCard, Crown, TrendingUp } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

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
      <h2 className="text-2xl font-bold mb-6">Overview</h2>

      <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)] mb-3">As a Renter</h3>
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {[
          { icon: Calendar, label: 'Total Bookings', value: rentalStats.total, color: 'sky' },
          { icon: Car, label: 'Active Rentals', value: rentalStats.active, color: 'green' },
          { icon: CreditCard, label: 'Pending Approval', value: rentalStats.pending, color: 'yellow' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="glass-card p-6">
            <Icon className={`w-8 h-8 text-${color}-500 mb-3`} />
            <p className="text-3xl font-bold">{value}</p>
            <p className="text-sm text-[var(--muted)]">{label}</p>
          </div>
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
                  <p className="text-xs text-[var(--muted)]">{b.start_date} → {b.end_date}</p>
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
        <div className="glass-card p-6">
          <TrendingUp className="w-8 h-8 text-green-500 mb-3" />
          <p className="text-3xl font-bold">{formatCurrency(earnings.total_earnings)}</p>
          <p className="text-sm text-[var(--muted)]">Total Earnings</p>
        </div>
        <div className="glass-card p-6">
          <Car className="w-8 h-8 text-sky-500 mb-3" />
          <p className="text-3xl font-bold">{vehicleCount}</p>
          <p className="text-sm text-[var(--muted)]">Listed Vehicles</p>
        </div>
        <div className="glass-card p-6">
          <Calendar className="w-8 h-8 text-yellow-500 mb-3" />
          <p className="text-3xl font-bold">{pendingRequests}</p>
          <p className="text-sm text-[var(--muted)]">Pending Booking Requests</p>
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        <Link href="/dashboard/vehicles" className="glass-card p-6 hover:border-[var(--primary)] transition-colors">
          <h3 className="font-semibold mb-2">Manage Vehicles</h3>
          <p className="text-sm text-[var(--muted)]">Add, edit, or remove your vehicle listings</p>
        </Link>
        <Link href="/dashboard/booking-requests" className="glass-card p-6 hover:border-[var(--primary)] transition-colors">
          <h3 className="font-semibold mb-2">Booking Requests</h3>
          <p className="text-sm text-[var(--muted)]">Approve or reject requests on your vehicles</p>
        </Link>
        <Link href="/dashboard/subscription" className="glass-card p-6 hover:border-[var(--primary)] transition-colors">
          <Crown className="w-6 h-6 text-blue-500 mb-3" />
          <h3 className="font-semibold mb-2">Subscription</h3>
          <p className="text-sm text-[var(--muted)]">Choose a plan to publish and grow your fleet</p>
        </Link>
      </div>
    </DashboardLayout>
  );
}
