'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Handshake, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

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

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      toast.success(res.data.message || 'If an account exists, a reset code has been sent');
      setStep('reset');
    } catch (err: unknown) {
      handleApiError(err, 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', { email, code, newPassword });
      toast.success(res.data.message || 'Password reset successful');
      router.push('/auth/login');
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
            <div className="p-2 rounded-xl gradient-bg">
              <Handshake className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">JLR Fleetlink</span>
          </Link>
          <h1 className="text-2xl font-bold">Reset Password</h1>
          <p className="text-sm text-[var(--muted)]">
            {step === 'email'
              ? 'Enter the email you used to register'
              : `Enter the code sent to ${email} and choose a new password`}
          </p>
        </div>

        {step === 'email' ? (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Email</label>
              <input
                type="email"
                required
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoFocus
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Sending code...' : 'Send Reset Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetSubmit} className="space-y-4">
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
            <div>
              <label className="text-sm font-medium mb-1 block">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  className="input-field pr-12"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
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
            <button
              type="submit"
              disabled={loading || code.length !== 6 || newPassword.length < 8}
              className="btn-primary w-full"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
            <button
              type="button"
              onClick={() => { setStep('email'); setCode(''); setNewPassword(''); }}
              className="text-sm text-[var(--muted)] hover:underline w-full text-center"
            >
              Use a different email
            </button>
          </form>
        )}

        <p className="text-center text-sm text-[var(--muted)] mt-6">
          Remembered your password?{' '}
          <Link href="/auth/login" className="text-[var(--primary)] font-medium hover:underline">
            Sign In
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
