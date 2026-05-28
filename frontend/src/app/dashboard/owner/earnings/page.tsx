'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

export default function OwnerEarningsPage() {
  const [data, setData] = useState({ summary: { total_earnings: 0, monthly_earnings: 0 }, monthlyBreakdown: [] });

  useEffect(() => {
    api.get('/transactions/earnings').then((res) => setData(res.data.data)).catch(() => {});
  }, []);

  const chartData = data.monthlyBreakdown.map((m: { month: string; earnings: string }) => ({
    month: new Date(m.month).toLocaleDateString('en-PH', { month: 'short', year: '2-digit' }),
    earnings: parseFloat(m.earnings),
  }));

  return (
    <DashboardLayout role="owner">
      <h2 className="text-2xl font-bold mb-6">Earnings Dashboard</h2>
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="glass-card p-6">
          <p className="text-sm text-[var(--muted)]">Total Earnings</p>
          <p className="text-4xl font-bold gradient-text">{formatCurrency(data.summary.total_earnings)}</p>
        </div>
        <div className="glass-card p-6">
          <p className="text-sm text-[var(--muted)]">This Month</p>
          <p className="text-4xl font-bold">{formatCurrency(data.summary.monthly_earnings)}</p>
        </div>
      </div>
      <div className="glass-card p-6">
        <h3 className="font-semibold mb-4">Monthly Earnings</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="month" stroke="var(--muted)" fontSize={12} />
            <YAxis stroke="var(--muted)" fontSize={12} />
            <Tooltip formatter={(v) => formatCurrency(Number(v))} />
            <Bar dataKey="earnings" fill="url(#gradient)" radius={[8, 8, 0, 0]} />
            <defs>
              <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0ea5e9" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </DashboardLayout>
  );
}
