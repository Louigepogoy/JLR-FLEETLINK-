import Image from 'next/image';
import Link from 'next/link';
import { Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-[var(--card-border)] mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="relative h-11 w-11 overflow-hidden rounded-xl gradient-bg p-1.5">
                <Image src="/logo.png" alt="JLR Fleetlink logo" fill className="object-contain" />
              </div>
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
              <li><Link href="/auth/register" className="hover:text-[var(--primary)]">Become an Owner</Link></li>
              <li><Link href="/auth/login" className="hover:text-[var(--primary)]">Sign In</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-sm text-[var(--muted)]">
              <li><Link href="/help" className="hover:text-[var(--primary)]">Help Center</Link></li>
              <li><Link href="/terms" className="hover:text-[var(--primary)]">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-[var(--primary)]">Privacy Policy</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-sm text-[var(--muted)]">
              <li className="flex items-center gap-2"><Mail className="w-4 h-4" /> support@jlrfleetlink.com</li>
              <li className="flex items-center gap-2"><Phone className="w-4 h-4" /> +63 930 550 3346</li>
              <li className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Cebu, Philippines</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[var(--card-border)] mt-8 pt-8 text-center text-sm text-[var(--muted)]">
          © {new Date().getFullYear()} JLR Fleetlink. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
