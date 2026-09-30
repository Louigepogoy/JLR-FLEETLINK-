'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ImagePlus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import {
  apiErrorMessage, CHAT_IMAGE_MAX_BYTES, CHAT_IMAGE_TYPES, CHAT_VIDEO_MAX_BYTES, CHAT_VIDEO_TYPES,
} from '@/lib/chat';

const MAX_FILES = 5;

type Evidence = { file: File; preview: string; kind: 'image' | 'video' };

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

  // Every preview object URL created, freed when the modal closes.
  const previewUrls = useRef<string[]>([]);
  useEffect(() => {
    const urls = previewUrls.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const added: Evidence[] = [];
    for (const file of Array.from(files)) {
      if (evidence.length + added.length >= MAX_FILES) {
        toast.error(`You can attach up to ${MAX_FILES} files`);
        break;
      }
      const kind = CHAT_VIDEO_TYPES.includes(file.type) ? 'video' : CHAT_IMAGE_TYPES.includes(file.type) ? 'image' : null;
      if (!kind) {
        toast.error(`${file.name}: only JPEG, PNG, WebP photos or MP4, WebM, MOV videos`);
        continue;
      }
      if (file.size > (kind === 'video' ? CHAT_VIDEO_MAX_BYTES : CHAT_IMAGE_MAX_BYTES)) {
        toast.error(`${file.name} is too large (max ${kind === 'video' ? '50' : '5'} MB)`);
        continue;
      }
      const preview = URL.createObjectURL(file);
      previewUrls.current.push(preview);
      added.push({ file, preview, kind });
    }
    setEvidence((prev) => [...prev, ...added]);
  };

  const removeFile = (index: number) => {
    setEvidence((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = async () => {
    if (reason.trim().length < 5) {
      toast.error('Please describe the problem');
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
          Photos or videos <span className="text-[var(--muted)]">(optional, up to {MAX_FILES} — helps the admin decide)</span>
        </label>
        <div className="flex flex-wrap gap-3">
          {evidence.map((e, i) => (
            <div key={e.preview} className="relative">
              {e.kind === 'video' ? (
                <video src={e.preview} muted className="h-20 w-20 rounded-lg bg-black object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={e.preview} alt="Evidence" className="h-20 w-20 rounded-lg object-cover" />
              )}
              <button
                onClick={() => removeFile(i)}
                className="absolute -right-2 -top-2 rounded-full bg-black/70 p-0.5 text-white"
                aria-label="Remove file"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {evidence.length < MAX_FILES && (
            <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-[var(--card-border)] text-xs text-[var(--muted)] hover:border-[var(--primary)]">
              <ImagePlus className="h-5 w-5" />
              Add
              <input
                type="file"
                multiple
                accept={[...CHAT_IMAGE_TYPES, ...CHAT_VIDEO_TYPES].join(',')}
                className="hidden"
                onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
              />
            </label>
          )}
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">Photos up to 5 MB, videos up to 50 MB.</p>

        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onClose} className="btn-outline text-sm" disabled={submitting}>Cancel</button>
          <button
            onClick={submit}
            className="rounded-xl bg-red-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50"
            disabled={submitting}
          >
            {submitting ? 'Sending...' : 'Reject Vehicle'}
          </button>
        </div>
      </div>
    </div>
  );
}
