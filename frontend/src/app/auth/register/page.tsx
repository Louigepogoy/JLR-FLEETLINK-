'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Car, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import AuthShell from '@/components/auth/AuthShell';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import PasswordChecklist, { isStrongPassword } from '@/components/auth/PasswordChecklist';
import { useAuthStore } from '@/store/authStore';
import { getDashboardPath, noSpaces } from '@/lib/utils';

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
    accountType: '' as '' | 'customer' | 'owner',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailResult = await checkEmail(form.email);
    if (emailResult && BAD_EMAIL_STATUSES.includes(emailResult.status)) {
      toast.error(emailResult.message || 'Please check your email address');
      return;
    }
    if (!form.accountType) {
      toast.error('Choose whether you are signing up as a Customer or an Owner');
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
    if (!form.accountType) {
      toast.error('Choose Customer or Owner first, then continue with Google');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/google', { credential, accountType: form.accountType });
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
    <AuthShell
      title="Create Account"
      subtitle="Sign up to rent a ride, or to list your own vehicle"
      panelTitle={<>More Than Rentals.<br />It&apos;s Your Journey.</>}
      panelText="Join a community of renters and owners. Payments stay protected until pickup, and every account is verified by our team."
    >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">I want to…</label>
            <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Account type">
              {([
                { value: 'customer', icon: KeyRound, title: 'Rent a vehicle', sub: 'Customer account' },
                { value: 'owner', icon: Car, title: 'List my vehicle', sub: 'Owner account' },
              ] as const).map((option) => {
                const selected = form.accountType === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setForm({ ...form, accountType: option.value })}
                    className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition ${
                      selected
                        ? 'border-[var(--primary)] bg-[var(--primary)]/10 ring-2 ring-[var(--primary)]/40'
                        : 'border-[var(--card-border)] hover:border-[var(--primary)]/50'
                    }`}
                  >
                    <option.icon className={`h-5 w-5 ${selected ? 'text-[var(--primary)]' : 'text-[var(--muted)]'}`} />
                    <span className="text-sm font-semibold">{option.title}</span>
                    <span className="text-xs text-[var(--muted)]">{option.sub}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Customers book vehicles; owners list them. Need both? Use a separate account for each.
            </p>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Username</label>
            <input
              required
              autoComplete="username"
              className="input-field"
              placeholder="e.g. juan_dc"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: noSpaces(e.target.value) })}
            />
            {form.username.includes('@') && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Usernames can&apos;t contain &quot;@&quot;.</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Email</label>
            <input type="email" required autoComplete="email" placeholder="you@gmail.com" value={form.email}
              className={`input-field ${emailCheck?.email === form.email.trim() && BAD_EMAIL_STATUSES.includes(emailCheck.status) ? 'ring-2 ring-red-500/60' : ''}`}
              onChange={(e) => setForm({ ...form, email: noSpaces(e.target.value) })}
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
              onChange={(e) => setForm({ ...form, phone: noSpaces(e.target.value) })} />
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
                onChange={(e) => setForm({ ...form, password: noSpaces(e.target.value) })}
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
    </AuthShell>
  );
}
