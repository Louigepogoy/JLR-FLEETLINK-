'use client';

import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

type ReportModalProps = {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  reportedUserId: string;
  reportedName: string;
};

const reasons = [
  'Late handoff or return',
  'Payment issue',
  'Vehicle condition issue',
  'Rude or unsafe behavior',
  'No-show',
  'Other concern',
];

export default function ReportModal({
  isOpen,
  onClose,
  bookingId,
  reportedUserId,
  reportedName,
}: ReportModalProps) {
  const [reason, setReason] = useState(reasons[0]);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const submitReport = async () => {
    if (description.trim().length < 10) {
      toast.error('Please add more details about the report');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/reports', {
        bookingId,
        reportedUserId,
        reason,
        description,
      });
      toast.success('Report sent to admin');
      setDescription('');
      setReason(reasons[0]);
      onClose();
    } catch (error: unknown) {
      const message = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
      toast.error(message || 'Failed to send report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="glass-card w-full max-w-lg p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-500/10 p-2 text-red-500">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Report {reportedName}</h3>
              <p className="text-sm text-[var(--muted)]">Admin will review this report.</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-[var(--primary)]/10" aria-label="Close report modal">
            <X className="h-5 w-5" />
          </button>
        </div>

        <label className="mb-2 block text-sm font-medium">Reason</label>
        <select
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="input-field mb-4 text-sm"
        >
          {reasons.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>

        <label className="mb-2 block text-sm font-medium">Details</label>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={5}
          className="input-field resize-none text-sm"
          placeholder="Describe what happened..."
        />

        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onClose} className="btn-outline text-sm" disabled={submitting}>Cancel</button>
          <button onClick={submitReport} className="btn-primary text-sm" disabled={submitting}>
            {submitting ? 'Sending...' : 'Send Report'}
          </button>
        </div>
      </div>
    </div>
  );
}
