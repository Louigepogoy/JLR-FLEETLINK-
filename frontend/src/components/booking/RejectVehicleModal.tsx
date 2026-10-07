'use client';

import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { apiErrorMessage } from '@/lib/chat';
import EvidencePicker, { type Evidence } from './EvidencePicker';

const MAX_FILES = 5;

type RejectVehicleModalProps = {
  bookingId: string;
  vehicleTitle: string;
  onClose: () => void;
  onRejected: () => void;
};

export default function RejectVehicleModal({ bookingId, vehicleTitle, onClose, onRejected }: RejectVehicleModalProps) {
  const [reason, setReason] = useState('');
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (reason.trim().length < 5) {
      toast.error('Please describe the problem');
      return;
    }
    if (!evidence.length) {
      toast.error('Attach at least one photo or video of the problem as proof');
      return;
    }
    setSubmitting(true);
    try {
      const data = new FormData();
      data.append('reason', reason.trim());
      evidence.forEach((e) => data.append('evidence', e.file));
      await api.post(`/bookings/${bookingId}/inspection/reject`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Problem reported. Your payment is on hold while an admin reviews it.');
      onRejected();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not report the problem'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="glass-card max-h-[90vh] w-full max-w-lg overflow-y-auto p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-500/10 p-2 text-red-500">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Reject {vehicleTitle}</h3>
              <p className="text-sm text-[var(--muted)]">
                Your booking will be cancelled — give the keys back to the owner. The owner won&apos;t be paid while an admin reviews it, and you may get a full or partial refund.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-[var(--primary)]/10" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <label className="mb-2 block text-sm font-medium">What&apos;s wrong?</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          maxLength={2000}
          className="input-field resize-none text-sm"
          placeholder="e.g. The car is a different color, has a big dent, and the aircon doesn't work — not like the listing photos."
        />

        <label className="mb-2 mt-4 block text-sm font-medium">
          Photos or videos <span className="text-red-500">*</span>{' '}
          <span className="text-[var(--muted)]">(required proof, up to {MAX_FILES})</span>
        </label>
        <p className="mb-3 text-xs text-[var(--muted)]">
          Refunds are only given with proof. Show the problem clearly — e.g. the dent, the wrong color, the plate number.
        </p>
        <EvidencePicker evidence={evidence} onChange={setEvidence} max={MAX_FILES} />

        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onClose} className="btn-outline text-sm" disabled={submitting}>Cancel</button>
          <button
            onClick={submit}
            className="rounded-xl bg-red-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50"
            disabled={submitting || !evidence.length}
          >
            {submitting ? 'Sending...' : 'Reject Vehicle'}
          </button>
        </div>
      </div>
    </div>
  );
}
