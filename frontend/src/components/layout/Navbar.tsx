'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, LayoutDashboard } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import ThemeToggle from '@/components/ui/ThemeToggle';
import NotificationBell from '@/components/layout/NotificationBell';
import ProfileMenu from '@/components/layout/ProfileMenu';
import { getDashboardPath } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    router.push('/');
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
            <div className="relative h-11 w-11 overflow-hidden rounded-xl bg-white border border-[var(--card-border)] shadow-sm p-1.5">
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
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-[var(--foreground)] hover:bg-[var(--primary)]/10 transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>

                <NotificationBell buttonClassName="glass-card" />
                <ProfileMenu showName buttonClassName="glass-card px-3 py-2" />
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
                  <Link href={getDashboardPath(user?.role || 'user')} className="block py-2 text-[var(--foreground)]" onClick={() => setMobileOpen(false)}>Dashboard</Link>
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
