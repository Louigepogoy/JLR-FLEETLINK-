'use client';

import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

const COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

export default function AdminAnalyticsPage() {
  const [data, setData] = useState({
    revenue: { total_revenue: 0, monthly_revenue: 0 },
    usersByRole: [], bookingsByStatus: [], monthlyRevenue: [],
  });

  useEffect(() => {
    api.get('/transactions/analytics').then((res) => setData(res.data.data)).catch(() => {});
  }, []);

  const revenueChart = data.monthlyRevenue.map((m: { month: string; revenue: string }) => ({
    month: new Date(m.month).toLocaleDateString('en-PH', { month: 'short' }),
    revenue: parseFloat(m.revenue),
  }));

  const userChart = data.usersByRole.map((u: { role: string; count: string }) => ({
    name: u.role, value: parseInt(u.count),
  }));

  return (
    <DashboardLayout role="admin">
      <h2 className="text-2xl font-bold mb-6">Revenue Analytics</h2>
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="glass-card p-6">
          <p className="text-sm text-[var(--muted)]">Total Platform Revenue</p>
          <p className="text-4xl font-bold gradient-text">{formatCurrency(data.revenue.total_revenue)}</p>
        </div>
        <div className="glass-card p-6">
          <p className="text-sm text-[var(--muted)]">Monthly Revenue</p>
          <p className="text-4xl font-bold">{formatCurrency(data.revenue.monthly_revenue)}</p>
        </div>
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">Monthly Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenueChart}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" stroke="var(--muted)" fontSize={12} />
              <YAxis stroke="var(--muted)" fontSize={12} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Area type="monotone" dataKey="revenue" stroke="#0ea5e9" fill="url(#colorRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">Users by Role</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={userChart} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {userChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </DashboardLayout>
  );
}
