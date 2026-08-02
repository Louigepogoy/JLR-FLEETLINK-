'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Receipt } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import EmptyState from '@/components/ui/EmptyState';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

type Transaction = {
  id: string;
  invoice_number: string;
  vehicle_title: string;
  total_amount: number;
  status: string;
  created_at: string;
  perspective?: 'renter' | 'provider';
};

export default function TransactionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    api.get('/transactions').then((res) => setTransactions(res.data.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <DashboardLayout role="user">
        <div className="skeleton h-8 w-56 mb-6" />
        <div className="skeleton h-64 rounded-2xl" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="user">
      <h2 className="text-2xl font-bold mb-6">Transaction History</h2>
      {transactions.length === 0 ? (
        <EmptyState icon={Receipt} title="No transactions yet" description="Your renter payments and provider earnings will show up here." />
      ) : (
      <div className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--card-border)]">
              <th className="text-left p-4">Invoice</th>
              <th className="text-left p-4">Vehicle</th>
              <th className="text-left p-4">As</th>
              <th className="text-left p-4">Amount</th>
              <th className="text-left p-4">Status</th>
              <th className="text-left p-4">Date</th>
              <th className="text-left p-4">Receipt</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id} className="border-b border-[var(--card-border)] hover:bg-[var(--primary)]/5">
                <td className="p-4 font-mono text-xs">{t.invoice_number}</td>
                <td className="p-4">{t.vehicle_title}</td>
                <td className="p-4">
                  {t.perspective && (
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                      t.perspective === 'renter' ? 'bg-sky-500/20 text-sky-500' : 'bg-violet-500/20 text-violet-500'
                    }`}>
                      {t.perspective}
                    </span>
                  )}
                </td>
                <td className="p-4 font-semibold">{formatCurrency(t.total_amount)}</td>
                <td className="p-4 capitalize">{t.status?.replace('_', ' ')}</td>
                <td className="p-4 text-[var(--muted)]">{formatDate(t.created_at)}</td>
                <td className="p-4">
                  <button
                    onClick={() => router.push(`/dashboard/receipt/${t.invoice_number}`)}
                    className="text-[var(--primary)] hover:underline flex items-center gap-1 text-sm"
                  >
                    <FileText className="h-4 w-4" /> View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </DashboardLayout>
  );
}
