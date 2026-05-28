'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import VehicleCard from '@/components/vehicles/VehicleCard';
import { VehicleCardSkeleton } from '@/components/ui/Skeleton';
import api from '@/lib/api';
import { vehicleTypes } from '@/lib/utils';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', type: '', location: '', minPrice: '', maxPrice: '' });

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { status: 'available' };
      if (filters.search) params.search = filters.search;
      if (filters.type) params.type = filters.type;
      if (filters.location) params.location = filters.location;
      if (filters.minPrice) params.minPrice = filters.minPrice;
      if (filters.maxPrice) params.maxPrice = filters.maxPrice;
      const res = await api.get('/vehicles', { params });
      setVehicles(res.data.data);
    } catch {
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVehicles(); }, []);

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Browse <span className="gradient-text">Vehicles</span></h1>
            <p className="text-[var(--muted)]">Find your perfect ride from our premium fleet</p>
          </motion.div>

          <div className="glass-card p-4 mb-8">
            <div className="grid md:grid-cols-5 gap-4">
              <div className="md:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                <input
                  className="input-field pl-10"
                  placeholder="Search brand, model..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>
              <select className="input-field" value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
                <option value="">All Types</option>
                {vehicleTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input className="input-field" placeholder="Location"
                value={filters.location} onChange={(e) => setFilters({ ...filters, location: e.target.value })} />
              <button onClick={fetchVehicles} className="btn-primary flex items-center justify-center gap-2">
                <Filter className="w-4 h-4" /> Filter
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <VehicleCardSkeleton key={i} />)
              : vehicles.length > 0
              ? vehicles.map((v: never, i: number) => <VehicleCard key={(v as {id: string}).id} vehicle={v as never} index={i} />)
              : (
                <div className="col-span-3 text-center py-16 glass-card">
                  <p className="text-[var(--muted)]">No vehicles found. Try adjusting your filters.</p>
                </div>
              )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
