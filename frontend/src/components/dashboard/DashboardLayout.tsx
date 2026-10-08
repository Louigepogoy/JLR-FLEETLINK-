'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { LogOut, Menu, X } from 'lucide-react';
import {
  BrowseCarIcon, CalendarCheckIcon, CardIcon, ChartIcon, CrownIcon, DisputeIcon, EarningsIcon, FlagIcon, HistoryIcon,
  HomeIcon, IconChip, MessagesIcon, MyVehicleIcon, OverviewIcon, ReceiptIcon, RequestsIcon, SettingsIcon, SupportIcon,
  UsersIcon, VerifyIdIcon, WalletIcon, type MiniIcon,
} from '@/components/illustrations/MiniIcons';
import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import ThemeToggle from '@/components/ui/ThemeToggle';
import NotificationBell from '@/components/layout/NotificationBell';
import ProfileMenu from '@/components/layout/ProfileMenu';
import RatingPrompt from '@/components/reviews/RatingPrompt';
import api from '@/lib/api';
import { cn, getDashboardPath } from '@/lib/utils';
import toast from 'react-hot-toast';
import BrandLogo from '@/components/ui/BrandLogo';

const UNREAD_POLL_MS = 15000;

// Sidebar pages that show a pending-items badge (must match SEEN_KEYS in the backend badgeController).
const BADGE_PATHS = new Set([
  '/dashboard/admin/approvals', '/dashboard/admin/bookings', '/dashboard/admin/disputes',
  '/dashboard/admin/reports', '/dashboard/admin/support', '/dashboard/admin/payouts',
  '/dashboard/bookings', '/dashboard/booking-requests', '/dashboard/vehicles',
]);

type NavItem = { href: string; label: string; icon: MiniIcon; showUnread?: boolean };

// Customer and owner accounts get their own dashboard: same pages, but each menu leads with what that
// account is for. Accounts from before the customer/owner split ('both') keep the combined menu.
const customerNav: NavItem[] = [
  { href: '/', label: 'Home', icon: HomeIcon },
  { href: '/dashboard', label: 'Overview', icon: OverviewIcon },
  { href: '/vehicles', label: 'Browse Vehicles', icon: BrowseCarIcon },
  { href: '/dashboard/bookings', label: 'My Bookings', icon: CalendarCheckIcon },
  { href: '/dashboard/messages', label: 'Messages', icon: MessagesIcon, showUnread: true },
  { href: '/dashboard/transactions', label: 'Transactions', icon: ReceiptIcon },
  { href: '/dashboard/vehicle-report', label: 'Rental Report', icon: ChartIcon },
  { href: '/dashboard/support', label: 'Support', icon: SupportIcon },
];

const ownerNav: NavItem[] = [
  { href: '/', label: 'Home', icon: HomeIcon },
  { href: '/dashboard', label: 'Overview', icon: OverviewIcon },
  { href: '/dashboard/vehicles', label: 'My Vehicles', icon: MyVehicleIcon },
  { href: '/dashboard/booking-requests', label: 'Booking Requests', icon: RequestsIcon },
  { href: '/dashboard/earnings', label: 'Earnings', icon: EarningsIcon },
  { href: '/dashboard/vehicle-report', label: 'Vehicle Report', icon: ChartIcon },
  { href: '/dashboard/transactions', label: 'Transactions', icon: ReceiptIcon },
  { href: '/dashboard/subscription', label: 'Subscription', icon: CrownIcon },
  { href: '/dashboard/messages', label: 'Messages', icon: MessagesIcon, showUnread: true },
  { href: '/dashboard/support', label: 'Support', icon: SupportIcon },
];

const navByRole: Record<string, NavItem[]> = {
  user: [
    { href: '/', label: 'Home', icon: HomeIcon },
    { href: '/dashboard', label: 'Overview', icon: OverviewIcon },
    { href: '/dashboard/messages', label: 'Messages', icon: MessagesIcon, showUnread: true },
    { href: '/dashboard/bookings', label: 'My Bookings', icon: CalendarCheckIcon },
    { href: '/vehicles', label: 'Browse Vehicles', icon: BrowseCarIcon },
    { href: '/dashboard/vehicles', label: 'My Vehicles', icon: MyVehicleIcon },
    { href: '/dashboard/booking-requests', label: 'Booking Requests', icon: RequestsIcon },
    { href: '/dashboard/earnings', label: 'Earnings', icon: EarningsIcon },
    { href: '/dashboard/vehicle-report', label: 'Vehicle Report', icon: ChartIcon },
    { href: '/dashboard/transactions', label: 'Transactions', icon: ReceiptIcon },
    { href: '/dashboard/subscription', label: 'Subscription', icon: CrownIcon },
    { href: '/dashboard/support', label: 'Support', icon: SupportIcon },
  ],
  admin: [
    { href: '/', label: 'Home', icon: HomeIcon },
    { href: '/dashboard/admin', label: 'Overview', icon: OverviewIcon },
    { href: '/dashboard/admin/messages', label: 'Messages', icon: MessagesIcon, showUnread: true },
    { href: '/dashboard/admin/approvals', label: 'Verifications', icon: VerifyIdIcon },
    { href: '/dashboard/admin/users', label: 'Users', icon: UsersIcon },
    { href: '/dashboard/admin/login-logs', label: 'Login Logs', icon: HistoryIcon },
    { href: '/dashboard/admin/bookings', label: 'Bookings', icon: CalendarCheckIcon },
    { href: '/dashboard/admin/disputes', label: 'Pickup Disputes', icon: DisputeIcon },
    { href: '/dashboard/admin/reports', label: 'Reports', icon: FlagIcon },
    { href: '/dashboard/admin/support', label: 'Support Tickets', icon: SupportIcon },
    { href: '/dashboard/admin/payments', label: 'Payments', icon: CardIcon },
    { href: '/dashboard/admin/payouts', label: 'Owner Payouts', icon: WalletIcon },
    { href: '/dashboard/admin/analytics', label: 'Analytics', icon: ChartIcon },
    { href: '/dashboard/admin/settings', label: 'Settings', icon: SettingsIcon },
  ],
};

