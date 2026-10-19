'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { History, LogOut, Search } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { IconChip, HistoryIcon } from '@/components/illustrations/MiniIcons';
import EmptyState from '@/components/ui/EmptyState';
import api from '@/lib/api';
import { apiErrorMessage } from '@/lib/chat';
import { useAuthStore } from '@/store/authStore';

const PAGE_SIZE = 15;

interface LoginLog {
  id: string;
  user_id: string | null;
  email: string;
  success: boolean;
  reason: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

const reasonLabels: Record<string, string> = {
  success: 'Signed in',
  invalid_email: 'No account with this email',
  invalid_password: 'Wrong password',
  pending_approval: 'Account pending approval',
  registration_rejected: 'Registration rejected',
  inactive: 'Account deactivated',
};

export default function LoginLogsPage() {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<LoginLog[]>([]);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const forceLogout = async (log: LoginLog) => {
    if (!log.user_id || !confirm(`Log out ${log.email} from all devices?`)) return;
    try {
      await api.post(`/users/${log.user_id}/force-logout`);
      toast.success(`${log.email} was logged out`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not log out this user'));
    }
  };

  const term = search.trim().toLowerCase();
  const filtered = term
    ? logs.filter((l) => `${l.email} ${reasonLabels[l.reason] || l.reason} ${l.ip_address || ''}`.toLowerCase().includes(term))
    : logs;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageLogs = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    api.get('/auth/login-logs').then((res) => setLogs(res.data.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <DashboardLayout role="admin">
        <div className="skeleton h-8 w-40 mb-6" />
        <div className="skeleton h-64 rounded-2xl" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin">
      <h2 className="text-2xl font-bold flex items-center gap-3 mb-6"><IconChip icon={HistoryIcon} className="h-10 w-10 rounded-xl" iconClassName="h-7 w-7" />Login Logs</h2>
      <div className="relative mb-4 max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
        <input
          type="search"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by email, reason or IP"
          className="input-field !pl-10 w-full"
        />
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon={History} title={logs.length === 0 ? 'No login attempts recorded yet' : 'No matching logs'} />
      ) : (
      <>
      <div className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--card-border)]">
              <th className="text-left p-4">Email</th>
              <th className="text-left p-4">Result</th>
              <th className="text-left p-4">Reason</th>
              <th className="text-left p-4">IP Address</th>
              <th className="text-left p-4">When</th>
              <th className="text-left p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageLogs.map((log) => (
              <tr key={log.id} className="border-b border-[var(--card-border)] hover:bg-[var(--primary)]/5">
                <td className="p-4 font-medium">{log.email}</td>
                <td className="p-4">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    log.success ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                  }`}>
                    {log.success ? 'Success' : 'Failed'}
                  </span>
                </td>
                <td className="p-4 text-[var(--muted)]">{reasonLabels[log.reason] || log.reason}</td>
                <td className="p-4 text-[var(--muted)]">{log.ip_address || '-'}</td>
                <td className="p-4 text-[var(--muted)]">{new Date(log.created_at).toLocaleString()}</td>
                <td className="p-4 whitespace-nowrap">
                  {log.user_id && log.user_id !== currentUserId && (
                    <button onClick={() => forceLogout(log)} className="text-xs btn-outline py-1 px-3 inline-flex items-center gap-1">
                      <LogOut className="w-3 h-3" /> Log out
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between mt-4 text-sm text-[var(--muted)]">
        <span>
          Showing {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
        </span>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage(currentPage - 1)} disabled={currentPage <= 1} className="btn-outline text-xs py-1 px-3 disabled:opacity-40">Previous</button>
          <span>Page {currentPage} of {totalPages}</span>
          <button onClick={() => setPage(currentPage + 1)} disabled={currentPage >= totalPages} className="btn-outline text-xs py-1 px-3 disabled:opacity-40">Next</button>
        </div>
      </div>
      </>
      )}
    </DashboardLayout>
  );
}
