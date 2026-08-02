'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, Filter, MapPin, SearchX } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import VehicleCard from '@/components/vehicles/VehicleCard';
import EmptyState from '@/components/ui/EmptyState';
import { VehicleCardSkeleton } from '@/components/ui/Skeleton';
import api from '@/lib/api';
import { cebuLocations, vehicleTypes } from '@/lib/utils';

function VehiclesContent() {
  const searchParams = useSearchParams();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    type: searchParams.get('type') || '',
    location: searchParams.get('area') === 'nearby' ? 'nearby-cebu' : searchParams.get('location') || '',
    minPrice: '',
    maxPrice: '',
  });

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { status: 'available' };
      if (filters.search) params.search = filters.search;
      if (filters.type) params.type = filters.type;
      if (filters.location === 'nearby-cebu') params.area = 'nearby';
      else if (filters.location) params.location = filters.location;
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

  useEffect(() => {
    const params: Record<string, string> = { status: 'available' };
    if (filters.type) params.type = filters.type;
    if (filters.location === 'nearby-cebu') params.area = 'nearby';
    else if (filters.location) params.location = filters.location;

    api.get('/vehicles', { params })
      .then((res) => setVehicles(res.data.data))
      .catch(() => setVehicles([]))
      .finally(() => setLoading(false));
    // Initial load only uses URL-provided filters. The button applies later edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Browse <span className="gradient-text">Cebu Vehicles</span></h1>
            <p className="text-[var(--muted)]">Find verified rentals in Cebu City and nearby Cebu areas only</p>
          </motion.div>

          <div className="glass-card p-4 mb-8">
            <div className="flex flex-wrap gap-2 mb-4">
              {['Available in Cebu City', 'Cebu-Wide Pickup Points', 'Cebu Province Verified'].map((chip) => (
                <span key={chip} className="px-3 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-semibold">
                  {chip}
                </span>
              ))}
            </div>
            <div className="grid md:grid-cols-6 gap-4">
              <div className="md:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                <input
                  className="input-field pl-10"
                  placeholder="Search brand, model..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>
              <select className="input-field" value={filters.location}
                onChange={(e) => setFilters({ ...filters, location: e.target.value })}>
                <option value="">All Cebu areas</option>
                <option value="Cebu City">Cebu City</option>
                <option value="nearby-cebu">Nearby Cebu areas</option>
                {cebuLocations.filter((location) => location.value !== 'Cebu City').map((location) => (
                  <option key={location.value} value={location.value}>{location.label}</option>
                ))}
              </select>
              <select className="input-field" value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
                <option value="">All Types</option>
                {vehicleTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input className="input-field" type="number" min="0" placeholder="Min price"
                value={filters.minPrice} onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })} />
              <input className="input-field" type="number" min="0" placeholder="Max price"
                value={filters.maxPrice} onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })} />
              <button onClick={fetchVehicles} className="btn-primary flex items-center justify-center gap-2 md:col-span-6 lg:col-span-1">
                <Filter className="w-4 h-4" /> Filter
              </button>
            </div>
            <p className="mt-3 text-xs text-[var(--muted)] flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Listings outside Cebu Province are not accepted.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <VehicleCardSkeleton key={i} />)
              : vehicles.length > 0
              ? vehicles.map((v: never, i: number) => <VehicleCard key={(v as {id: string}).id} vehicle={v as never} index={i} />)
              : (
                <div className="col-span-3">
                  <EmptyState
                    icon={SearchX}
                    title="No Cebu vehicles found"
                    description="Try adjusting your filters or search a different area."
                  />
                </div>
              )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function VehiclesPage() {
  return (
    <Suspense fallback={
      <>
        <Navbar />
        <main className="pt-24 pb-16 min-h-screen">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="skeleton h-12 w-72 mb-8" />
            <div className="glass-card p-4 mb-8">
              <div className="skeleton h-12 w-full" />
            </div>
          </div>
        </main>
        <Footer />
      </>
    }>
      <VehiclesContent />
    </Suspense>
  );
}
