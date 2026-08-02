'use client';

import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import EmptyState from '@/components/ui/EmptyState';
import api from '@/lib/api';

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
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<LoginLog[]>([]);

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
      <h2 className="text-2xl font-bold mb-6">Login Logs</h2>
      {logs.length === 0 ? (
        <EmptyState icon={History} title="No login attempts recorded yet" />
      ) : (
      <div className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--card-border)]">
              <th className="text-left p-4">Email</th>
              <th className="text-left p-4">Result</th>
              <th className="text-left p-4">Reason</th>
              <th className="text-left p-4">IP Address</th>
              <th className="text-left p-4">When</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </DashboardLayout>
  );
}
