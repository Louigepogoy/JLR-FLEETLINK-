'use client';

import { useEffect, useState } from 'react';
import { LifeBuoy, Send } from 'lucide-react';
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
};

const statusClasses: Record<Ticket['status'], string> = {
  open: 'bg-amber-500/20 text-amber-500',
  in_progress: 'bg-blue-500/20 text-blue-500',
  resolved: 'bg-green-500/20 text-green-500',
  closed: 'bg-gray-500/20 text-gray-500',
};

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchTickets = () =>
    api.get('/support/mine').then((res) => setTickets(res.data.data)).catch(() => {}).finally(() => setLoading(false));

  useEffect(() => { fetchTickets(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.message.trim()) {
      toast.error('Please fill in both fields');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/support', form);
      toast.success('Support ticket submitted');
      setForm({ subject: '', message: '' });
      fetchTickets();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; errors?: { msg: string }[] } } };
      toast.error(error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || 'Failed to submit ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout role="user">
      <div className="mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2"><LifeBuoy className="w-6 h-6 text-[var(--primary)]" /> Support</h2>
        <p className="text-sm text-[var(--muted)]">Have a question or an issue? Send us a message and we&apos;ll get back to you.</p>
      </div>

      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6">
        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4 h-fit">
          <div>
            <label className="text-sm font-medium">Subject</label>
            <input
              className="input-field mt-1"
              placeholder="e.g. Payment didn't go through"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Message</label>
            <textarea
              className="input-field mt-1"
              rows={6}
              placeholder="Describe your issue or question..."
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full flex items-center justify-center gap-2">
            <Send className="w-4 h-4" /> {submitting ? 'Submitting...' : 'Submit Ticket'}
          </button>
        </form>

        <div className="space-y-4">
          {loading ? (
            <>
              <div className="skeleton h-32 rounded-2xl" />
              <div className="skeleton h-32 rounded-2xl" />
            </>
          ) : tickets.length === 0 ? (
            <div className="glass-card p-8 text-center text-[var(--muted)]">No support tickets yet</div>
          ) : (
            tickets.map((ticket) => (
              <div key={ticket.id} className="glass-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <h3 className="font-semibold">{ticket.subject}</h3>
                  <span className={`rounded-full px-2 py-1 text-xs capitalize ${statusClasses[ticket.status]}`}>
                    {ticket.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-xs text-[var(--muted)] mb-3">{formatDate(ticket.created_at)}</p>
                <p className="text-sm">{ticket.message}</p>
                {ticket.admin_response && (
                  <div className="mt-3 rounded-lg bg-[var(--primary)]/5 p-3 text-sm">
                    <p className="mb-1 text-xs font-semibold text-[var(--primary)]">Support team response</p>
                    {ticket.admin_response}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
