'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Car,
  ChevronDown,
  MapPin,
  Search,
  Shield,
} from 'lucide-react';
import ProvinceSelect from '@/components/ui/ProvinceSelect';
import { vehicleTypes } from '@/lib/utils';
import { canList, useAuthStore } from '@/store/authStore';

// The "rent out" banner speaks to whoever is looking: guests and owners are invited to list a vehicle,
// customers (who can't list) are sent to find one, and admins go to their dashboard.
const BANNER = {
  owner: {
    title: ['Do You Have', 'Something', 'To Rent?'],
    text: 'List your car, van, truck, or motorcycle and start earning from verified renters nationwide.',
    cta: 'Rent Out Your Vehicle',
    href: '/dashboard/vehicles',
  },
  guest: {
    title: ['Do You Have', 'Something', 'To Rent?'],
    text: 'List your car, van, truck, or motorcycle and start earning from verified renters nationwide.',
    cta: 'Rent Out Your Vehicle',
    href: '/auth/register',
  },
  customer: {
    title: ['Need a Ride?', 'Rent One', 'Today.'],
    text: 'Book verified cars, vans, and motorcycles from owners near you, with payments protected until pickup.',
    cta: 'Browse Vehicles',
    href: '/vehicles',
  },
  admin: {
    title: ['Keep the', 'Platform', 'Running.'],
    text: 'Review verifications, bookings, disputes, and payouts from your admin dashboard.',
    cta: 'Go to Admin Dashboard',
    href: '/dashboard/admin',
  },
} as const;

// Fades the hero picture into the page so it reads as a background, not a framed box: the left side
// fades out behind the text and the right side runs to the edge of the window.
const HERO_IMAGE_MASK = [
  '[mask-image:linear-gradient(to_bottom,transparent,#000_20%,#000_90%,transparent),linear-gradient(to_right,transparent,#000_28%)]',
  '[mask-composite:intersect] [-webkit-mask-composite:source-in]',
].join(' ');

export default function Hero() {
  const { isAuthenticated, user } = useAuthStore();
  const banner = !isAuthenticated || !user ? BANNER.guest
    : user.role === 'admin' ? BANNER.admin
      : canList(user) ? BANNER.owner
        : BANNER.customer;
  const [search, setSearch] = useState({ province: '', type: '' });

  const vehicleHref = useMemo(() => {
    const params = new URLSearchParams();
    if (search.province) params.set('province', search.province);
    if (search.type) params.set('type', search.type);
    return `/vehicles?${params.toString()}`;
  }, [search.province, search.type]);

  return (
    <section className="relative pt-24 pb-10 overflow-hidden bg-white dark:bg-[#07111f]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold mb-4 dark:bg-blue-500/10 dark:text-blue-200">
          <Shield className="w-4 h-4" />
          Rentals across the Philippines — Luzon, Visayas & Mindanao
        </div>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex justify-center mb-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center w-full sm:w-auto gap-1 sm:gap-0 bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl border border-blue-100 dark:border-white/10 rounded-2xl sm:rounded-full shadow-xl shadow-blue-900/10 p-2">
            <label className="flex items-center gap-3 px-5 py-3 rounded-xl sm:rounded-full cursor-pointer hover:bg-blue-50/70 dark:hover:bg-white/5 transition-colors">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-50 text-blue-600 shrink-0 dark:bg-blue-500/10 dark:text-blue-300">
                <MapPin className="w-4 h-4" />
              </span>
              <div className="text-left">
                <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 leading-none mb-1">Where</span>
                <div className="relative flex items-center">
                  <ProvinceSelect
                    className="appearance-none bg-transparent text-sm font-bold text-slate-900 outline-none pr-5 cursor-pointer max-w-[11rem] dark:text-white dark:[&>*]:bg-slate-900"
                    value={search.province}
                    onChange={(province) => setSearch({ ...search, province })}
                    allLabel="Anywhere in the Philippines"
                    ariaLabel="Pickup province"
                  />
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-0 pointer-events-none" />
                </div>
              </div>
            </label>

            <div className="hidden sm:block w-px h-10 bg-[var(--card-border)]" />

            <label className="flex items-center gap-3 px-5 py-3 rounded-xl sm:rounded-full cursor-pointer hover:bg-blue-50/70 dark:hover:bg-white/5 transition-colors">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-50 text-blue-600 shrink-0 dark:bg-blue-500/10 dark:text-blue-300">
                <Car className="w-4 h-4" />
              </span>
              <div className="text-left">
                <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 leading-none mb-1">Categories</span>
                <div className="relative flex items-center">
                  <select
                    className="appearance-none bg-transparent text-sm font-bold text-slate-900 outline-none pr-5 cursor-pointer dark:text-white"
                    value={search.type}
                    onChange={(e) => setSearch({ ...search, type: e.target.value })}
                    aria-label="Vehicle type"
                  >
                    <option value="">Any vehicle</option>
                    {vehicleTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-0 pointer-events-none" />
                </div>
              </div>
            </label>

            <Link
              href={vehicleHref}
              className="flex items-center justify-center gap-2 gradient-bg text-white rounded-xl sm:rounded-full px-6 py-3.5 sm:ml-1 font-semibold text-sm shadow-lg shadow-blue-600/30 hover:opacity-90 transition-opacity"
              aria-label="Search vehicles"
            >
              <Search className="w-4 h-4" />
              <span className="sm:hidden">Search</span>
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Text on the left, vehicles on the right on every screen size. The picture is a background
          behind the whole row; its width sets the row height so nothing is cropped. */}
      <div className="relative">
        <motion.div
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
          className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 w-[64vw] lg:w-[68vw] lg:max-w-[1300px]"
        >
          <Image
            src="/hero.jpg"
            alt="Van, motorcycle, and car available to rent on JLR Fleetlink"
            width={1644}
            height={957}
            priority
            sizes="(min-width: 1024px) 68vw, 64vw"
            className={`w-full h-auto dark:brightness-90 ${HERO_IMAGE_MASK}`}
          />
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full min-h-[40vw] lg:min-h-[min(39.5vw,756px)] flex items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-[48%] sm:max-w-[42%] lg:max-w-md"
          >
            <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-tight mb-3 sm:mb-6 text-[#061934] dark:text-white">
              {banner.title[0]}
              <span className="block text-blue-600 dark:text-blue-500">{banner.title[1]}</span>
              {banner.title[2]}
            </h1>

            <p className="max-w-[82%] lg:max-w-none text-[11px] leading-snug sm:text-base lg:text-lg text-[var(--muted)] mb-4 sm:mb-8">
              {banner.text}
            </p>

            <Link
              href={banner.href}
              className="btn-primary inline-flex items-center whitespace-nowrap gap-1.5 sm:gap-2 !px-4 !py-2.5 !text-xs sm:!px-8 sm:!py-4 sm:!text-base"
            >
              {banner.cta} <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
