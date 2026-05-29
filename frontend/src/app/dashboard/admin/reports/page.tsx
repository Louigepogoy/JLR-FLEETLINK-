'use client';

import { useEffect, useMemo, useState } from 'react';
import { Flag, MessageSquareText } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';

type Report = {
  id: string;
  reason: string;
  description: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  admin_notes?: string;
  created_at: string;
  start_date?: string;
  end_date?: string;
  vehicle_title?: string;
  reporter_name: string;
  reporter_email: string;
  reporter_role: string;
  reported_name: string;
  reported_email: string;
  reported_role: string;
};

const statusClasses: Record<Report['status'], string> = {
  pending: 'bg-amber-500/20 text-amber-500',
  reviewed: 'bg-blue-500/20 text-blue-500',
  resolved: 'bg-green-500/20 text-green-500',
  dismissed: 'bg-gray-500/20 text-gray-500',
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [notesById, setNotesById] = useState<Record<string, string>>({});

  const fetchReports = () => {
    api.get('/reports').then((res) => setReports(res.data.data)).catch(() => {});
  };

  useEffect(() => { fetchReports(); }, []);

  const filteredReports = useMemo(() => (
    selectedStatus === 'all'
      ? reports
      : reports.filter((report) => report.status === selectedStatus)
  ), [reports, selectedStatus]);

  const updateStatus = async (id: string, status: Report['status']) => {
    try {
      await api.patch(`/reports/${id}/status`, {
        status,
        adminNotes: notesById[id],
      });
      toast.success('Report updated');
      fetchReports();
    } catch {
      toast.error('Failed to update report');
    }
  };

  const counts = {
    all: reports.length,
    pending: reports.filter((report) => report.status === 'pending').length,
    resolved: reports.filter((report) => report.status === 'resolved').length,
  };

  return (
    <DashboardLayout role="admin">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">User Reports</h2>
          <p className="text-sm text-[var(--muted)]">Reports submitted by customers and owners.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {['all', 'pending', 'reviewed', 'resolved', 'dismissed'].map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`rounded-lg border px-3 py-2 text-sm capitalize transition-colors ${
                selectedStatus === status
                  ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]'
                  : 'border-[var(--card-border)] text-[var(--muted)] hover:bg-[var(--primary)]/10'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="glass-card p-5">
          <Flag className="mb-3 h-6 w-6 text-[var(--primary)]" />
          <p className="text-2xl font-bold">{counts.all}</p>
          <p className="text-sm text-[var(--muted)]">Total Reports</p>
        </div>
        <div className="glass-card p-5">
          <MessageSquareText className="mb-3 h-6 w-6 text-amber-500" />
          <p className="text-2xl font-bold">{counts.pending}</p>
          <p className="text-sm text-[var(--muted)]">Pending Review</p>
        </div>
        <div className="glass-card p-5">
          <Flag className="mb-3 h-6 w-6 text-green-500" />
          <p className="text-2xl font-bold">{counts.resolved}</p>
          <p className="text-sm text-[var(--muted)]">Resolved</p>
        </div>
      </div>

      <div className="space-y-4">
        {filteredReports.map((report) => (
          <div key={report.id} className="glass-card p-6">
            <div className="flex flex-wrap justify-between gap-4">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{report.reason}</h3>
                  <span className={`rounded-full px-2 py-1 text-xs capitalize ${statusClasses[report.status]}`}>
                    {report.status}
                  </span>
                </div>
                <p className="text-sm text-[var(--muted)]">
                  {report.reporter_name} ({report.reporter_role}) reported {report.reported_name} ({report.reported_role})
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {report.reporter_email} to {report.reported_email}
                </p>
              </div>
              <div className="text-sm text-[var(--muted)] md:text-right">
                <p>{formatDate(report.created_at)}</p>
                {report.vehicle_title && (
                  <p>{report.vehicle_title} - {formatDate(report.start_date || '')} to {formatDate(report.end_date || '')}</p>
                )}
              </div>
            </div>

            <p className="mt-4 rounded-lg border border-[var(--card-border)] p-4 text-sm">{report.description}</p>

            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
              <textarea
                value={notesById[report.id] ?? report.admin_notes ?? ''}
                onChange={(event) => setNotesById((current) => ({ ...current, [report.id]: event.target.value }))}
                rows={2}
                className="resize-none rounded-lg border border-[var(--card-border)] bg-transparent px-3 py-2 text-sm"
                placeholder="Admin notes..."
              />
              <div className="flex flex-wrap gap-2 md:justify-end">
                {(['reviewed', 'resolved', 'dismissed'] as Report['status'][]).map((status) => (
                  <button
                    key={status}
                    onClick={() => updateStatus(report.id, status)}
                    className="btn-outline text-sm capitalize"
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}

        {filteredReports.length === 0 && (
          <div className="glass-card p-12 text-center text-[var(--muted)]">No reports found</div>
        )}
      </div>
    </DashboardLayout>
  );
}
