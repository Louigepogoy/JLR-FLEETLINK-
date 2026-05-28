'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, updateUser } = useAuthStore();
  const [form, setForm] = useState({
    fullName: user?.full_name || '',
    phone: user?.phone || '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) router.push('/auth/login');
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.put('/users/profile', form);
      updateUser(res.data.data);
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16 min-h-screen">
        <div className="max-w-lg mx-auto px-4">
          <h1 className="text-3xl font-bold mb-8">My Profile</h1>
          <form onSubmit={handleSave} className="glass-card p-8 space-y-4">
            <div className="text-center mb-6">
              <div className="w-20 h-20 rounded-full gradient-bg flex items-center justify-center text-white text-3xl font-bold mx-auto mb-3">
                {user?.full_name?.charAt(0)}
              </div>
              <p className="font-semibold">{user?.full_name}</p>
              <p className="text-sm text-[var(--muted)]">{user?.email}</p>
              <span className="inline-block mt-2 text-xs px-3 py-1 rounded-full bg-[var(--primary)]/20 text-[var(--primary)] capitalize">{user?.role}</span>
            </div>
            <div>
              <label className="text-sm font-medium">Full Name</label>
              <input className="input-field mt-1" value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <input className="input-field mt-1" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}
