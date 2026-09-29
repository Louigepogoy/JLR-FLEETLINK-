'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, Filter, MapPin, SearchX, LayoutGrid, Map as MapIcon } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import VehicleCard from '@/components/vehicles/VehicleCard';
import EmptyState from '@/components/ui/EmptyState';
import ProvinceSelect from '@/components/ui/ProvinceSelect';
import { VehicleCardSkeleton } from '@/components/ui/Skeleton';
import { PhilippinesVehicleMap, type MapVehicle } from '@/components/maps';
import api from '@/lib/api';
import { cn, vehicleTypes } from '@/lib/utils';

type Filters = { search: string; type: string; province: string; location: string; minPrice: string; maxPrice: string };

const toParams = (filters: Filters) => {
  const params: Record<string, string> = { status: 'available' };
  if (filters.search) params.search = filters.search;
  if (filters.type) params.type = filters.type;
  if (filters.province) params.province = filters.province;
  if (filters.location) params.location = filters.location;
  if (filters.minPrice) params.minPrice = filters.minPrice;
  if (filters.maxPrice) params.maxPrice = filters.maxPrice;
  return params;
};

function VehiclesContent() {
  const searchParams = useSearchParams();
  const [vehicles, setVehicles] = useState<MapVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'map'>(searchParams.get('view') === 'map' ? 'map' : 'list');
  const [filters, setFilters] = useState<Filters>({
    search: '',
    type: searchParams.get('type') || '',
    province: searchParams.get('province') || '',
    location: searchParams.get('location') || '',
    minPrice: '',
    maxPrice: '',
  });

  // Whether the last applied search was narrowed to a place (the map then zooms to its pins).
  const [placeFiltered, setPlaceFiltered] = useState(Boolean(filters.province || filters.location));

  const fetchVehicles = async () => {
    setLoading(true);
    setPlaceFiltered(Boolean(filters.province || filters.location));
    try {
      const res = await api.get('/vehicles', { params: toParams(filters) });
      setVehicles(res.data.data);
    } catch {
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get('/vehicles', { params: toParams(filters) })
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
            <h1 className="text-4xl font-bold mb-2">Browse <span className="gradient-text">Vehicles Nationwide</span></h1>
            <p className="text-[var(--muted)]">Find verified rentals anywhere in the Philippines — Luzon, Visayas, and Mindanao</p>
          </motion.div>

          <div className="glass-card p-4 mb-6">
            {/* !pl-10: .input-field sets its own padding, which would otherwise win over pl-10. */}
            <div className="grid md:grid-cols-4 lg:grid-cols-12 gap-4">
              <div className="md:col-span-2 lg:col-span-3 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                <input
                  className="input-field !pl-10"
                  placeholder="Search brand, model..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>
              <ProvinceSelect
                className="input-field md:col-span-2 lg:col-span-2"
                value={filters.province}
                onChange={(province) => setFilters({ ...filters, province })}
                allLabel="All provinces"
              />
              <div className="relative md:col-span-2 lg:col-span-2">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                <input
                  className="input-field !pl-10"
                  placeholder="City or area"
                  value={filters.location}
                  onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                />
              </div>
              <select className="input-field md:col-span-2 lg:col-span-2" value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
                <option value="">All Types</option>
                {vehicleTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input className="input-field" type="number" min="0" placeholder="Min ₱"
                value={filters.minPrice} onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })} />
              <input className="input-field" type="number" min="0" placeholder="Max ₱"
                value={filters.maxPrice} onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })} />
              <button onClick={fetchVehicles} className="btn-primary flex items-center justify-center gap-2 !px-3 md:col-span-4 lg:col-span-1">
                <Filter className="w-4 h-4" /> Filter
              </button>
            </div>
          </div>

          <div className="mb-6 flex items-center justify-between gap-3">
            <p className="text-sm text-[var(--muted)]">
              {loading ? 'Searching...' : `${vehicles.length} vehicle${vehicles.length === 1 ? '' : 's'} found${filters.province ? ` in ${filters.province}` : ' across the Philippines'}`}
            </p>
            <div className="flex rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-1" role="tablist" aria-label="View">
              {([['list', LayoutGrid, 'List'], ['map', MapIcon, 'Map']] as const).map(([key, Icon, label]) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={view === key}
                  onClick={() => setView(key)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                    view === key ? 'gradient-bg text-white shadow' : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                  )}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>
          </div>

          {view === 'map' ? (
            <div className="glass-card overflow-hidden p-2">
              <PhilippinesVehicleMap vehicles={vehicles} zoomToPins={placeFiltered} className="h-[70vh] min-h-[420px]" />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <VehicleCardSkeleton key={i} />)
                : vehicles.length > 0
                ? vehicles.map((v, i) => <VehicleCard key={v.id} vehicle={v as never} index={i} />)
                : (
                  <div className="col-span-3">
                    <EmptyState
                      icon={SearchX}
                      title="No vehicles found"
                      description="Try another province or city, or adjust your filters."
                    />
                  </div>
                )}
            </div>
          )}
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
