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
import { cebuLocations, vehicleTypes } from '@/lib/utils';

export default function Hero() {
  const [search, setSearch] = useState({ location: 'Cebu City', type: '' });

  const vehicleHref = useMemo(() => {
    const params = new URLSearchParams();
    if (search.location) params.set('location', search.location);
    if (search.type) params.set('type', search.type);
    return `/vehicles?${params.toString()}`;
  }, [search.location, search.type]);

  return (
    <section className="relative min-h-screen flex items-center pt-24 pb-14 overflow-hidden bg-white dark:bg-[#07111f]">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute right-0 top-16 h-[520px] w-[520px] rounded-full bg-blue-600/10 blur-2xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold mb-6 dark:bg-blue-500/10 dark:text-blue-200">
          <Shield className="w-4 h-4" />
          Cebu City and Cebu Province rentals only
        </div>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex justify-center mb-14"
        >
          <div className="flex flex-col sm:flex-row sm:items-center w-full sm:w-auto gap-1 sm:gap-0 bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl border border-blue-100 dark:border-white/10 rounded-2xl sm:rounded-full shadow-xl shadow-blue-900/10 p-2">
            <label className="flex items-center gap-3 px-5 py-3 rounded-xl sm:rounded-full cursor-pointer hover:bg-blue-50/70 dark:hover:bg-white/5 transition-colors">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-50 text-blue-600 shrink-0 dark:bg-blue-500/10 dark:text-blue-300">
                <MapPin className="w-4 h-4" />
              </span>
              <div className="text-left">
                <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 leading-none mb-1">Where Nearby</span>
                <div className="relative flex items-center">
                  <select
                    className="appearance-none bg-transparent text-sm font-bold text-slate-900 outline-none pr-5 cursor-pointer dark:text-white"
                    value={search.location}
                    onChange={(e) => setSearch({ ...search, location: e.target.value })}
                    aria-label="Pickup location"
                  >
                    {cebuLocations.map((location) => (
                      <option key={location.value} value={location.value}>{location.label}</option>
                    ))}
                  </select>
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

        <div className="grid lg:grid-cols-[0.7fr_1.3fr] gap-10 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-6 text-[#061934] dark:text-white">
              Do You Have
              <span className="block text-blue-600">Something</span>
              To Rent?
            </h1>

            <p className="text-lg text-[var(--muted)] mb-8 max-w-md">
              List your car, van, truck, or motorcycle and start earning from verified Cebu renters.
            </p>

            <Link href="/auth/register" className="btn-primary inline-flex items-center gap-2 px-8 py-4 text-base">
              Rent Out Your Vehicle <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative"
          >
            <motion.div
              animate={{ y: [0, -16, 0], rotate: [0, 0.6, 0, -0.6, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Image
                src="/hero.jpg"
                alt="Van, motorcycle, and car available to rent on JLR Fleetlink"
                width={1644}
                height={957}
                priority
                className="w-full h-auto"
              />
            </motion.div>
            <motion.div
              animate={{ scaleX: [1, 0.85, 1], opacity: [0.35, 0.15, 0.35] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute left-1/2 bottom-4 -translate-x-1/2 w-2/3 h-6 rounded-full bg-blue-900/30 blur-xl"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
