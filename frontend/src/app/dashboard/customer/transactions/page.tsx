'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function CustomerTransactionsPage() {
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    api.get('/transactions').then((res) => setTransactions(res.data.data)).catch(() => {});
  }, []);

  return (
    <DashboardLayout role="customer">
      <h2 className="text-2xl font-bold mb-6">Transaction History</h2>
      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--card-border)]">
              <th className="text-left p-4">Invoice</th>
              <th className="text-left p-4">Vehicle</th>
              <th className="text-left p-4">Amount</th>
              <th className="text-left p-4">Status</th>
              <th className="text-left p-4">Date</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t: { id: string; invoice_number: string; vehicle_title: string; total_amount: number; status: string; created_at: string }) => (
              <tr key={t.id} className="border-b border-[var(--card-border)] hover:bg-[var(--primary)]/5">
                <td className="p-4 font-mono text-xs">{t.invoice_number}</td>
                <td className="p-4">{t.vehicle_title}</td>
                <td className="p-4 font-semibold">{formatCurrency(t.total_amount)}</td>
                <td className="p-4 capitalize">{t.status?.replace('_', ' ')}</td>
                <td className="p-4 text-[var(--muted)]">{formatDate(t.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {transactions.length === 0 && <p className="text-center py-12 text-[var(--muted)]">No transactions yet</p>}
      </div>
    </DashboardLayout>
  );
}
