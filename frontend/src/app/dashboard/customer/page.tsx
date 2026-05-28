'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, Car, CreditCard } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

export default function CustomerDashboard() {
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0 });

  useEffect(() => {
    api.get('/bookings/my').then((res) => {
      const data = res.data.data;
      setBookings(data.slice(0, 5));
      setStats({
        total: data.length,
        active: data.filter((b: { status: string }) => ['approved', 'active'].includes(b.status)).length,
        pending: data.filter((b: { status: string }) => b.status === 'pending').length,
      });
    }).catch(() => {});
  }, []);

  return (
    <DashboardLayout role="customer">
      <h2 className="text-2xl font-bold mb-6">Customer Overview</h2>
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {[
          { icon: Calendar, label: 'Total Bookings', value: stats.total, color: 'sky' },
          { icon: Car, label: 'Active Rentals', value: stats.active, color: 'green' },
          { icon: CreditCard, label: 'Pending Approval', value: stats.pending, color: 'yellow' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="glass-card p-6">
            <Icon className={`w-8 h-8 text-${color}-500 mb-3`} />
            <p className="text-3xl font-bold">{value}</p>
            <p className="text-sm text-[var(--muted)]">{label}</p>
          </div>
        ))}
      </div>

      <div className="glass-card p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Recent Bookings</h3>
          <Link href="/dashboard/customer/bookings" className="text-sm text-[var(--primary)]">View All</Link>
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
    </DashboardLayout>
  );
}
