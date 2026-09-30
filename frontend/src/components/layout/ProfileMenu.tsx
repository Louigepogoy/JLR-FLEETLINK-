'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, LayoutDashboard, LogOut, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { cn, getDashboardPath } from '@/lib/utils';

/**
 * Avatar button with a dropdown: who is signed in, Profile, Dashboard (optional) and Logout.
 * `showName` also shows the user's name next to the avatar on wide screens.
 */
export default function ProfileMenu({ showName = false, showDashboardLink = false, buttonClassName }: {
  showName?: boolean;
  showDashboardLink?: boolean;
  buttonClassName?: string;
}) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const handleLogout = () => {
    setOpen(false);
    logout();
    toast.success('Logged out successfully');
    router.push('/');
  };

  const itemClass = 'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-[var(--primary)]/10';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={cn('flex items-center gap-2 rounded-xl p-1 hover:bg-[var(--primary)]/10', buttonClassName)}
        aria-label="Account menu"
        aria-expanded={open}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full gradient-bg text-sm font-bold text-white">
          {user?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar_url} alt={user.full_name} className="h-full w-full object-cover" />
          ) : (
            user?.full_name?.charAt(0)?.toUpperCase() || 'U'
          )}
        </span>
        {showName && <span className="hidden text-sm font-medium lg:block">{user?.full_name}</span>}
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute right-0 z-50 mt-2 w-60 glass-card p-2 shadow-xl"
          >
            <div className="border-b border-[var(--card-border)] px-3 py-2">
              <p className="truncate text-sm font-medium">{user?.full_name}</p>
              <p className="truncate text-xs text-[var(--muted)]">{user?.email}</p>
              <span className="mt-1 inline-block rounded-full bg-[var(--primary)]/20 px-2 py-0.5 text-xs capitalize text-[var(--primary)]">
                {user?.role}
              </span>
            </div>
            <div className="mt-1 space-y-0.5">
              <Link href="/profile" className={itemClass} onClick={() => setOpen(false)}>
                <User className="h-4 w-4" /> My Profile
              </Link>
              {showDashboardLink && (
                <Link href={getDashboardPath(user?.role || 'user')} className={itemClass} onClick={() => setOpen(false)}>
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </Link>
              )}
              <button onClick={handleLogout} className={cn(itemClass, 'text-red-500 hover:bg-red-500/10')}>
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
