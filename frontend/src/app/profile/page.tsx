'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Camera, CheckCircle2, Clock, IdCard, Lock, Phone, ShieldCheck, User, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

type VerificationStatus = 'unverified' | 'pending' | 'approved' | 'rejected';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, updateUser } = useAuthStore();
  const [form, setForm] = useState({
    fullName: user?.full_name || '',
    phone: user?.phone || '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || '');
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('unverified');
  const [verificationChecking, setVerificationChecking] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) router.push('/auth/login');
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    api.get('/verification')
      .then((res) => setVerificationStatus(res.data.data?.approval_status || 'unverified'))
      .catch(() => {})
      .finally(() => setVerificationChecking(false));
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;

  const handleAvatarChange = (file?: File) => {
    if (!file) return;
    setAvatar(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = new FormData();
      data.append('fullName', form.fullName);
      data.append('phone', form.phone);
      if (avatar) data.append('avatar', avatar);

      const res = await api.put('/users/profile', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUser(res.data.data);
      toast.success('Profile updated');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setPasswordLoading(true);
    try {
      await api.put('/users/profile/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16 min-h-screen">
        <div className="max-w-5xl mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">My Profile</h1>
            <p className="text-[var(--muted)]">Update your contact number, profile photo, and password.</p>
          </div>

          <div className="grid lg:grid-cols-[1fr_0.9fr] gap-6">
            <form onSubmit={handleSave} className="glass-card p-8 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-5 mb-6">
                <label className="relative h-28 w-28 shrink-0 cursor-pointer overflow-hidden rounded-full border border-[var(--card-border)] bg-[var(--primary)]/10">
                  {avatarPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarPreview} alt="Profile preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-[var(--primary)]">
                      {user?.full_name?.charAt(0)}
                    </div>
                  )}
                  <span className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-black/55 py-2 text-white">
                    <Camera className="h-4 w-4" />
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(e) => handleAvatarChange(e.target.files?.[0])}
                  />
                </label>
                <div>
                  <p className="font-semibold">{user?.full_name}</p>
                  <p className="text-sm text-[var(--muted)]">{user?.email}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="inline-block text-xs px-3 py-1 rounded-full bg-[var(--primary)]/20 text-[var(--primary)] capitalize">{user?.role}</span>
                    {!verificationChecking && (
                      <span className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full ${
                        verificationStatus === 'approved' ? 'bg-green-500/15 text-green-500' :
                        verificationStatus === 'pending' ? 'bg-amber-500/15 text-amber-500' :
                        verificationStatus === 'rejected' ? 'bg-red-500/15 text-red-500' :
                        'bg-[var(--muted)]/15 text-[var(--muted)]'
                      }`}>
                        {verificationStatus === 'approved' && <><CheckCircle2 className="h-3 w-3" /> Verified</>}
                        {verificationStatus === 'pending' && <><Clock className="h-3 w-3" /> Verification Pending</>}
                        {verificationStatus === 'rejected' && <><XCircle className="h-3 w-3" /> Not Verified</>}
                        {verificationStatus === 'unverified' && <><ShieldCheck className="h-3 w-3" /> Not Verified</>}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium flex items-center gap-2"><User className="h-4 w-4" /> Full Name</label>
                <input className="input-field mt-1" value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium flex items-center gap-2"><Phone className="h-4 w-4" /> Phone Number</label>
                <input className="input-field mt-1" placeholder="09XXXXXXXXX" value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Saving...' : 'Save Profile'}
              </button>
            </form>

            <form onSubmit={handlePasswordSave} className="glass-card p-8 space-y-5 h-fit">
              <div>
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] mb-4">
                  <Lock className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-bold">Change Password</h2>
                <p className="text-sm text-[var(--muted)]">Use at least 8 characters for your new password.</p>
              </div>
              <input
                className="input-field"
                type="password"
                placeholder="Current password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              />
              <input
                className="input-field"
                type="password"
                placeholder="New password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              />
              <input
                className="input-field"
                type="password"
                placeholder="Confirm new password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              />
              <button type="submit" disabled={passwordLoading} className="btn-primary w-full">
                {passwordLoading ? 'Changing...' : 'Change Password'}
              </button>
            </form>

            <div className="glass-card p-8 space-y-4 h-fit lg:col-span-2">
              <div className="flex items-center gap-4">
                <div className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                  verificationStatus === 'approved' ? 'bg-green-500/15 text-green-500' :
                  verificationStatus === 'pending' ? 'bg-amber-500/15 text-amber-500' :
                  verificationStatus === 'rejected' ? 'bg-red-500/15 text-red-500' :
                  'bg-[var(--primary)]/10 text-[var(--primary)]'
                }`}>
                  {verificationStatus === 'approved' && <CheckCircle2 className="h-6 w-6" />}
                  {verificationStatus === 'pending' && <Clock className="h-6 w-6" />}
                  {verificationStatus === 'rejected' && <XCircle className="h-6 w-6" />}
                  {verificationStatus === 'unverified' && <IdCard className="h-6 w-6" />}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold">Identity Verification</h2>
                  <p className="text-sm text-[var(--muted)]">
                    {verificationStatus === 'approved' && "Your driver's license has been verified. This is visible on your profile."}
                    {verificationStatus === 'pending' && "We're reviewing your driver's license and selfie."}
                    {verificationStatus === 'rejected' && 'Your last submission was not approved. You can try again.'}
                    {verificationStatus === 'unverified' && "Verify your driver's license to book or list vehicles."}
                  </p>
                </div>
                {verificationStatus !== 'approved' && (
                  <Link href="/verify-identity?returnTo=/profile" className="btn-primary shrink-0">
                    {verificationStatus === 'pending' ? 'View Status' : verificationStatus === 'rejected' ? 'Try Again' : 'Verify Now'}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
