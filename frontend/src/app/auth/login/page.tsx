'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { getDashboardPath } from '@/lib/utils';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [form, setForm] = useState({ email: '', password: '' });
  const [code, setCode] = useState('');

  const handleApiError = (err: unknown, fallback: string) => {
    const error = err as { response?: { data?: { message?: string }; status?: number } };
    let msg = error.response?.data?.message || fallback;
    if (!error.response) {
      msg = 'Cannot reach server. Start backend (npm run dev) and check DATABASE_URL / Neon setup.';
    } else if (error.response.status === 503) {
      msg = error.response.data?.message || 'Database not ready. Run: cd backend && npm run db:setup';
    }
    toast.error(msg);
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      toast.success(res.data.message || 'Verification code sent to your email');
      setStep('otp');
    } catch (err: unknown) {
      handleApiError(err, 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { email: form.email, code });
      const { user, token } = res.data.data;
      setAuth(user, token);
      toast.success(`Welcome back, ${user.full_name}!`);
      router.push(getDashboardPath(user.role));
    } catch (err: unknown) {
      handleApiError(err, 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-violet-500/20 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="relative h-11 w-11 overflow-hidden rounded-xl gradient-bg p-1.5">
              <Image src="/logo.png" alt="JLR Fleetlink logo" fill className="object-contain" />
            </div>
            <span className="text-xl font-bold gradient-text">JLR Fleetlink</span>
          </Link>
          <h1 className="text-2xl font-bold">Welcome Back</h1>
          <p className="text-sm text-[var(--muted)]">
            {step === 'credentials' ? 'Sign in to your account' : `Enter the code sent to ${form.email}`}
          </p>
        </div>

        {step === 'credentials' ? (
          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Email</label>
              <input
                type="email"
                required
                className="input-field"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">Password</label>
                <Link href="/auth/forgot-password" className="text-xs text-[var(--primary)] hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="input-field pr-12"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Sending code...' : 'Continue'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Verification Code</label>
              <input
                type="text"
                inputMode="numeric"
                required
                maxLength={6}
                className="input-field text-center tracking-[0.5em] text-lg"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                autoFocus
              />
            </div>
            <button type="submit" disabled={loading || code.length !== 6} className="btn-primary w-full">
              {loading ? 'Verifying...' : 'Verify & Sign In'}
            </button>
            <button
              type="button"
              onClick={() => { setStep('credentials'); setCode(''); }}
              className="text-sm text-[var(--muted)] hover:underline w-full text-center"
            >
              Back to login
            </button>
          </form>
        )}

        <p className="text-center text-sm text-[var(--muted)] mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" className="text-[var(--primary)] font-medium hover:underline">
            Create Account
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
