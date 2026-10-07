'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, BellOff } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

const POLL_MS = 30000;

type Notification = {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
};

const timeAgo = (value: string) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
};

/** Bell with an unread badge and a dropdown of recent notifications; clicking one opens its page. */
export default function NotificationBell({ buttonClassName }: { buttonClassName?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  // Badge on the bell: unread notifications that arrived since the list was last opened.
  const [unseenCount, setUnseenCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = () =>
      api.get('/notifications').then((res) => {
        setNotifications(res.data.data);
        setUnreadCount(res.data.unreadCount);
        setUnseenCount(res.data.unseenCount ?? res.data.unreadCount);
      }).catch(() => {});
    load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const markAllRead = async () => {
    await api.patch('/notifications/read-all').catch(() => {});
    setUnreadCount(0);
    setUnseenCount(0);
    setNotifications((list) => list.map((n) => ({ ...n, is_read: true })));
  };

  const openNotification = (n: Notification) => {
    if (!n.is_read) {
      api.patch(`/notifications/${n.id}/read`).catch(() => {});
      setUnreadCount((c) => Math.max(0, c - 1));
      setNotifications((list) => list.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          // Opening the list counts as seeing these notifications, so the badge clears.
          if (!open && unseenCount > 0) {
            setUnseenCount(0);
            api.post('/badges/seen', { key: 'notifications' }).catch(() => {});
          }
          setOpen(!open);
        }}
        className={cn('relative rounded-xl p-2 hover:bg-[var(--primary)]/10', buttonClassName)}
        aria-label={unreadCount ? `Notifications (${unreadCount} unread)` : 'Notifications'}
      >
        <Bell className="h-5 w-5" />
        {unseenCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unseenCount > 9 ? '9+' : unseenCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute right-0 z-50 mt-2 max-h-[28rem] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto glass-card p-3 shadow-xl"
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <h4 className="font-semibold">Notifications</h4>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-[var(--primary)] hover:underline">
                  Mark all read
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <BellOff className="h-5 w-5 text-[var(--muted)]" />
                <p className="text-sm text-[var(--muted)]">No notifications</p>
              </div>
            ) : (
              notifications.slice(0, 15).map((n) => (
                <button
                  key={n.id}
                  onClick={() => openNotification(n)}
                  className={cn(
                    'mb-1 flex w-full gap-2 rounded-lg p-3 text-left transition-colors hover:bg-[var(--primary)]/10',
                    !n.is_read && 'bg-[var(--primary)]/10'
                  )}
                >
                  <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.is_read ? 'bg-transparent' : 'bg-[var(--primary)]')} />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{n.title}</span>
                    <span className="block text-xs text-[var(--muted)]">{n.message}</span>
                    <span className="mt-1 block text-[11px] text-[var(--muted)]">{timeAgo(n.created_at)}</span>
                  </span>
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