export default function DashboardLayout({
  children,
  role,
}: {
  children: React.ReactNode;
  role: 'user' | 'admin';
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, hasHydrated, logout, updateUser } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  // Pending-item counts per sidebar path (e.g. booking requests waiting for handover).
  const [badges, setBadges] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) return;
    const loadUnread = () => {
      api.get('/chat/unread-count').then((res) => setUnreadMessages(res.data.data.count)).catch(() => {});
      api.get('/badges').then((res) => setBadges(res.data.data || {})).catch(() => {});
    };
    loadUnread();
    const timer = setInterval(loadUnread, UNREAD_POLL_MS);
    return () => clearInterval(timer);
  }, [hasHydrated, isAuthenticated]);

  // The saved user is a login-time snapshot; refresh it so a changed account type (customer/owner)
  // or verification status shows the right dashboard without signing out and back in.
  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) return;
    api.get('/auth/me')
      .then((res) => {
        const fresh = res.data.data?.user;
        if (fresh) updateUser({ account_type: fresh.account_type, approval_status: fresh.approval_status });
      })
      .catch(() => {});
  }, [hasHydrated, isAuthenticated, updateUser]);

  // Opening a page with a badge marks it as seen, so its count clears until something new arrives.
  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) return;
    if (!BADGE_PATHS.has(pathname)) return;
    api.post('/badges/seen', { key: pathname }).catch(() => {});
  }, [hasHydrated, isAuthenticated, pathname]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
    } else if (user && user.role !== role && user.role !== 'admin') {
      router.push(getDashboardPath(user.role));
    }
  }, [hasHydrated, isAuthenticated, user, role, router]);

  const accountType = role === 'admin' ? 'admin' : user?.account_type || 'both';
  const navItems = accountType === 'customer' ? customerNav
    : accountType === 'owner' ? ownerNav
      : navByRole[role] || [];
  const dashboardLabel = {
    admin: 'Admin Dashboard', customer: 'Customer Dashboard', owner: 'Owner Dashboard', both: 'Dashboard',
  }[accountType];

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
    router.push('/');
  };

  if (!hasHydrated || !isAuthenticated) return null;

  return (
    <div className="min-h-screen flex">
      <aside className={cn(
        'fixed lg:static inset-y-0 left-0 z-40 w-64 glass-card lg:glass-card-none lg:bg-transparent border-r border-[var(--card-border)] transform transition-transform lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="p-6 border-b border-[var(--card-border)]">
          <Link href="/" className="flex items-center gap-2.5"><BrandLogo className="h-9 w-9" /><span className="text-xl font-bold gradient-text">JLR Fleetlink</span></Link>
          <p className="text-xs text-[var(--muted)] mt-1">{dashboardLabel}</p>
        </div>
        {/* pb-24 keeps the last menu items clear of the Logout button pinned to the bottom. */}
        <nav className="p-4 pb-24 space-y-1">
          {navItems.map((item) => {
            // The page being viewed right now never shows its badge — it's being seen.
            const count = item.showUnread ? unreadMessages : item.href === pathname ? 0 : badges[item.href] || 0;
            return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all',
                pathname === item.href
                  ? 'nav-active gradient-bg text-white shadow-lg'
                  : 'hover:bg-[var(--primary)]/10 text-[var(--muted)]'
              )}
            >
              <IconChip icon={item.icon} className="h-8 w-8 rounded-lg" iconClassName="h-5 w-5" />
              {item.label}
              {count > 0 && (
                <span className={cn(
                  'ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold',
                  pathname === item.href ? 'bg-white text-[var(--primary)]' : 'bg-red-500 text-white shadow-sm shadow-red-500/40'
                )}>
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[var(--card-border)]">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-500 hover:bg-red-500/10 w-full"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 glass-card border-b border-[var(--card-border)] px-6 py-4 flex items-center justify-between">
          <button className="lg:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X /> : <Menu />}
          </button>
          <div className="min-w-0 flex-1 px-3 lg:px-0">
            <h1 className="truncate font-semibold">Welcome, {user?.full_name}</h1>
            <p className="hidden truncate text-xs text-[var(--muted)] sm:block">{user?.email}</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <NotificationBell />
            <ProfileMenu />
          </div>
        </header>
        <main className="flex-1 p-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
      <RatingPrompt />
    </div>
  );
}
