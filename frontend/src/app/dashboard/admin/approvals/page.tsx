'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, IdCard, Camera, User } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface PendingUser {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: string;
  license_number: string;
  license_image_url: string;
  selfie_image_url: string;
  created_at: string;
}

export default function AdminApprovalsPage() {
  const [pending, setPending] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PendingUser | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  const fetchPending = () => {
    setLoading(true);
    api.get('/users/pending')
      .then((res) => setPending(res.data.data))
      .catch(() => toast.error('Failed to load pending registrations'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPending(); }, []);

  const handleApprove = async (id: string) => {
    try {
      await api.patch(`/users/${id}/approve`);
      toast.success('Account approved!');
      setSelected(null);
      fetchPending();
    } catch {
      toast.error('Failed to approve');
    }
  };

  const handleReject = async () => {
    if (!selected || !rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    try {
      await api.patch(`/users/${selected.id}/reject`, { reason: rejectReason });
      toast.success('Registration rejected');
      setShowRejectModal(false);
      setSelected(null);
      setRejectReason('');
      fetchPending();
    } catch {
      toast.error('Failed to reject');
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Identity Verifications</h2>
          <p className="text-sm text-[var(--muted)]">Review license and selfie submissions for identity verification</p>
        </div>
        <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-500 text-sm font-medium">
          {pending.length} pending
        </span>
      </div>

      {loading ? (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
          </div>
          <div className="skeleton h-96 rounded-2xl" />
        </div>
      ) : pending.length === 0 ? (
        <div className="glass-card p-12 text-center text-[var(--muted)]">No pending registrations</div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            {pending.map((user) => (
              <motion.button
                key={user.id}
                onClick={() => setSelected(user)}
                className={`w-full text-left glass-card p-4 transition-all ${
                  selected?.id === user.id ? 'ring-2 ring-[var(--primary)]' : ''
                }`}
                whileHover={{ scale: 1.01 }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center text-white font-bold">
                    {user.full_name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold">{user.full_name}</p>
                    <p className="text-xs text-[var(--muted)]">{user.email} · <span className="capitalize">{user.role}</span></p>
                    <p className="text-xs text-[var(--muted)]">License: {user.license_number}</p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="glass-card p-6 sticky top-24"
              >
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" /> {selected.full_name}
                </h3>

                <div className="space-y-2 text-sm mb-6">
                  <p><span className="text-[var(--muted)]">Email:</span> {selected.email}</p>
                  <p><span className="text-[var(--muted)]">Phone:</span> {selected.phone}</p>
                  <p><span className="text-[var(--muted)]">Role:</span> <span className="capitalize">{selected.role}</span></p>
                  <p><span className="text-[var(--muted)]">License #:</span> {selected.license_number}</p>
                  <p><span className="text-[var(--muted)]">Submitted:</span> {formatDate(selected.created_at)}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-xs font-medium mb-2 flex items-center gap-1"><IdCard className="w-3 h-3" /> Driver&apos;s License</p>
                    <a href={selected.license_image_url} target="_blank" rel="noopener noreferrer"
                      className="block aspect-video rounded-xl overflow-hidden border border-[var(--card-border)] bg-black/5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={selected.license_image_url} alt="License" className="w-full h-full object-contain" />
                    </a>
                  </div>
                  <div>
                    <p className="text-xs font-medium mb-2 flex items-center gap-1"><Camera className="w-3 h-3" /> Live Selfie</p>
                    <a href={selected.selfie_image_url} target="_blank" rel="noopener noreferrer"
                      className="block aspect-video rounded-xl overflow-hidden border border-[var(--card-border)] bg-black/5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={selected.selfie_image_url} alt="Selfie" className="w-full h-full object-contain" />
                    </a>
                  </div>
                </div>

                <p className="text-xs text-[var(--muted)] mb-4 p-3 rounded-lg bg-[var(--primary)]/5">
                  Verify that the selfie shows the person holding their license and matches the license photo before approving.
                </p>

                <div className="flex gap-3">
                  <button onClick={() => handleApprove(selected.id)}
                    className="btn-primary flex-1 flex items-center justify-center gap-2 py-3">
                    <Check className="w-4 h-4" /> Approve
                  </button>
                  <button onClick={() => setShowRejectModal(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-red-500/50 text-red-500 hover:bg-red-500/10">
                    <X className="w-4 h-4" /> Reject
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="glass-card p-12 text-center text-[var(--muted)]">
                Select a registration to review documents
              </div>
            )}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {showRejectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowRejectModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="glass-card p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-bold mb-4">Reject Registration</h3>
              <textarea
                className="input-field mb-4"
                rows={4}
                placeholder="Reason for rejection (shown to user)..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <div className="flex gap-3">
                <button onClick={() => setShowRejectModal(false)} className="btn-outline flex-1">Cancel</button>
                <button onClick={handleReject} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-medium">
                  Confirm Reject
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
