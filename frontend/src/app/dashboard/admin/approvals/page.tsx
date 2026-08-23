'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Car, Check, HelpCircle, IdCard, User, X } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import AiRiskPanel, { type AiResult } from '@/components/dashboard/AiRiskPanel';
import ImageGallery from '@/components/vehicles/ImageGallery';
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
  ai_result: AiResult | null;
}

interface PendingVehicle {
  id: string;
  title: string;
  brand: string;
  model: string;
  vehicle_type: string;
  plate_number?: string;
  images: string[];
  owner_name: string;
  verification_status: string;
  created_at: string;
  ai_result: AiResult | null;
}

type ActionModal = { subject: 'license' | 'vehicle'; type: 'reject' | 'more-info'; id: string } | null;

export default function AdminApprovalsPage() {
  const [tab, setTab] = useState<'license' | 'vehicle'>('license');

  const [pending, setPending] = useState<PendingUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);

  const [pendingVehicles, setPendingVehicles] = useState<PendingVehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<PendingVehicle | null>(null);

  const [modal, setModal] = useState<ActionModal>(null);
  const [modalNotes, setModalNotes] = useState('');

  const fetchPending = () => {
    setLoadingUsers(true);
    api.get('/users/pending')
      .then((res) => setPending(res.data.data))
      .catch(() => toast.error('Failed to load pending registrations'))
      .finally(() => setLoadingUsers(false));
  };

  const fetchPendingVehicles = () => {
    setLoadingVehicles(true);
    api.get('/vehicles/admin/pending-verifications')
      .then((res) => setPendingVehicles(res.data.data))
      .catch(() => toast.error('Failed to load pending vehicle verifications'))
      .finally(() => setLoadingVehicles(false));
  };

  useEffect(() => { fetchPending(); fetchPendingVehicles(); }, []);

  const handleApproveUser = async (id: string) => {
    try {
      await api.patch(`/users/${id}/approve`);
      toast.success('Account approved!');
      setSelectedUser(null);
      fetchPending();
    } catch {
      toast.error('Failed to approve');
    }
  };

  const handleApproveVehicle = async (id: string) => {
    try {
      await api.patch(`/vehicles/${id}/verification`, { action: 'approved' });
      toast.success('Vehicle verified!');
      setSelectedVehicle(null);
      fetchPendingVehicles();
    } catch {
      toast.error('Failed to approve');
    }
  };

  const submitModal = async () => {
    if (!modal || !modalNotes.trim()) {
      toast.error(modal?.type === 'reject' ? 'Please provide a rejection reason' : 'Please describe what\'s needed');
      return;
    }
    try {
      if (modal.subject === 'license') {
        if (modal.type === 'reject') {
          await api.patch(`/users/${modal.id}/reject`, { reason: modalNotes });
        } else {
          await api.patch(`/users/${modal.id}/request-info`, { notes: modalNotes });
        }
        toast.success(modal.type === 'reject' ? 'Registration rejected' : 'Requested additional information');
        setSelectedUser(null);
        fetchPending();
      } else {
        await api.patch(`/vehicles/${modal.id}/verification`, {
          action: modal.type === 'reject' ? 'rejected' : 'needs_more_info',
          notes: modalNotes,
        });
        toast.success(modal.type === 'reject' ? 'Vehicle rejected' : 'Requested additional information');
        setSelectedVehicle(null);
        fetchPendingVehicles();
      }
      setModal(null);
      setModalNotes('');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Action failed');
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold">Verifications</h2>
          <p className="text-sm text-[var(--muted)]">Review driver&apos;s license and vehicle photo submissions, with AI-assisted risk checks.</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('license')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            tab === 'license' ? 'gradient-bg text-white' : 'glass-card text-[var(--muted)] hover:text-[var(--foreground)]'
          }`}
        >
          <IdCard className="w-4 h-4" /> Driver&apos;s Licenses
          <span className="px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10 text-xs">{pending.length}</span>
        </button>
        <button
          onClick={() => setTab('vehicle')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            tab === 'vehicle' ? 'gradient-bg text-white' : 'glass-card text-[var(--muted)] hover:text-[var(--foreground)]'
          }`}
        >
          <Car className="w-4 h-4" /> Vehicles
          <span className="px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10 text-xs">{pendingVehicles.length}</span>
        </button>
      </div>

      {tab === 'license' && (
        loadingUsers ? (
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
                  onClick={() => setSelectedUser(user)}
                  className={`w-full text-left glass-card p-4 transition-all ${
                    selectedUser?.id === user.id ? 'ring-2 ring-[var(--primary)]' : ''
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
              {selectedUser ? (
                <motion.div
                  key={selectedUser.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="glass-card p-6 sticky top-24"
                >
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <User className="w-5 h-5" /> {selectedUser.full_name}
                  </h3>

                  <div className="space-y-2 text-sm mb-6">
                    <p><span className="text-[var(--muted)]">Email:</span> {selectedUser.email}</p>
                    <p><span className="text-[var(--muted)]">Phone:</span> {selectedUser.phone}</p>
                    <p><span className="text-[var(--muted)]">Role:</span> <span className="capitalize">{selectedUser.role}</span></p>
                    <p><span className="text-[var(--muted)]">License #:</span> {selectedUser.license_number}</p>
                    <p><span className="text-[var(--muted)]">Submitted:</span> {formatDate(selectedUser.created_at)}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <p className="text-xs font-medium mb-2 flex items-center gap-1"><IdCard className="w-3 h-3" /> Driver&apos;s License</p>
                      <a href={selectedUser.license_image_url} target="_blank" rel="noopener noreferrer"
                        className="block aspect-video rounded-xl overflow-hidden border border-[var(--card-border)] bg-black/5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={selectedUser.license_image_url} alt="License" className="w-full h-full object-contain" />
                      </a>
                    </div>
                    <div>
                      <p className="text-xs font-medium mb-2 flex items-center gap-1"><Camera className="w-3 h-3" /> Live Selfie</p>
                      <a href={selectedUser.selfie_image_url} target="_blank" rel="noopener noreferrer"
                        className="block aspect-video rounded-xl overflow-hidden border border-[var(--card-border)] bg-black/5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={selectedUser.selfie_image_url} alt="Selfie" className="w-full h-full object-contain" />
                      </a>
                    </div>
                  </div>

                  <AiRiskPanel
                    key={selectedUser.id}
                    analyzeUrl={`/admin/ai-verification/license/${selectedUser.id}`}
                    initialResult={selectedUser.ai_result}
                  />

                  <p className="text-xs text-[var(--muted)] mb-4 p-3 rounded-lg bg-[var(--primary)]/5">
                    Verify that the selfie shows the person holding their license and matches the license photo before approving.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button onClick={() => handleApproveUser(selectedUser.id)}
                      className="btn-primary flex-1 flex items-center justify-center gap-2 py-3">
                      <Check className="w-4 h-4" /> Approve
                    </button>
                    <button onClick={() => setModal({ subject: 'license', type: 'more-info', id: selectedUser.id })}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-amber-500/50 text-amber-600 hover:bg-amber-500/10">
                      <HelpCircle className="w-4 h-4" /> Request Info
                    </button>
                    <button onClick={() => setModal({ subject: 'license', type: 'reject', id: selectedUser.id })}
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
        )
      )}

      {tab === 'vehicle' && (
        loadingVehicles ? (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
            </div>
            <div className="skeleton h-96 rounded-2xl" />
          </div>
        ) : pendingVehicles.length === 0 ? (
          <div className="glass-card p-12 text-center text-[var(--muted)]">No pending vehicle verifications</div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              {pendingVehicles.map((vehicle) => (
                <motion.button
                  key={vehicle.id}
                  onClick={() => setSelectedVehicle(vehicle)}
                  className={`w-full text-left glass-card p-4 transition-all ${
                    selectedVehicle?.id === vehicle.id ? 'ring-2 ring-[var(--primary)]' : ''
                  }`}
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center text-white font-bold">
                      <Car className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{vehicle.title}</p>
                      <p className="text-xs text-[var(--muted)]">{vehicle.brand} {vehicle.model} · Owner: {vehicle.owner_name}</p>
                      {vehicle.verification_status === 'needs_more_info' && (
                        <p className="text-xs text-amber-600">Awaiting owner response</p>
                      )}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {selectedVehicle ? (
                <motion.div
                  key={selectedVehicle.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="glass-card p-6 sticky top-24"
                >
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Car className="w-5 h-5" /> {selectedVehicle.title}
                  </h3>

                  <div className="space-y-2 text-sm mb-6">
                    <p><span className="text-[var(--muted)]">Owner:</span> {selectedVehicle.owner_name}</p>
                    <p><span className="text-[var(--muted)]">Brand/Model:</span> {selectedVehicle.brand} {selectedVehicle.model}</p>
                    <p><span className="text-[var(--muted)]">Type:</span> {selectedVehicle.vehicle_type}</p>
                    {selectedVehicle.plate_number && <p><span className="text-[var(--muted)]">Plate:</span> {selectedVehicle.plate_number}</p>}
                    <p><span className="text-[var(--muted)]">Submitted:</span> {formatDate(selectedVehicle.created_at)}</p>
                  </div>

                  <div className="mb-6">
                    <ImageGallery images={selectedVehicle.images ?? []} alt={selectedVehicle.title} className="h-56 rounded-xl" />
                  </div>

                  <AiRiskPanel
                    key={selectedVehicle.id}
                    analyzeUrl={`/admin/ai-verification/vehicle/${selectedVehicle.id}`}
                    initialResult={selectedVehicle.ai_result}
                  />

                  <p className="text-xs text-[var(--muted)] mb-4 p-3 rounded-lg bg-[var(--primary)]/5">
                    This decision is for your records only — the listing stays live either way (see Maintenance Dates on the owner side to block bookings).
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button onClick={() => handleApproveVehicle(selectedVehicle.id)}
                      className="btn-primary flex-1 flex items-center justify-center gap-2 py-3">
                      <Check className="w-4 h-4" /> Approve
                    </button>
                    <button onClick={() => setModal({ subject: 'vehicle', type: 'more-info', id: selectedVehicle.id })}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-amber-500/50 text-amber-600 hover:bg-amber-500/10">
                      <HelpCircle className="w-4 h-4" /> Request Info
                    </button>
                    <button onClick={() => setModal({ subject: 'vehicle', type: 'reject', id: selectedVehicle.id })}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-red-500/50 text-red-500 hover:bg-red-500/10">
                      <X className="w-4 h-4" /> Reject
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div className="glass-card p-12 text-center text-[var(--muted)]">
                  Select a vehicle to review photos
                </div>
              )}
            </AnimatePresence>
          </div>
        )
      )}

      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => { setModal(null); setModalNotes(''); }}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="glass-card p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-bold mb-4">
                {modal.type === 'reject'
                  ? `Reject ${modal.subject === 'license' ? 'Registration' : 'Vehicle'}`
                  : `Request More Info (${modal.subject === 'license' ? 'Applicant' : 'Owner'})`}
              </h3>
              <textarea
                className="input-field mb-4"
                rows={4}
                placeholder={modal.type === 'reject' ? 'Reason for rejection (shown to user)...' : 'What additional info or photos do you need?'}
                value={modalNotes}
                onChange={(e) => setModalNotes(e.target.value)}
              />
              <div className="flex gap-3">
                <button onClick={() => { setModal(null); setModalNotes(''); }} className="btn-outline flex-1">Cancel</button>
                <button
                  onClick={submitModal}
                  className={`flex-1 py-2.5 rounded-xl text-white font-medium ${modal.type === 'reject' ? 'bg-red-500' : 'bg-amber-500'}`}
                >
                  {modal.type === 'reject' ? 'Confirm Reject' : 'Send Request'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
