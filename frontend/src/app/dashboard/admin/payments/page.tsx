'use client';

import { useEffect, useState } from 'react';
import { CreditCard, Undo2 } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { IconChip, CardIcon } from '@/components/illustrations/MiniIcons';
import EmptyState from '@/components/ui/EmptyState';
import Pagination, { usePagination } from '@/components/ui/Pagination';
import api from '@/lib/api';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

type AdminTransaction = {
  id: string; type: string; invoice_number: string; vehicle_title: string;
  customer_name: string; owner_name: string; description: string | null;
  total_amount: number; commission_amount: number; owner_amount: number;
  status: string; created_at: string;
};

type Tab = 'all' | 'refunds';

export default function AdminPaymentsPage() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [tab, setTab] = useState<Tab>('all');

  useEffect(() => {
    api.get('/transactions').then((res) => setTransactions(res.data.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // A refund is either its own 'refund' row (partial, or the full-refund record) or a payment later marked refunded.
  const refunds = transactions.filter((t) => t.type === 'refund');
  const totalRefunded = refunds.reduce((sum, t) => sum + Number(t.total_amount), 0);
  const rows = tab === 'refunds' ? refunds : transactions;
  const pager = usePagination(rows);

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
      <h2 className="text-2xl font-bold flex items-center gap-3 mb-6"><IconChip icon={CardIcon} className="h-10 w-10 rounded-xl" iconClassName="h-7 w-7" />Payment Monitoring</h2>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-1" role="tablist" aria-label="Payments view">
          {([['all', 'All Payments'], ['refunds', `Refunds (${refunds.length})`]] as const).map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => { setTab(key); pager.setPage(1); }}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                tab === key ? 'gradient-bg text-white shadow' : 'text-[var(--muted)] hover:text-[var(--foreground)]'
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === 'refunds' && refunds.length > 0 && (
          <p className="text-sm">
            <span className="text-[var(--muted)]">Total refunded: </span>
            <span className="font-bold text-red-500">{formatCurrency(totalRefunded)}</span>
          </p>
        )}
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={tab === 'refunds' ? Undo2 : CreditCard} title={tab === 'refunds' ? 'No refunds yet' : 'No transactions found'} />
      ) : tab === 'refunds' ? (
      <>
      <div className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--card-border)]">
              <th className="text-left p-4">Invoice</th>
              <th className="text-left p-4">Vehicle</th>
              <th className="text-left p-4">Customer</th>
              <th className="text-left p-4">Owner</th>
              <th className="text-left p-4">Refunded</th>
              <th className="text-left p-4">Reason</th>
              <th className="text-left p-4">Date</th>
            </tr>
          </thead>
          <tbody>
            {pager.pageItems.map((t) => (
              <tr key={t.id} className="border-b border-[var(--card-border)] hover:bg-[var(--primary)]/5">
                <td className="p-4 font-mono text-xs">{t.invoice_number}</td>
                <td className="p-4">{t.vehicle_title}</td>
                <td className="p-4">{t.customer_name}</td>
                <td className="p-4">{t.owner_name}</td>
                <td className="p-4 font-semibold text-red-500 whitespace-nowrap">{formatCurrency(t.total_amount)}</td>
                <td className="p-4 text-[var(--muted)] max-w-xs">{t.description || '-'}</td>
                <td className="p-4 text-[var(--muted)] whitespace-nowrap">{formatDate(t.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination pager={pager} />
      </>
      ) : (
      <>
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
            {pager.pageItems.map((t) => (
              <tr key={t.id} className="border-b border-[var(--card-border)] hover:bg-[var(--primary)]/5">
                <td className="p-4 font-mono text-xs">{t.invoice_number}</td>
                <td className="p-4">{t.vehicle_title}</td>
                <td className="p-4">{formatCurrency(t.total_amount)}</td>
                <td className="p-4 text-[var(--primary)]">{formatCurrency(t.commission_amount)}</td>
                <td className="p-4 text-green-500">{formatCurrency(t.owner_amount)}</td>
                <td className="p-4 capitalize">
                  {t.type === 'refund' ? (
                    <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs text-red-500">Refund</span>
                  ) : t.status?.replace('_', ' ')}
                </td>
                <td className="p-4 text-[var(--muted)]">{formatDate(t.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination pager={pager} />
      </>
      )}
    </DashboardLayout>
  );
}
