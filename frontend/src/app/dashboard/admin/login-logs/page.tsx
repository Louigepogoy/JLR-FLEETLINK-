'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
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
  const [logs, setLogs] = useState<LoginLog[]>([]);

  useEffect(() => {
    api.get('/auth/login-logs').then((res) => setLogs(res.data.data)).catch(() => {});
  }, []);

  return (
    <DashboardLayout role="admin">
      <h2 className="text-2xl font-bold mb-6">Login Logs</h2>
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
              <tr key={log.id} className="border-b border-[var(--card-border)]">
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
        {logs.length === 0 && (
          <p className="p-6 text-center text-[var(--muted)]">No login attempts recorded yet.</p>
        )}
      </div>
    </DashboardLayout>
  );
}
