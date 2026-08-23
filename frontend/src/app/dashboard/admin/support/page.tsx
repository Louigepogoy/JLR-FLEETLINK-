'use client';

import { useEffect, useMemo, useState } from 'react';
import { LifeBuoy, MessageSquareText } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';

type Ticket = {
  id: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  admin_response?: string;
  created_at: string;
  user_name: string;
  user_email: string;
};

const statusClasses: Record<Ticket['status'], string> = {
  open: 'bg-amber-500/20 text-amber-500',
  in_progress: 'bg-blue-500/20 text-blue-500',
  resolved: 'bg-green-500/20 text-green-500',
  closed: 'bg-gray-500/20 text-gray-500',
};

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [responseById, setResponseById] = useState<Record<string, string>>({});

  const fetchTickets = () => {
    api.get('/support').then((res) => setTickets(res.data.data)).catch(() => toast.error('Failed to load support tickets'));
  };

  useEffect(() => { fetchTickets(); }, []);

  const filteredTickets = useMemo(() => (
    selectedStatus === 'all' ? tickets : tickets.filter((t) => t.status === selectedStatus)
  ), [tickets, selectedStatus]);

  const counts = {
    all: tickets.length,
    open: tickets.filter((t) => t.status === 'open').length,
    resolved: tickets.filter((t) => t.status === 'resolved').length,
  };

  const respond = async (id: string, status: Ticket['status']) => {
    const response = responseById[id]?.trim();
    if (!response) {
      toast.error('Write a response before updating status');
      return;
    }
    try {
      await api.patch(`/support/${id}/respond`, { response, status });
      toast.success('Response sent');
      fetchTickets();
    } catch {
      toast.error('Failed to send response');
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Support Tickets</h2>
          <p className="text-sm text-[var(--muted)]">General customer support inquiries.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {['all', 'open', 'in_progress', 'resolved', 'closed'].map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`rounded-lg border px-3 py-2 text-sm capitalize transition-colors ${
                selectedStatus === status
                  ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]'
                  : 'border-[var(--card-border)] text-[var(--muted)] hover:bg-[var(--primary)]/10'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="glass-card p-5">
          <LifeBuoy className="mb-3 h-6 w-6 text-[var(--primary)]" />
          <p className="text-2xl font-bold">{counts.all}</p>
          <p className="text-sm text-[var(--muted)]">Total Tickets</p>
        </div>
        <div className="glass-card p-5">
          <MessageSquareText className="mb-3 h-6 w-6 text-amber-500" />
          <p className="text-2xl font-bold">{counts.open}</p>
          <p className="text-sm text-[var(--muted)]">Open</p>
        </div>
        <div className="glass-card p-5">
          <LifeBuoy className="mb-3 h-6 w-6 text-green-500" />
          <p className="text-2xl font-bold">{counts.resolved}</p>
          <p className="text-sm text-[var(--muted)]">Resolved</p>
        </div>
      </div>

      <div className="space-y-4">
        {filteredTickets.map((ticket) => (
          <div key={ticket.id} className="glass-card p-6">
            <div className="flex flex-wrap justify-between gap-4">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{ticket.subject}</h3>
                  <span className={`rounded-full px-2 py-1 text-xs capitalize ${statusClasses[ticket.status]}`}>
                    {ticket.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-sm text-[var(--muted)]">{ticket.user_name} · {ticket.user_email}</p>
              </div>
              <p className="text-sm text-[var(--muted)]">{formatDate(ticket.created_at)}</p>
            </div>

            <p className="mt-4 rounded-lg border border-[var(--card-border)] p-4 text-sm">{ticket.message}</p>

            {ticket.admin_response && (
              <div className="mt-3 rounded-lg bg-[var(--primary)]/5 p-4 text-sm">
                <p className="mb-1 text-xs font-semibold text-[var(--primary)]">Your last response</p>
                {ticket.admin_response}
              </div>
            )}

            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
              <textarea
                value={responseById[ticket.id] ?? ''}
                onChange={(event) => setResponseById((current) => ({ ...current, [ticket.id]: event.target.value }))}
                rows={2}
                className="resize-none rounded-lg border border-[var(--card-border)] bg-transparent px-3 py-2 text-sm"
                placeholder="Write a response..."
              />
              <div className="flex flex-wrap gap-2 md:justify-end">
                {(['in_progress', 'resolved', 'closed'] as Ticket['status'][]).map((status) => (
                  <button
                    key={status}
                    onClick={() => respond(ticket.id, status)}
                    className="btn-outline text-sm capitalize"
                  >
                    {status.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}

        {filteredTickets.length === 0 && (
          <div className="glass-card p-12 text-center text-[var(--muted)]">No support tickets found</div>
        )}
      </div>
    </DashboardLayout>
  );
}
