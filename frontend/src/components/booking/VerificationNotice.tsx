'use client';

import Link from 'next/link';
import { Clock, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

/**
 * Warning shown to signed-in accounts that aren't verified yet: customers can't book and owners can't
 * list a vehicle until an admin approves their driver's license. Renders nothing once approved.
 */
export default function VerificationNotice({ action, returnTo, className = '' }: {
  action: 'book' | 'list';
  returnTo: string;
  className?: string;
}) {
  const user = useAuthStore((state) => state.user);
  const status = user?.approval_status || 'unverified';
  if (!user || user.role === 'admin' || status === 'approved') return null;

  const goal = action === 'book' ? 'book a vehicle' : 'list a vehicle';

  if (status === 'pending') {
    return (
      <div className={`flex items-start gap-3 rounded-xl border border-sky-500/40 bg-sky-500/10 p-4 text-sm ${className}`}>
        <Clock className="mt-0.5 h-5 w-5 shrink-0 text-sky-500" />
        <div>
          <p className="font-semibold">Your verification is under review</p>
          <p className="text-[var(--muted)]">You can {goal} as soon as an admin approves your driver&apos;s license.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/50 bg-amber-500/10 p-4 text-sm ${className}`}>
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
        <div>
          <p className="font-semibold">
            {status === 'rejected' ? 'Your verification was not approved' : `Verify your account to ${goal}`}
          </p>
          <p className="text-[var(--muted)]">
            {status === 'rejected'
              ? `Submit your driver’s license again. You can’t ${goal} until it is approved.`
              : `You need a verified driver’s license before you can ${goal}.`}
          </p>
        </div>
      </div>
      <Link href={`/verify-identity?returnTo=${encodeURIComponent(returnTo)}`} className="btn-primary shrink-0 text-sm py-2">
        {status === 'rejected' ? 'Verify again' : 'Verify now'}
      </Link>
    </div>
  );
}
