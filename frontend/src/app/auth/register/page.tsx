'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2, Eye, EyeOff, Loader2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import ThemeToggle from '@/components/ui/ThemeToggle';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import PasswordChecklist, { isStrongPassword } from '@/components/auth/PasswordChecklist';
import { useAuthStore } from '@/store/authStore';
import { getDashboardPath } from '@/lib/utils';

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // Result of checking the typed email with the server (exists / doesn't exist / already registered).
  const [emailCheck, setEmailCheck] = useState<{ email: string; status: string; message: string | null } | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);

  const BAD_EMAIL_STATUSES = ['not_found', 'invalid_domain', 'registered', 'invalid'];

  const checkEmail = async (email: string) => {
    const value = email.trim();
    if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return null;
    if (emailCheck?.email === value) return emailCheck;
    setCheckingEmail(true);
    try {
      const res = await api.post('/auth/check-email', { email: value });
      const result = { email: value, ...res.data.data };
      setEmailCheck(result);
      return result;
    } catch {
      return null; // Couldn't check; the verification code still confirms the address.
    } finally {
      setCheckingEmail(false);
    }
  };

  const [form, setForm] = useState({
    username: '', email: '', phone: '', password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailResult = await checkEmail(form.email);
    if (emailResult && BAD_EMAIL_STATUSES.includes(emailResult.status)) {
      toast.error(emailResult.message || 'Please check your email address');
      return;
    }
    if (!isStrongPassword(form.password)) {
      toast.error("Your password doesn't meet all the requirements yet");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/register', form);
      toast.success(res.data.message || 'Check your email for a verification code');
      // The account can't be used until the emailed code is entered.
      router.push(`/auth/verify-email?email=${encodeURIComponent(res.data.data?.email || form.email)}`);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; errors?: Array<{ msg: string }> } } };
      toast.error(error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || 'Registration failed');
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
      toast.success(`Welcome, ${user.full_name}!`);
      router.push(getDashboardPath(user.role));
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Google sign-up failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative py-12">
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
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="relative h-11 w-11 overflow-hidden rounded-xl bg-white border border-[var(--card-border)] shadow-sm p-1.5"><Image src="/logo.png" alt="JLR Fleetlink logo" fill className="object-contain" /></div>
            <span className="text-xl font-bold gradient-text">JLR Fleetlink</span>
          </Link>
          <h1 className="text-2xl font-bold">Create Account</h1>
          <p className="text-sm text-[var(--muted)]">Rent a ride or list your own — you can do both</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Username</label>
            <input
              required
              autoComplete="username"
              className="input-field"
              placeholder="e.g. juan_dc"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
            {form.username.includes('@') && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Usernames can&apos;t contain &quot;@&quot;.</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Email</label>
            <input type="email" required autoComplete="email" placeholder="you@gmail.com" value={form.email}
              className={`input-field ${emailCheck?.email === form.email.trim() && BAD_EMAIL_STATUSES.includes(emailCheck.status) ? 'ring-2 ring-red-500/60' : ''}`}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              onBlur={(e) => checkEmail(e.currentTarget.value)} />
            {checkingEmail ? (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--muted)]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking email…
              </p>
            ) : emailCheck?.email === form.email.trim() && BAD_EMAIL_STATUSES.includes(emailCheck.status) ? (
              <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-red-500">
                <XCircle className="h-3.5 w-3.5 shrink-0" /> {emailCheck.message}
              </p>
            ) : emailCheck?.email === form.email.trim() && emailCheck.status === 'exists' ? (
              <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> Email address found. We&apos;ll send a code to verify it&apos;s yours.
              </p>
            ) : (
              <p className="mt-1 text-xs text-[var(--muted)]">We&apos;ll send a code to this email to verify it&apos;s yours.</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Phone (09XXXXXXXXX)</label>
            <input required pattern="09[0-9]{9}" className="input-field" placeholder="09171234567" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                autoComplete="new-password"
                className="input-field pr-12"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <PasswordChecklist password={form.password} />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <div className="flex items-center gap-3 my-2">
            <div className="h-px flex-1 bg-[var(--card-border)]" />
            <span className="text-xs text-[var(--muted)]">OR</span>
            <div className="h-px flex-1 bg-[var(--card-border)]" />
          </div>
          <GoogleSignInButton onCredential={handleGoogleCredential} />
        </form>

        <p className="text-center text-sm text-[var(--muted)] mt-6">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-[var(--primary)] font-medium hover:underline">Sign In</Link>
        </p>
      </motion.div>
    </div>
  );
}
