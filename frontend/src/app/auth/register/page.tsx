'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Car, Upload, Camera, IdCard, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [licensePreview, setLicensePreview] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const licenseRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', password: '', role: 'customer', licenseNumber: '',
  });
  const [files, setFiles] = useState<{ licenseImage?: File; selfieImage?: File }>({});

  const handleFile = (field: 'licenseImage' | 'selfieImage', file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    setFiles((prev) => ({ ...prev, [field]: file }));
    const url = URL.createObjectURL(file);
    if (field === 'licenseImage') setLicensePreview(url);
    else setSelfiePreview(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!files.licenseImage || !files.selfieImage) {
      toast.error('Driver\'s license photo and live selfie are required');
      return;
    }

    setLoading(true);
    try {
      const data = new FormData();
      data.append('fullName', form.fullName);
      data.append('email', form.email);
      data.append('phone', form.phone);
      data.append('password', form.password);
      data.append('role', form.role);
      data.append('licenseNumber', form.licenseNumber);
      data.append('licenseImage', files.licenseImage);
      data.append('selfieImage', files.selfieImage);

      const res = await api.post('/auth/register', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success(res.data.message || 'Registration submitted! Awaiting admin approval.');
      router.push('/auth/login');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; errors?: Array<{ msg: string }> } } };
      toast.error(error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative py-12">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-sky-500/20 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 w-full max-w-lg relative z-10"
      >
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl gradient-bg"><Car className="w-5 h-5 text-white" /></div>
            <span className="text-xl font-bold gradient-text">JLR Fleetlink</span>
          </Link>
          <h1 className="text-2xl font-bold">Create Account</h1>
          <p className="text-sm text-[var(--muted)]">Identity verification required — admin approval needed</p>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-6 text-sm">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[var(--muted)]">
            Upload a clear photo of your valid driver&apos;s license and a live selfie holding your ID for human verification. An admin will review before your account is activated.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Full Name</label>
            <input required className="input-field" value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Email</label>
            <input type="email" required className="input-field" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Phone (09XXXXXXXXX)</label>
            <input required pattern="09[0-9]{9}" className="input-field" placeholder="09171234567" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Driver&apos;s License Number</label>
            <input required className="input-field" placeholder="e.g. N01-12-345678" value={form.licenseNumber}
              onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Account Type</label>
            <select className="input-field" value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="customer">Customer — Rent Vehicles</option>
              <option value="owner">Owner — List Vehicles</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 flex items-center gap-1">
                <IdCard className="w-4 h-4" /> License Photo
              </label>
              <input ref={licenseRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => handleFile('licenseImage', e.target.files?.[0])} />
              <button type="button" onClick={() => licenseRef.current?.click()}
                className="w-full h-32 rounded-xl border-2 border-dashed border-[var(--card-border)] flex flex-col items-center justify-center gap-2 hover:border-[var(--primary)] transition-colors overflow-hidden">
                {licensePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={licensePreview} alt="License" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-[var(--muted)]" />
                    <span className="text-xs text-[var(--muted)]">Upload license</span>
                  </>
                )}
              </button>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 flex items-center gap-1">
                <Camera className="w-4 h-4" /> Live Selfie
              </label>
              <input ref={selfieRef} type="file" accept="image/*" capture="user" className="hidden"
                onChange={(e) => handleFile('selfieImage', e.target.files?.[0])} />
              <button type="button" onClick={() => selfieRef.current?.click()}
                className="w-full h-32 rounded-xl border-2 border-dashed border-[var(--card-border)] flex flex-col items-center justify-center gap-2 hover:border-[var(--primary)] transition-colors overflow-hidden">
                {selfiePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selfiePreview} alt="Selfie" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Camera className="w-6 h-6 text-[var(--muted)]" />
                    <span className="text-xs text-[var(--muted)]">Take selfie with ID</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Password</label>
            <input type="password" required minLength={8} className="input-field" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Submitting...' : 'Submit for Approval'}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--muted)] mt-6">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-[var(--primary)] font-medium hover:underline">Sign In</Link>
        </p>
      </motion.div>
    </div>
  );
}
