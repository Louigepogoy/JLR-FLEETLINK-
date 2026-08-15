'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu, X, Bell, BellOff, LogOut, User, LayoutDashboard, ChevronDown,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { getDashboardPath } from '@/lib/utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; message: string; is_read: boolean; created_at: string }>>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      api.get('/notifications').then((res) => {
        setNotifications(res.data.data);
        setUnreadCount(res.data.unreadCount);
      }).catch(() => {});
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    router.push('/');
  };

  const markAllRead = async () => {
    await api.patch('/notifications/read-all');
    setUnreadCount(0);
    setNotifications((n) => n.map((x) => ({ ...x, is_read: true })));
  };

  const navLinks = [
    { href: '/vehicles', label: 'Browse Vehicles' },
    { href: '/#features', label: 'Features' },
    { href: '/#testimonials', label: 'Reviews' },
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'py-3 shadow-lg' : 'py-5'
      }`}
      style={{ background: scrolled ? 'var(--navbar-bg)' : 'transparent', backdropFilter: scrolled ? 'blur(16px)' : 'none' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative h-11 w-11 overflow-hidden rounded-xl gradient-bg p-1.5">
              <Image src="/logo.png" alt="JLR Fleetlink logo" fill className="object-contain" />
            </div>
            <span className="text-xl font-bold gradient-text">JLR Fleetlink</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-[var(--muted)] hover:text-[var(--primary)] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />

            {!isAuthenticated ? (
              <>
                <Link href="/auth/register" className="btn-outline text-sm py-2 px-4">
                  Create Account
                </Link>
                <Link href="/auth/login" className="btn-primary text-sm py-2 px-4">
                  Sign In
                </Link>
              </>
            ) : (
              <>
                <Link
                  href={getDashboardPath(user?.role || 'user')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium hover:bg-[var(--primary)]/10 transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>

                <div className="relative">
                  <button
                    onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
                    className="relative p-2 rounded-xl glass-card hover:bg-[var(--primary)]/10"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 text-xs bg-red-500 text-white rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  <AnimatePresence>
                    {notifOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-2 w-80 glass-card p-4 max-h-96 overflow-y-auto"
                      >
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-semibold">Notifications</h4>
                          {unreadCount > 0 && (
                            <button onClick={markAllRead} className="text-xs text-[var(--primary)]">
                              Mark all read
                            </button>
                          )}
                        </div>
                        {notifications.length === 0 ? (
                          <div className="flex flex-col items-center gap-2 py-6 text-center">
                            <BellOff className="w-5 h-5 text-[var(--muted)]" />
                            <p className="text-sm text-[var(--muted)]">No notifications</p>
                          </div>
                        ) : (
                          notifications.slice(0, 5).map((n) => (
                            <div key={n.id} className={`p-3 rounded-lg mb-2 ${!n.is_read ? 'bg-[var(--primary)]/10' : ''}`}>
                              <p className="text-sm font-medium">{n.title}</p>
                              <p className="text-xs text-[var(--muted)]">{n.message}</p>
                            </div>
                          ))
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl glass-card hover:bg-[var(--primary)]/10"
                  >
                    <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-white text-sm font-bold">
                      {user?.full_name?.charAt(0) || 'U'}
                    </div>
                    <span className="text-sm font-medium hidden lg:block">{user?.full_name}</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  <AnimatePresence>
                    {profileOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-2 w-56 glass-card p-2"
                      >
                        <div className="px-3 py-2 border-b border-[var(--card-border)]">
                          <p className="font-medium text-sm">{user?.full_name}</p>
                          <p className="text-xs text-[var(--muted)]">{user?.email}</p>
                          <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-[var(--primary)]/20 text-[var(--primary)] capitalize">
                            {user?.role}
                          </span>
                        </div>
                        <Link
                          href="/profile"
                          className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--primary)]/10 rounded-lg mt-1"
                          onClick={() => setProfileOpen(false)}
                        >
                          <User className="w-4 h-4" /> Profile
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-red-500/10 text-red-500 rounded-lg w-full"
                        >
                          <LogOut className="w-4 h-4" /> Logout
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}
          </div>

          <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X /> : <Menu />}
          </button>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden mt-4 glass-card p-4 space-y-3"
            >
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} className="block py-2" onClick={() => setMobileOpen(false)}>
                  {link.label}
                </Link>
              ))}
              <ThemeToggle />
              {!isAuthenticated ? (
                <>
                  <Link href="/auth/register" className="block btn-outline text-center" onClick={() => setMobileOpen(false)}>Create Account</Link>
                  <Link href="/auth/login" className="block btn-primary text-center" onClick={() => setMobileOpen(false)}>Sign In</Link>
                </>
              ) : (
                <>
                  <Link href={getDashboardPath(user?.role || 'user')} className="block py-2" onClick={() => setMobileOpen(false)}>Dashboard</Link>
                  <button onClick={handleLogout} className="block w-full text-left py-2 text-red-500">Logout</button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
}
