'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
  CalendarCheckIcon, EarningsIcon, FlagIcon, IconChip, OverviewIcon, ReceiptIcon, SettingsIcon, TrendUpIcon, UsersIcon, VerifyIdIcon,
} from '@/components/illustrations/MiniIcons';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    revenue: { total_revenue: 0, monthly_revenue: 0, total_transactions: 0 },
    usersByRole: [], bookingsByStatus: [],
  });

  useEffect(() => {
    api.get('/transactions/analytics').then((res) => setAnalytics(res.data.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const totalUsers = analytics.usersByRole.reduce((sum: number, u: { count: string }) => sum + parseInt(u.count), 0);

  if (loading) {
    return (
      <DashboardLayout role="admin">
        <div className="skeleton h-8 w-48 mb-6" />
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin">
      <h2 className="text-2xl font-bold flex items-center gap-3 mb-6"><IconChip icon={OverviewIcon} className="h-10 w-10 rounded-xl" iconClassName="h-7 w-7" />Admin Overview</h2>
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        {[
          { icon: TrendUpIcon, label: 'Platform Revenue', value: formatCurrency(analytics.revenue.total_revenue) },
          { icon: EarningsIcon, label: 'Monthly Revenue', value: formatCurrency(analytics.revenue.monthly_revenue) },
          { icon: UsersIcon, label: 'Total Users', value: totalUsers },
          { icon: ReceiptIcon, label: 'Transactions', value: analytics.revenue.total_transactions },
        ].map(({ icon, label, value }) => (
          <div key={label} className="glass-card flex items-center gap-4 p-6">
            <IconChip icon={icon} className="h-14 w-14 rounded-2xl" iconClassName="h-9 w-9" />
            <div className="min-w-0">
              <p className="text-xl font-bold leading-tight">{value}</p>
              <p className="text-sm text-[var(--muted)]">{label}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        {[
          { href: '/dashboard/admin/approvals', icon: VerifyIdIcon, title: 'Registration Approvals', desc: 'Review license & selfie verifications' },
          { href: '/dashboard/admin/users', icon: UsersIcon, title: 'Manage Users', desc: 'View and manage all platform users' },
          { href: '/dashboard/admin/bookings', icon: CalendarCheckIcon, title: 'All Bookings', desc: 'Monitor all booking activity' },
          { href: '/dashboard/admin/reports', icon: FlagIcon, title: 'User Reports', desc: 'Review customer and owner complaints' },
          { href: '/dashboard/admin/settings', icon: SettingsIcon, title: 'Commission Settings', desc: 'Configure platform commission rate' },
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
