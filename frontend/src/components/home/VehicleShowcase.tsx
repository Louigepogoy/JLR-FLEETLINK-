'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import api from '@/lib/api';
import VehicleCard from '@/components/vehicles/VehicleCard';
import { VehicleCardSkeleton } from '@/components/ui/Skeleton';

export default function VehicleShowcase() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/vehicles', { params: { status: 'available' } })
      .then((res) => setVehicles(res.data.data.slice(0, 3)))
      .catch(() => setVehicles([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="py-12 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-end mb-6 sm:mb-10">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            <h2 className="text-2xl sm:text-4xl font-bold mb-2">Featured <span className="gradient-text">Vehicles</span></h2>
            <p className="text-[var(--muted)]">Hand-picked premium vehicles ready to book</p>
          </motion.div>
          <Link href="/vehicles" className="btn-outline flex shrink-0 items-center gap-2 text-sm">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Phones: a sideways swipe row instead of a long stack of cards. */}
        <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-2 md:gap-6 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="w-[82%] shrink-0 snap-start md:w-auto"><VehicleCardSkeleton /></div>)
            : vehicles.length > 0
            ? vehicles.map((v: never, i: number) => (
              <div key={(v as {id: string}).id} className="w-[82%] shrink-0 snap-start md:w-auto">
                <VehicleCard vehicle={v as never} index={i} />
              </div>
            ))
            : (
              <div className="w-full col-span-3 text-center py-12 glass-card">
                <p className="text-[var(--muted)]">No vehicles available yet. Check back soon!</p>
                <Link href="/auth/register" className="btn-primary inline-block mt-4 text-sm">Become an Owner</Link>
              </div>
            )}
        </div>
      </div>
    </section>
  );
}
