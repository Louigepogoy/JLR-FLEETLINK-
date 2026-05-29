'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Car, Calendar, Crown, TrendingUp } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

export default function OwnerDashboard() {
  const [earnings, setEarnings] = useState({ total_earnings: 0, monthly_earnings: 0, total_transactions: 0 });
  const [vehicles, setVehicles] = useState([]);
  const [pendingBookings, setPendingBookings] = useState(0);

  useEffect(() => {
    Promise.all([
      api.get('/transactions/earnings'),
      api.get('/vehicles/owner/my-vehicles'),
      api.get('/bookings/owner'),
    ]).then(([earningsRes, vehiclesRes, bookingsRes]) => {
      setEarnings(earningsRes.data.data.summary);
      setVehicles(vehiclesRes.data.data);
      setPendingBookings(bookingsRes.data.data.filter((b: { status: string }) => b.status === 'pending').length);
    }).catch(() => {});
  }, []);

  return (
    <DashboardLayout role="owner">
      <h2 className="text-2xl font-bold mb-6">Owner Overview</h2>
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="glass-card p-6">
          <TrendingUp className="w-8 h-8 text-green-500 mb-3" />
          <p className="text-3xl font-bold">{formatCurrency(earnings.total_earnings)}</p>
          <p className="text-sm text-[var(--muted)]">Total Earnings</p>
        </div>
        <div className="glass-card p-6">
          <Car className="w-8 h-8 text-sky-500 mb-3" />
          <p className="text-3xl font-bold">{vehicles.length}</p>
          <p className="text-sm text-[var(--muted)]">Listed Vehicles</p>
        </div>
        <div className="glass-card p-6">
          <Calendar className="w-8 h-8 text-yellow-500 mb-3" />
          <p className="text-3xl font-bold">{pendingBookings}</p>
          <p className="text-sm text-[var(--muted)]">Pending Bookings</p>
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        <Link href="/dashboard/owner/vehicles" className="glass-card p-6 hover:border-[var(--primary)] transition-colors">
          <h3 className="font-semibold mb-2">Manage Vehicles</h3>
          <p className="text-sm text-[var(--muted)]">Add, edit, or remove your vehicle listings</p>
        </Link>
        <Link href="/dashboard/owner/bookings" className="glass-card p-6 hover:border-[var(--primary)] transition-colors">
          <h3 className="font-semibold mb-2">Review Bookings</h3>
          <p className="text-sm text-[var(--muted)]">Approve or reject customer booking requests</p>
        </Link>
        <Link href="/dashboard/owner/subscription" className="glass-card p-6 hover:border-[var(--primary)] transition-colors">
          <Crown className="w-6 h-6 text-blue-500 mb-3" />
          <h3 className="font-semibold mb-2">Subscription</h3>
          <p className="text-sm text-[var(--muted)]">Choose a plan to publish and grow your fleet</p>
        </Link>
      </div>
    </DashboardLayout>
  );
}
