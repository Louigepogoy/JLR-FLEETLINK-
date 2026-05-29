'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Calendar, CreditCard, TrendingUp } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState({
    revenue: { total_revenue: 0, monthly_revenue: 0, total_transactions: 0 },
    usersByRole: [], bookingsByStatus: [],
  });

  useEffect(() => {
    api.get('/transactions/analytics').then((res) => setAnalytics(res.data.data)).catch(() => {});
  }, []);

  const totalUsers = analytics.usersByRole.reduce((sum: number, u: { count: string }) => sum + parseInt(u.count), 0);

  return (
    <DashboardLayout role="admin">
      <h2 className="text-2xl font-bold mb-6">Admin Overview</h2>
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        {[
          { icon: TrendingUp, label: 'Platform Revenue', value: formatCurrency(analytics.revenue.total_revenue) },
          { icon: CreditCard, label: 'Monthly Revenue', value: formatCurrency(analytics.revenue.monthly_revenue) },
          { icon: Users, label: 'Total Users', value: totalUsers },
          { icon: Calendar, label: 'Transactions', value: analytics.revenue.total_transactions },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="glass-card p-6">
            <Icon className="w-8 h-8 text-[var(--primary)] mb-3" />
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-[var(--muted)]">{label}</p>
          </div>
        ))}
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        {[
          { href: '/dashboard/admin/approvals', title: 'Registration Approvals', desc: 'Review license & selfie verifications' },
          { href: '/dashboard/admin/users', title: 'Manage Users', desc: 'View and manage all platform users' },
          { href: '/dashboard/admin/bookings', title: 'All Bookings', desc: 'Monitor all booking activity' },
          { href: '/dashboard/admin/reports', title: 'User Reports', desc: 'Review customer and owner complaints' },
          { href: '/dashboard/admin/settings', title: 'Commission Settings', desc: 'Configure platform commission rate' },
        ].map((item) => (
          <Link key={item.href} href={item.href} className="glass-card p-6 hover:border-[var(--primary)] transition-colors">
            <h3 className="font-semibold mb-2">{item.title}</h3>
            <p className="text-sm text-[var(--muted)]">{item.desc}</p>
          </Link>
        ))}
      </div>
    </DashboardLayout>
  );
}
