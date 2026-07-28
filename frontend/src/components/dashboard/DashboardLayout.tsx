'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Car, Calendar, CreditCard, Users, Settings,
  BarChart3, Bell, LogOut, Menu, X, ClipboardCheck,
  Crown, Flag, History,
} from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { cn, getDashboardPath } from '@/lib/utils';
import toast from 'react-hot-toast';

const navByRole: Record<string, Array<{ href: string; label: string; icon: typeof LayoutDashboard }>> = {
  customer: [
    { href: '/dashboard/customer', label: 'Overview', icon: LayoutDashboard },
    { href: '/dashboard/customer/bookings', label: 'My Bookings', icon: Calendar },
    { href: '/vehicles', label: 'Browse Vehicles', icon: Car },
    { href: '/dashboard/customer/transactions', label: 'Transactions', icon: CreditCard },
  ],
  owner: [
    { href: '/dashboard/owner', label: 'Overview', icon: LayoutDashboard },
    { href: '/dashboard/owner/vehicles', label: 'My Vehicles', icon: Car },
    { href: '/dashboard/owner/bookings', label: 'Bookings', icon: Calendar },
    { href: '/dashboard/owner/earnings', label: 'Earnings', icon: BarChart3 },
    { href: '/dashboard/owner/subscription', label: 'Subscription', icon: Crown },
  ],
  admin: [
    { href: '/dashboard/admin', label: 'Overview', icon: LayoutDashboard },
    { href: '/dashboard/admin/approvals', label: 'Approvals', icon: ClipboardCheck },
    { href: '/dashboard/admin/users', label: 'Users', icon: Users },
    { href: '/dashboard/admin/login-logs', label: 'Login Logs', icon: History },
    { href: '/dashboard/admin/bookings', label: 'Bookings', icon: Calendar },
    { href: '/dashboard/admin/reports', label: 'Reports', icon: Flag },
    { href: '/dashboard/admin/payments', label: 'Payments', icon: CreditCard },
    { href: '/dashboard/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/dashboard/admin/settings', label: 'Settings', icon: Settings },
  ],
};

export default function DashboardLayout({
  children,
  role,
}: {
  children: React.ReactNode;
  role: 'customer' | 'owner' | 'admin';
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    } else if (user && user.role !== role && user.role !== 'admin') {
      router.push(getDashboardPath(user.role));
    }
  }, [isAuthenticated, user, role, router]);

  const navItems = navByRole[role] || [];

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
    router.push('/');
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen flex">
      <aside className={cn(
        'fixed lg:static inset-y-0 left-0 z-40 w-64 glass-card lg:glass-card-none lg:bg-transparent border-r border-[var(--card-border)] transform transition-transform lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="p-6 border-b border-[var(--card-border)]">
          <Link href="/" className="text-xl font-bold gradient-text">JLR Fleetlink</Link>
          <p className="text-xs text-[var(--muted)] mt-1 capitalize">{role} Dashboard</p>
        </div>
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all',
                pathname === item.href
                  ? 'gradient-bg text-white shadow-lg'
                  : 'hover:bg-[var(--primary)]/10 text-[var(--muted)]'
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
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

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 glass-card border-b border-[var(--card-border)] px-6 py-4 flex items-center justify-between">
          <button className="lg:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X /> : <Menu />}
          </button>
          <div>
            <h1 className="font-semibold">Welcome, {user?.full_name}</h1>
            <p className="text-xs text-[var(--muted)]">{user?.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button className="p-2 rounded-xl hover:bg-[var(--primary)]/10">
              <Bell className="w-5 h-5" />
            </button>
            <div className="w-9 h-9 rounded-full gradient-bg flex items-center justify-center text-white text-sm font-bold">
              {user?.full_name?.charAt(0)}
            </div>
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
    </div>
  );
}
