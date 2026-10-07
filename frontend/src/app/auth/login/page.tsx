'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { getDashboardPath, noSpaces } from '@/lib/utils';
import AuthShell from '@/components/auth/AuthShell';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ identifier: '', password: '' });
  // Wrong-password / locked-account message, kept on screen (it says how many attempts are left).
  const [loginError, setLoginError] = useState<{ message: string; locked: boolean } | null>(null);

  const handleApiError = (err: unknown, fallback: string) => {
    const error = err as { response?: { data?: { message?: string; code?: string }; status?: number } };
    let msg = error.response?.data?.message || fallback;
    if (!error.response) {
      msg = 'Cannot reach server. Start backend (npm run dev) and check DATABASE_URL / Neon setup.';
    } else if (error.response.status === 503) {
      msg = error.response.data?.message || 'Database not ready. Run: cd backend && npm run db:setup';
    } else if (error.response.status === 401 || error.response.status === 429) {
      setLoginError({ message: msg, locked: error.response.data?.code === 'ACCOUNT_LOCKED' });
    }
    toast.error(msg);
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      const { user, token } = res.data.data;
      setAuth(user, token);
      toast.success(`Welcome back, ${user.full_name}!`);
      router.push(getDashboardPath(user.role));
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { code?: string; message?: string; data?: { email?: string } } } }).response?.data;
      if (data?.code === 'EMAIL_NOT_VERIFIED' && data.data?.email) {
        toast.error(data.message || 'Please verify your email first');
        router.push(`/auth/verify-email?email=${encodeURIComponent(data.data.email)}&resend=1`);
        return;
      }
      handleApiError(err, 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = async (credential: string) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/google', { credential });
      const { user, token } = res.data.data;
      setAuth(user, token);
      toast.success(`Welcome back, ${user.full_name}!`);
      router.push(getDashboardPath(user.role));
    } catch (err: unknown) {
      handleApiError(err, 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome Back"
      subtitle="Sign in to your account"
      panelTitle={<>Your Next Ride.<br />Just a Tap Away.</>}
      panelText="Book cars, vans, and motorcycles from verified owners across the Philippines — or list your own and start earning."
    >
        <form onSubmit={handleCredentialsSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Username or Email</label>
            <input
              type="text"
              required
              autoComplete="username"
              className="input-field"
              value={form.identifier}
              onChange={(e) => setForm({ ...form, identifier: noSpaces(e.target.value) })}
              placeholder="juan_dc or you@gmail.com"
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
                onChange={(e) => setForm({ ...form, password: noSpaces(e.target.value) })}
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
          {loginError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400" role="alert">
              {loginError.message}
              {loginError.locked && (
                <Link href="/auth/forgot-password" className="mt-1 block font-semibold underline">Reset your password</Link>
              )}
            </div>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Signing in...' : 'Continue'}
          </button>

          <div className="flex items-center gap-3 my-2">
            <div className="h-px flex-1 bg-[var(--card-border)]" />
            <span className="text-xs text-[var(--muted)]">OR</span>
            <div className="h-px flex-1 bg-[var(--card-border)]" />
          </div>
          <GoogleSignInButton onCredential={handleGoogleCredential} />
        </form>

        <p className="text-center text-sm text-[var(--muted)] mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" className="text-[var(--primary)] font-medium hover:underline">
            Create Account
          </Link>
        </p>
    </AuthShell>
  );
}
