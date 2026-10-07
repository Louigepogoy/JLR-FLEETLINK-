'use client';

import Link from 'next/link';
import { Mail, Phone, MapPin } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getDashboardPath } from '@/lib/utils';
import BrandLogo from '@/components/ui/BrandLogo';

export default function Footer() {
  const { user, isAuthenticated } = useAuthStore();

  return (
    <footer className="border-t border-[var(--card-border)] mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <BrandLogo />
              <span className="text-xl font-bold gradient-text">JLR Fleetlink</span>
            </div>
            <p className="text-sm text-[var(--muted)]">
              Premium vehicle rental platform connecting customers with trusted vehicle owners across the Philippines.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-[var(--muted)]">
              <li><Link href="/vehicles" className="hover:text-[var(--primary)]">Browse Vehicles</Link></li>
              {isAuthenticated ? (
                <li><Link href={getDashboardPath(user?.role || 'user')} className="hover:text-[var(--primary)]">Dashboard</Link></li>
              ) : (
                <>
                  <li><Link href="/auth/register" className="hover:text-[var(--primary)]">Become an Owner</Link></li>
                  <li><Link href="/auth/login" className="hover:text-[var(--primary)]">Sign In</Link></li>
                </>
              )}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-sm text-[var(--muted)]">
              <li><Link href="/help" className="hover:text-[var(--primary)]">Help Center</Link></li>
              <li><Link href="/#protection" className="hover:text-[var(--primary)]">Renter Protection</Link></li>
              <li><a href="mailto:support@jlrfleetlink.com" className="hover:text-[var(--primary)]">Email Support</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-[var(--muted)]">
              <li><Link href="/terms" className="hover:text-[var(--primary)]">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-[var(--primary)]">Privacy Policy</Link></li>
              <li><Link href="/refund-policy" className="hover:text-[var(--primary)]">Refund &amp; Dispute Policy</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-sm text-[var(--muted)]">
              <li className="flex items-center gap-2"><Mail className="w-4 h-4" /> support@jlrfleetlink.com</li>
              <li className="flex items-center gap-2"><Phone className="w-4 h-4" /> +63 930 550 3346</li>
              <li className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Serving the whole Philippines</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[var(--card-border)] mt-8 pt-8 text-center text-sm text-[var(--muted)]">
          <p>© {new Date().getFullYear()} JLR Fleetlink. All rights reserved.</p>
          <p className="mt-1 text-xs">Payments are processed securely by PayMongo.</p>
        </div>
      </div>
    </footer>
  );
}
