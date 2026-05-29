'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Bike,
  Calendar,
  Car,
  Gauge,
  MapPin,
  Shield,
  ThumbsUp,
  Truck,
} from 'lucide-react';
import { cebuLocations, vehicleTypes } from '@/lib/utils';

export default function Hero() {
  const [search, setSearch] = useState({
    location: 'Cebu City',
    type: '',
    pickupDate: '',
    returnDate: '',
  });

  const vehicleHref = useMemo(() => {
    const params = new URLSearchParams();
    if (search.location) params.set('location', search.location);
    if (search.type) params.set('type', search.type);
    return `/vehicles?${params.toString()}`;
  }, [search.location, search.type]);

  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden bg-white dark:bg-[#07111f]">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute left-0 top-0 h-32 w-32 bg-[radial-gradient(circle,#1769ff_1.5px,transparent_1.5px)] bg-[length:16px_16px] opacity-70" />
        <div className="absolute right-6 bottom-8 h-28 w-28 bg-[radial-gradient(circle,#1769ff_1.5px,transparent_1.5px)] bg-[length:16px_16px] opacity-60" />
        <div className="absolute left-1/2 top-4 h-[620px] w-[620px] -translate-x-1/2 rounded-full border border-blue-200/70" />
        <div className="absolute right-0 top-16 h-[520px] w-[520px] rounded-full bg-blue-600/10 blur-2xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 relative z-10">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-10 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold mb-6 dark:bg-blue-500/10 dark:text-blue-200">
              <Shield className="w-4 h-4" />
              Cebu City and Cebu Province rentals only
            </div>

            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black leading-none mb-5 text-[#061934]">
              GET A
              <span className="block text-blue-600">RIDE</span>
            </h1>

            <p className="text-lg text-[var(--muted)] mb-8 max-w-xl">
              Rent cars, vans, trucks, and motorcycles from verified Cebu owners with fixed
              pickup points and secure payments.
            </p>

            <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl border border-blue-100 dark:border-white/10 rounded-2xl p-3 sm:p-4 shadow-xl shadow-blue-900/10 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                <label className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <select
                    className="h-14 w-full rounded-xl border border-transparent bg-white px-11 text-sm font-medium text-slate-900 outline-none ring-1 ring-slate-200 transition focus:ring-2 focus:ring-blue-500 dark:bg-slate-950 dark:text-white dark:ring-white/10"
                    value={search.location}
                    onChange={(e) => setSearch({ ...search, location: e.target.value })}
                    aria-label="Pickup location"
                  >
                    {cebuLocations.map((location) => (
                      <option key={location.value} value={location.value}>{location.label}</option>
                    ))}
                  </select>
                </label>
                <label className="relative">
                  <Car className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <select
                    className="h-14 w-full rounded-xl border border-transparent bg-white px-11 text-sm font-medium text-slate-900 outline-none ring-1 ring-slate-200 transition focus:ring-2 focus:ring-blue-500 dark:bg-slate-950 dark:text-white dark:ring-white/10"
                    value={search.type}
                    onChange={(e) => setSearch({ ...search, type: e.target.value })}
                    aria-label="Vehicle type"
                  >
                    <option value="">Any vehicle</option>
                    {vehicleTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </label>
                <label className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="date"
                    className="h-14 w-full rounded-xl border border-transparent bg-white px-11 text-sm font-medium text-slate-900 outline-none ring-1 ring-slate-200 transition focus:ring-2 focus:ring-blue-500 dark:bg-slate-950 dark:text-white dark:ring-white/10"
                    value={search.pickupDate}
                    onChange={(e) => setSearch({ ...search, pickupDate: e.target.value })}
                    aria-label="Pickup date"
                  />
                </label>
                <label className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="date"
                    className="h-14 w-full rounded-xl border border-transparent bg-white px-11 text-sm font-medium text-slate-900 outline-none ring-1 ring-slate-200 transition focus:ring-2 focus:ring-blue-500 dark:bg-slate-950 dark:text-white dark:ring-white/10"
                    value={search.returnDate}
                    min={search.pickupDate}
                    onChange={(e) => setSearch({ ...search, returnDate: e.target.value })}
                    aria-label="Return date"
                  />
                </label>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-4">
                <Link href={vehicleHref} className="btn-primary min-h-12 flex items-center justify-center gap-2 px-6">
                  Search Cebu Rides <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/auth/register" className="min-h-12 inline-flex items-center justify-center rounded-xl px-6 font-semibold text-slate-800 transition hover:bg-blue-50 dark:text-slate-100 dark:hover:bg-white/10">
                  List Your Vehicle
                </Link>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm font-semibold text-[#061934] dark:text-slate-100">
              {[
                { icon: Shield, label: 'Reliable' },
                { icon: Gauge, label: 'Fast & Easy' },
                { icon: ThumbsUp, label: 'Trusted' },
              ].map(({ icon: Icon, label }, index) => (
                <div key={label} className="flex items-center gap-3">
                  {index > 0 && <span className="hidden sm:block h-7 w-px bg-blue-300" />}
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-blue-600 text-white">
                    <Icon className="w-5 h-5" />
                  </span>
                  {label}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative min-h-[420px] lg:min-h-[560px]"
          >
            <div className="absolute left-1/2 top-4 h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-gradient-to-br from-blue-500 to-blue-300 lg:h-[500px] lg:w-[500px]" />
            <div className="absolute left-1/2 top-9 h-[390px] w-[390px] -translate-x-1/2 rounded-full border border-blue-200 lg:h-[540px] lg:w-[540px]" />

            <div className="absolute inset-x-0 top-16 flex items-end justify-center gap-2 sm:gap-5 lg:top-28">
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 4 }}
                className="relative z-10 grid h-32 w-36 place-items-center rounded-[2rem] bg-white shadow-2xl shadow-blue-950/20 sm:h-44 sm:w-52"
              >
                <Truck className="h-20 w-20 text-slate-800 sm:h-28 sm:w-28" strokeWidth={1.4} />
                <span className="absolute bottom-4 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">Vans</span>
              </motion.div>
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ repeat: Infinity, duration: 4.5, delay: 0.4 }}
                className="relative z-20 grid h-28 w-28 place-items-center rounded-full bg-slate-950 shadow-2xl shadow-blue-950/30 sm:h-40 sm:w-40"
              >
                <Bike className="h-16 w-16 text-emerald-300 sm:h-24 sm:w-24" strokeWidth={1.4} />
                <span className="absolute -bottom-3 rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-900 shadow-lg">Motor</span>
              </motion.div>
              <motion.div
                animate={{ y: [0, -7, 0] }}
                transition={{ repeat: Infinity, duration: 4.2, delay: 0.8 }}
                className="relative z-10 grid h-32 w-36 place-items-center rounded-[2rem] bg-[#0758c9] shadow-2xl shadow-blue-950/25 sm:h-44 sm:w-52"
              >
                <Car className="h-20 w-20 text-white sm:h-28 sm:w-28" strokeWidth={1.4} />
                <span className="absolute bottom-4 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-blue-700">Cars</span>
              </motion.div>
            </div>

            <div className="absolute bottom-0 left-1/2 w-full max-w-2xl -translate-x-1/2 rounded-[2rem] bg-white/80 px-5 py-5 text-center shadow-xl shadow-blue-950/10 dark:bg-slate-900/80">
              <div className="flex flex-wrap justify-center gap-2 mb-3">
                {['Available in Cebu City', 'Cebu-Wide Pickup Points', 'Cebu Province Verified'].map((chip) => (
                  <span key={chip} className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold dark:bg-blue-500/10 dark:text-blue-200">
                    {chip}
                  </span>
                ))}
              </div>
              <p className="text-2xl sm:text-4xl font-black italic text-[#061934] dark:text-white">
                GET A <span className="text-blue-600">RIDE</span>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
