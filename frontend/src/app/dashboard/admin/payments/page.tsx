'use client';

import { useEffect, useState } from 'react';
import { CreditCard } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import EmptyState from '@/components/ui/EmptyState';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function AdminPaymentsPage() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    api.get('/transactions').then((res) => setTransactions(res.data.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <DashboardLayout role="admin">
        <div className="skeleton h-8 w-56 mb-6" />
        <div className="skeleton h-64 rounded-2xl" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin">
      <h2 className="text-2xl font-bold mb-6">Payment Monitoring</h2>
      {transactions.length === 0 ? (
        <EmptyState icon={CreditCard} title="No transactions found" />
      ) : (
      <div className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--card-border)]">
              <th className="text-left p-4">Invoice</th>
              <th className="text-left p-4">Vehicle</th>
              <th className="text-left p-4">Total</th>
              <th className="text-left p-4">Commission</th>
              <th className="text-left p-4">Owner Gets</th>
              <th className="text-left p-4">Status</th>
              <th className="text-left p-4">Date</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t: {
              id: string; invoice_number: string; vehicle_title: string;
              total_amount: number; commission_amount: number; owner_amount: number;
              status: string; created_at: string;
            }) => (
              <tr key={t.id} className="border-b border-[var(--card-border)] hover:bg-[var(--primary)]/5">
                <td className="p-4 font-mono text-xs">{t.invoice_number}</td>
                <td className="p-4">{t.vehicle_title}</td>
                <td className="p-4">{formatCurrency(t.total_amount)}</td>
                <td className="p-4 text-[var(--primary)]">{formatCurrency(t.commission_amount)}</td>
                <td className="p-4 text-green-500">{formatCurrency(t.owner_amount)}</td>
                <td className="p-4 capitalize">{t.status?.replace('_', ' ')}</td>
                <td className="p-4 text-[var(--muted)]">{formatDate(t.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </DashboardLayout>
  );
}
