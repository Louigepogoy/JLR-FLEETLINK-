'use client';

import { useState } from 'react';
import { Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { apiErrorMessage } from '@/lib/chat';
import EvidencePicker, { type Evidence } from './EvidencePicker';

const MAX_TOTAL = 10;

type Props = {
  disputeId: string;
  existingCount: number;
  onAdded: () => void;
};

/** Lets the renter send more photo/video proof for their open dispute (e.g. when the admin asks). */
export default function AddDisputeEvidence({ disputeId, existingCount, onAdded }: Props) {
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [sending, setSending] = useState(false);
  const room = Math.max(0, MAX_TOTAL - existingCount);

  if (room === 0) return null;

  const send = async () => {
    if (!evidence.length) return;
    setSending(true);
    try {
      const data = new FormData();
      evidence.forEach((e) => data.append('evidence', e.file));
      await api.post(`/disputes/${disputeId}/evidence`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Evidence sent to the admin');
      setEvidence([]);
      onAdded();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not send the evidence'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-3">
      <p className="mb-2 text-sm font-medium">Add more photos or videos</p>
      <EvidencePicker evidence={evidence} onChange={setEvidence} max={Math.min(5, room)} />
      {evidence.length > 0 && (
        <button onClick={send} disabled={sending} className="btn-primary mt-3 flex items-center gap-2 text-sm">
          <Upload className="h-4 w-4" /> {sending ? 'Sending...' : `Send ${evidence.length} file${evidence.length > 1 ? 's' : ''}`}
        </button>
      )}
    </div>
  );
}
