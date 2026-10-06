'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { MailCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { useAuthStore } from '@/store/authStore';
import { getDashboardPath } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/chat';

const RESEND_SECONDS = 60;

function VerifyEmailContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { setAuth } = useAuthStore();
  const email = params.get('email') || '';
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);
  const autoResent = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const resend = async (silent = false) => {
    if (!email) return;
    try {
      await api.post('/auth/resend-verification', { email });
      if (!silent) toast.success('A new code is on its way. Check your inbox and spam folder.');
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      if (!silent) toast.error(apiErrorMessage(err, 'Could not send a new code'));
    }
  };

  // Coming from the login page: the earlier code may have expired, so send a fresh one.
  useEffect(() => {
    if (params.get('resend') === '1' && !autoResent.current) {
      autoResent.current = true;
      resend(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      toast.error('Enter the 6-digit code from your email');
      return;
    }
    setVerifying(true);
    try {
      const res = await api.post('/auth/verify-email', { email, code });
      const { user, token } = res.data.data;
      setAuth(user, token);
      toast.success(`Email verified! Welcome, ${user.username || user.full_name}!`);
      router.push(getDashboardPath(user.role));
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Verification failed'));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-violet-500/20 blur-3xl" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 w-full max-w-md relative z-10">
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="relative h-11 w-11 overflow-hidden rounded-xl bg-white border border-[var(--card-border)] shadow-sm p-1.5">
              <Image src="/logo.png" alt="JLR Fleetlink logo" fill className="object-contain" />
            </div>
            <span className="text-xl font-bold gradient-text">JLR Fleetlink</span>
          </Link>
          <div className="illo-tile mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
            <MailCheck className="h-8 w-8 text-[var(--primary)]" strokeWidth={1.75} />
          </div>
          <h1 className="text-2xl font-bold">Verify Your Email</h1>
          <p className="text-sm text-[var(--muted)]">
            We sent a 6-digit code to <span className="font-semibold text-[var(--foreground)]">{email || 'your email'}</span>.
            Enter it below to activate your account.
          </p>
        </div>

        {!email ? (
          <p className="text-center text-sm text-[var(--muted)]">
            Missing email address. <Link href="/auth/register" className="text-[var(--primary)] hover:underline">Create an account</Link> first.
          </p>
        ) : (
          <form onSubmit={verify} className="space-y-4">
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={6}
              className="input-field text-center text-2xl font-bold tracking-[0.5em]"
              placeholder="••••••"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
            <button type="submit" disabled={verifying || code.length !== 6} className="btn-primary w-full">
              {verifying ? 'Verifying...' : 'Verify & Continue'}
            </button>
            <p className="text-center text-sm text-[var(--muted)]">
              Didn&apos;t get it? Check your spam folder, or{' '}
              {cooldown > 0 ? (
                <span>resend in {cooldown}s</span>
              ) : (
                <button type="button" onClick={() => resend()} className="font-medium text-[var(--primary)] hover:underline">
                  send a new code
                </button>
              )}
              .
            </p>
            <p className="text-center text-xs text-[var(--muted)]">
              Wrong email? <Link href="/auth/register" className="text-[var(--primary)] hover:underline">Sign up again</Link> with the correct one.
            </p>
          </form>
        )}
      </motion.div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
