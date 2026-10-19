'use client';

import { useEffect, useState } from 'react';
import { ScrollText, Search } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { IconChip, HistoryIcon } from '@/components/illustrations/MiniIcons';
import EmptyState from '@/components/ui/EmptyState';
import Pagination, { usePagination } from '@/components/ui/Pagination';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

type AuditLog = {
  id: string;
  admin_name: string | null;
  action: string;
  target_type: string | null;
  target_label: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
};

const actionLabels: Record<string, { label: string; className: string }> = {
  force_logout: { label: 'Forced logout', className: 'bg-amber-500/15 text-amber-600' },
  user_activated: { label: 'User activated', className: 'bg-green-500/15 text-green-600' },
  user_deactivated: { label: 'User deactivated', className: 'bg-red-500/15 text-red-500' },
  role_changed: { label: 'Role changed', className: 'bg-violet-500/15 text-violet-500' },
  commission_changed: { label: 'Commission changed', className: 'bg-sky-500/15 text-sky-500' },
  inspection_window_changed: { label: 'Inspection time changed', className: 'bg-sky-500/15 text-sky-500' },
  payout_marked_paid: { label: 'Payout marked paid', className: 'bg-emerald-500/15 text-emerald-600' },
  dispute_resolved: { label: 'Dispute resolved', className: 'bg-orange-500/15 text-orange-600' },
};

const decisionLabels: Record<string, string> = {
  refunded: 'full refund',
  partially_refunded: 'partial refund',
  dismissed: 'dismissed (no refund)',
};

/** One readable line for the before/after values an action stored. */
function describe(log: AuditLog): string {
  const d = log.details || {};
  switch (log.action) {
    case 'role_changed': return `${d.from} → ${d.to}`;
    case 'commission_changed': return `${d.from}% → ${d.to}%${d.notes ? ` (${d.notes})` : ''}`;
    case 'inspection_window_changed': return `${d.to} minutes`;
    case 'payout_marked_paid': return `${formatCurrency(Number(d.amount) || 0)}${d.reference ? ` · ${d.reference}` : ''}`;
    case 'dispute_resolved':
      return `${decisionLabels[String(d.decision)] || d.decision}${d.refundAmount ? ` · ${formatCurrency(Number(d.refundAmount))}` : ''}${d.notes ? ` · ${d.notes}` : ''}`;
    default: return '';
  }
}

export default function AuditTrailPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/audit-logs').then((res) => setLogs(res.data.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const term = search.trim().toLowerCase();
  const filtered = term
    ? logs.filter((l) => `${l.admin_name} ${actionLabels[l.action]?.label || l.action} ${l.target_label} ${describe(l)}`.toLowerCase().includes(term))
    : logs;
  const pager = usePagination(filtered);

  return (
    <DashboardLayout role="admin">
      <h2 className="text-2xl font-bold flex items-center gap-3 mb-2"><IconChip icon={HistoryIcon} className="h-10 w-10 rounded-xl" iconClassName="h-7 w-7" />Audit Trail</h2>
      <p className="text-sm text-[var(--muted)] mb-6">Who did what: admin actions on users, money and platform settings.</p>

      <div className="relative mb-4 max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
        <input
          type="search"
          value={search}
          onChange={(e) => { setSearch(e.target.value); pager.setPage(1); }}
          placeholder="Search by admin, action or target"
          className="input-field pl-9 w-full"
        />
      </div>

      {loading ? (
        <div className="skeleton h-64 rounded-2xl" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={ScrollText} title={logs.length === 0 ? 'No admin actions recorded yet' : 'No matching actions'} />
      ) : (
        <>
          <div className="glass-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)]">
                  <th className="text-left p-4">When</th>
                  <th className="text-left p-4">Admin</th>
                  <th className="text-left p-4">Action</th>
                  <th className="text-left p-4">Target</th>
                  <th className="text-left p-4">Details</th>
                  <th className="text-left p-4">IP Address</th>
                </tr>
              </thead>
              <tbody>
                {pager.pageItems.map((l) => {
                  const a = actionLabels[l.action] || { label: l.action, className: 'bg-gray-500/15 text-gray-500' };
                  return (
                    <tr key={l.id} className="border-b border-[var(--card-border)] hover:bg-[var(--primary)]/5">
                      <td className="p-4 text-[var(--muted)] whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</td>
                      <td className="p-4 font-medium">{l.admin_name || 'Unknown'}</td>
                      <td className="p-4"><span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${a.className}`}>{a.label}</span></td>
                      <td className="p-4">{l.target_label || '-'}</td>
                      <td className="p-4 text-[var(--muted)]">{describe(l) || '-'}</td>
                      <td className="p-4 text-[var(--muted)]">{l.ip_address || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination pager={pager} />
        </>
      )}
    </DashboardLayout>
  );
}
