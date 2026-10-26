'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Crown } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { IconChip, CrownIcon } from '@/components/illustrations/MiniIcons';
import EmptyState from '@/components/ui/EmptyState';
import Pagination, { usePagination } from '@/components/ui/Pagination';
import api from '@/lib/api';
import { profilePath } from '@/lib/chat';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

type Subscription = {
  id: string;
  owner_id: string;
  owner_name: string;
  owner_email: string;
  plan_name: string;
  price: number | string;
  extra_vehicle_slots: number;
  payment_method: 'trial' | 'gcash' | 'card';
  payment_reference: string | null;
  card_last_four: string | null;
  starts_at: string;
  ends_at: string | null;
  status: string;
  is_current: boolean;
};

type Summary = { total_revenue: number; paid_count: number; active_count: number };

const methodLabel = (s: Subscription) =>
  s.payment_method === 'card' ? `Card${s.card_last_four ? ` ••${s.card_last_four}` : ''}`
    : s.payment_method === 'gcash' ? 'GCash' : 'Free trial';

/** What owners paid to subscribe to a plan (separate from booking payments in Payment Monitoring). */
export default function AdminSubscriptionsPage() {
  const [loading, setLoading] = useState(true);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [summary, setSummary] = useState<Summary>({ total_revenue: 0, paid_count: 0, active_count: 0 });
  const pager = usePagination(subs);

  useEffect(() => {
    api.get('/subscriptions/admin/all')
      .then((res) => { setSubs(res.data.data); setSummary(res.data.summary); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout role="admin">
      <h2 className="text-2xl font-bold flex items-center gap-3 mb-2">
        <IconChip icon={CrownIcon} className="h-10 w-10 rounded-xl" iconClassName="h-7 w-7" />Owner Subscriptions
      </h2>
      <p className="text-sm text-[var(--muted)] mb-6">Payments owners made to subscribe to a plan. Booking payments are in Payment Monitoring.</p>

      {loading ? (
        <div className="skeleton h-64 rounded-2xl" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3 mb-6">
            <div className="glass-card p-4">
              <p className="text-xs text-[var(--muted)]">Subscription revenue</p>
              <p className="text-2xl font-bold text-green-500">{formatCurrency(summary.total_revenue)}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs text-[var(--muted)]">Paid subscriptions</p>
              <p className="text-2xl font-bold">{summary.paid_count}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs text-[var(--muted)]">Active now</p>
              <p className="text-2xl font-bold">{summary.active_count}</p>
            </div>
          </div>

          {subs.length === 0 ? (
            <EmptyState icon={Crown} title="No subscriptions yet" description="Owner plan payments will show up here." />
          ) : (
            <>
              <div className="glass-card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--card-border)]">
                      <th className="text-left p-4">Owner</th>
                      <th className="text-left p-4">Plan</th>
                      <th className="text-left p-4">Paid</th>
                      <th className="text-left p-4">Method</th>
                      <th className="text-left p-4">Reference</th>
                      <th className="text-left p-4">Period</th>
                      <th className="text-left p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pager.pageItems.map((s) => (
                      <tr key={s.id} className="border-b border-[var(--card-border)] hover:bg-[var(--primary)]/5">
                        <td className="p-4">
                          <Link href={profilePath(s.owner_id)} className="font-medium hover:underline hover:text-[var(--primary)]">{s.owner_name}</Link>
                          <p className="text-xs text-[var(--muted)]">{s.owner_email}</p>
                        </td>
                        <td className="p-4">
                          {s.plan_name}
                          {s.extra_vehicle_slots > 0 && <p className="text-xs text-[var(--muted)]">+{s.extra_vehicle_slots} extra slot(s)</p>}
                        </td>
                        <td className="p-4 font-semibold whitespace-nowrap">{formatCurrency(s.price)}</td>
                        <td className="p-4">{methodLabel(s)}</td>
                        <td className="p-4 font-mono text-xs">{s.payment_reference || '-'}</td>
                        <td className="p-4 text-[var(--muted)] whitespace-nowrap">
                          {formatDate(s.starts_at)}{s.ends_at ? ` - ${formatDate(s.ends_at)}` : ''}
                        </td>
                        <td className="p-4">
                          <span className={cn(
                            'text-xs px-2 py-0.5 rounded-full capitalize',
                            s.is_current ? 'bg-green-500/20 text-green-500'
                              : s.status === 'cancelled' ? 'bg-gray-500/20 text-gray-500'
                              : 'bg-red-500/20 text-red-500'
                          )}>
                            {s.is_current ? 'Active' : s.status === 'active' ? 'Expired' : s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination pager={pager} />
            </>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
