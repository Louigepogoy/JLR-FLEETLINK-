'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, Star, Zap } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-violet-500/20 blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card text-sm mb-6"
            >
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span>Trusted by 10,000+ renters nationwide</span>
            </motion.div>

            <h1 className="text-5xl lg:text-7xl font-bold leading-tight mb-6">
              Drive Your
              <span className="gradient-text block">Dream Vehicle</span>
            </h1>

            <p className="text-lg text-[var(--muted)] mb-8 max-w-lg">
              JLR Fleetlink connects you with premium vehicles from verified owners.
              Book instantly, pay securely with GCash or card, and hit the road.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link href="/vehicles" className="btn-primary flex items-center gap-2">
                Browse Vehicles <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/auth/register" className="btn-outline">
                List Your Vehicle
              </Link>
            </div>

            <div className="flex gap-8 mt-10">
              {[
                { icon: Shield, label: 'Verified Owners' },
                { icon: Zap, label: 'Instant Booking' },
                { icon: Star, label: '4.9 Rating' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-sm text-[var(--muted)]">
                  <Icon className="w-4 h-4 text-[var(--primary)]" />
                  {label}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative"
          >
            <div className="glass-card p-6 relative">
              <div className="aspect-video rounded-2xl bg-gradient-to-br from-sky-500/30 to-violet-500/30 flex items-center justify-center overflow-hidden">
                <div className="text-center p-8">
                  <div className="text-8xl mb-4">🚗</div>
                  <p className="text-2xl font-bold">Premium Fleet</p>
                  <p className="text-[var(--muted)]">500+ vehicles available</p>
                </div>
              </div>
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 3 }}
                className="absolute -top-4 -right-4 glass-card px-4 py-2 text-sm font-semibold"
              >
                From ₱1,500/day
              </motion.div>
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ repeat: Infinity, duration: 3, delay: 1 }}
                className="absolute -bottom-4 -left-4 glass-card px-4 py-2 text-sm font-semibold"
              >
                ✓ GCash & Card Accepted
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
