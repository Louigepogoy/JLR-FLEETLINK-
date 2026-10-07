'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, ShieldAlert, X } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const DISMISS_KEY = 'jlr-verify-float-dismissed';

// Pages where the reminder would be redundant or get in the way (the verify flow itself, auth screens, chat composer).
const HIDDEN_PREFIXES = ['/profile', '/verify-identity', '/auth', '/dashboard/messages'];

/**
 * Floating reminder for users who haven't verified their driver's license yet. Clicking it opens
 * the Profile page scrolled to the Identity Verification section.
 */
export default function VerifyAccountFloat() {
  const pathname = usePathname();
  const { user, isAuthenticated, hasHydrated, updateUser } = useAuthStore();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return typeof window !== 'undefined' && sessionStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      // Storage unavailable (private mode etc.) — just show the reminder.
      return false;
    }
  });

  // The stored user is a login-time snapshot; refresh the status so the reminder disappears once approved.
  useEffect(() => {
    if (!hasHydrated || !isAuthenticated || user?.role === 'admin') return;
    api.get('/verification')
      .then((res) => {
        const status = res.data.data?.approval_status || 'unverified';
        if (status !== user?.approval_status) updateUser({ approval_status: status });
      })
      .catch(() => {});
    // Re-check on navigation (e.g. right after submitting verification).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, isAuthenticated, pathname]);

  const status = user?.approval_status || 'unverified';
  const visible =
    hasHydrated &&
    isAuthenticated &&
    user?.role !== 'admin' &&
    (status === 'unverified' || status === 'rejected') &&
    !dismissed &&
    !HIDDEN_PREFIXES.some((prefix) => pathname?.startsWith(prefix));

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Ignore — dismissal just won't survive a reload.
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-6 sm:bottom-6 sm:w-96"
        >
          <div className="relative flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-[var(--card)] p-4 pr-10 shadow-2xl shadow-black/20 backdrop-blur">
            <Link href="/profile#verification" className="flex flex-1 items-center gap-3 min-w-0">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
                <ShieldAlert className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-[var(--foreground)]">
                  {status === 'rejected' ? 'Verification not approved' : 'Your account is not verified'}
                </span>
                <span className="block text-sm text-[var(--muted)]">
                  {status === 'rejected'
                    ? 'Tap to submit your driver’s license again.'
                    : 'Tap to verify your driver’s license so you can book or list vehicles.'}
                </span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-amber-500" />
            </Link>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss verification reminder"
              className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--card-border)]/40"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
