'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, LayoutDashboard } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import ThemeToggle from '@/components/ui/ThemeToggle';
import NotificationBell from '@/components/layout/NotificationBell';
import ProfileMenu from '@/components/layout/ProfileMenu';
import { getDashboardPath } from '@/lib/utils';
import toast from 'react-hot-toast';
import BrandLogo from '@/components/ui/BrandLogo';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  // On the home page, the section currently under the navbar (e.g. "features"), so its link lights up.
  const [activeSection, setActiveSection] = useState<string | null>(null);
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
    { href: '/', label: 'Home' },
    { href: '/vehicles', label: 'Browse Vehicles' },
    { href: '/#features', label: 'Features' },
    { href: '/#testimonials', label: 'Reviews' },
  ];

  // Home-page sections that have their own link; scrolling into one highlights it instead of Home.
  const sectionIds = navLinks.filter((l) => l.href.startsWith('/#')).map((l) => l.href.slice(2));

  useEffect(() => {
    if (pathname !== '/') return;
    const update = () => {
      const line = 120; // just below the navbar
      const current = sectionIds.find((id) => {
        const rect = document.getElementById(id)?.getBoundingClientRect();
        return rect && rect.top <= line && rect.bottom > line;
      });
      setActiveSection(current ?? null);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
    // sectionIds is derived from a constant list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const isActive = (href: string) => {
    if (href.startsWith('/#')) return pathname === '/' && activeSection === href.slice(2);
    if (href === '/') return pathname === '/' && !activeSection;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

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
            <BrandLogo />
            <span className="text-xl font-bold gradient-text">JLR Fleetlink</span>
          </Link>

          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? 'page' : undefined}
                className={`relative py-1 text-sm transition-colors ${
                  isActive(link.href)
                    ? 'gradient-text font-semibold'
                    : 'font-medium text-[var(--muted)] hover:text-[var(--primary)]'
                }`}
              >
                {link.label}
                {isActive(link.href) && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute -bottom-1 left-0 h-0.5 w-full rounded-full gradient-bg"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
              </Link>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-3">
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

          <button className="lg:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X /> : <Menu />}
          </button>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden mt-4 glass-card p-4 space-y-3"
            >
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive(link.href) ? 'page' : undefined}
                  className={`block rounded-lg px-3 py-2 ${
                    isActive(link.href) ? 'bg-[var(--primary)]/10 font-semibold text-[var(--primary)]' : ''
                  }`}
                  onClick={() => setMobileOpen(false)}
                >
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
