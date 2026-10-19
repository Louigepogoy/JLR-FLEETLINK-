'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Filter, MapPin, SearchX, LayoutGrid, Map as MapIcon, LocateFixed, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import VehicleCard from '@/components/vehicles/VehicleCard';
import EmptyState from '@/components/ui/EmptyState';
import ProvinceSelect from '@/components/ui/ProvinceSelect';
import { VehicleCardSkeleton } from '@/components/ui/Skeleton';
import { PhilippinesVehicleMap, type MapVehicle } from '@/components/maps';
import api from '@/lib/api';
import { cn, formatCurrency, vehicleTypes } from '@/lib/utils';
import { getProvince, islandGroups, type IslandGroup } from '@/lib/philippines';
import { useBarangayOptions, useCityOptions } from '@/lib/usePlaceOptions';
import OptionCombobox from '@/components/ui/OptionCombobox';

type Filters = { brand: string; model: string; type: string; islandGroup: string; province: string; city: string; barangay: string; location: string; minPrice: string; maxPrice: string };

// Quick price ranges (per day) shown under the filters.
const PRICE_PRESETS: { label: string; min: string; max: string }[] = [
  { label: 'Any price', min: '', max: '' },
  { label: 'Under ₱3,000', min: '', max: '2999' },
  { label: '₱3,000 – ₱5,000', min: '3000', max: '5000' },
  { label: '₱5,000 – ₱7,000', min: '5000', max: '7000' },
  { label: '₱7,000 and up', min: '7000', max: '' },
];

// The renter's current location for "nearest first". Only sent with the search, never saved.
type Near = { lat: number; lng: number } | null;

const toParams = (filters: Filters, near: Near) => {
  const params: Record<string, string> = { status: 'available' };
  if (near) {
    params.nearLat = String(near.lat);
    params.nearLng = String(near.lng);
  }
  if (filters.brand) params.brand = filters.brand;
  if (filters.model) params.model = filters.model;
  if (filters.type) params.type = filters.type;
  if (filters.province) params.province = filters.province;
  else if (filters.islandGroup) params.islandGroup = filters.islandGroup;
  if (filters.city) params.city = filters.city;
  if (filters.barangay) params.barangay = filters.barangay;
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
    brand: '',
    model: '',
    type: searchParams.get('type') || '',
    islandGroup: '',
    province: searchParams.get('province') || '',
    city: '',
    barangay: '',
    location: searchParams.get('location') || '',
    minPrice: '',
    maxPrice: '',
  });

  // Whether the last applied search was narrowed to a place (the map then zooms to its pins).
  const { options: cityOptions, loading: citiesLoading } = useCityOptions(filters.province, getProvince(filters.province)?.cities);
  const { options: barangayOptions, loading: barangaysLoading } = useBarangayOptions(filters.province, filters.city);

  const [placeFiltered, setPlaceFiltered] = useState(Boolean(filters.islandGroup || filters.province || filters.city || filters.barangay || filters.location));
  const [brandOptions, setBrandOptions] = useState<Record<string, string[]>>({});
  useEffect(() => {
    api.get('/vehicles/brands').then((res) => setBrandOptions(res.data.data)).catch(() => {});
  }, []);
  // With a brand picked, only its models; otherwise every model, without duplicates.
  const modelChoices = filters.brand
    ? brandOptions[filters.brand] || []
    : Array.from(new Set(Object.values(brandOptions).flat())).sort();
  const [near, setNear] = useState<Near>(null);
  // Starts true: the page asks for the location automatically on load.
  const [locating, setLocating] = useState(true);

  // The location answer and the price typing both call fetchVehicles later, so it reads the latest filters from
  // refs instead of the (possibly outdated) ones of the render that created it.
  const filtersRef = useRef(filters);
  const nearRef = useRef<Near>(null);
  const latestRequest = useRef(0);
  useEffect(() => { filtersRef.current = filters; }, [filters]);
  useEffect(() => { nearRef.current = near; }, [near]);

  const fetchVehicles = async (nearOverride: Near = nearRef.current) => {
    const current = filtersRef.current;
    const requestId = ++latestRequest.current;
    setLoading(true);
    setPlaceFiltered(Boolean(current.islandGroup || current.province || current.city || current.barangay || current.location));
    try {
      const res = await api.get('/vehicles', { params: toParams(current, nearOverride) });
      if (requestId === latestRequest.current) setVehicles(res.data.data);
    } catch {
      if (requestId === latestRequest.current) setVehicles([]);
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  };

  // Price range: typed values are checked, and the list refreshes by itself shortly after typing stops.
  const minNum = filters.minPrice === '' ? null : Number(filters.minPrice);
  const maxNum = filters.maxPrice === '' ? null : Number(filters.maxPrice);
  const priceError = (minNum !== null && minNum < 0) || (maxNum !== null && maxNum < 0)
    ? "Prices can't be negative."
    : minNum !== null && maxNum !== null && minNum > maxNum
      ? "The minimum price can't be higher than the maximum."
      : '';
  const firstPriceRun = useRef(true);
  useEffect(() => {
    if (firstPriceRun.current) { firstPriceRun.current = false; return; }
    if (priceError) return;
    const timer = setTimeout(() => { fetchVehicles(); }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.minPrice, filters.maxPrice]);
  const priceActive = filters.minPrice !== '' || filters.maxPrice !== '';
  const priceLabel = filters.minPrice !== '' && filters.maxPrice !== ''
    ? `${formatCurrency(Number(filters.minPrice))} – ${formatCurrency(Number(filters.maxPrice))}`
    : filters.minPrice !== '' ? `${formatCurrency(Number(filters.minPrice))} and up` : `up to ${formatCurrency(Number(filters.maxPrice))}`;

  // Asks the browser for the renter's location; on success lists vehicles nearest first with their distance.
  // `silent` (the automatic request on page load) skips error toasts: the normal list just stays.
  const locate = (silent: boolean) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setNear(current);
        setLocating(false);
        fetchVehicles(current);
      },
      (err) => {
        setLocating(false);
        if (silent) return;
        toast.error(err.code === err.PERMISSION_DENIED
          ? 'Location permission was denied. Allow it in your browser to see vehicles near you.'
          : 'Could not get your location. Please try again.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  };

  // The manual "Sort by distance" button, shown if the automatic request was blocked or sorting was turned off.
  const requestLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Your browser does not support location');
      return;
    }
    setLocating(true);
    locate(false);
  };

  useEffect(() => {
    // Show the normal list right away, then re-sort nearest first once the location arrives.
    api.get('/vehicles', { params: toParams(filters, null) })
      .then((res) => setVehicles(res.data.data))
      .catch(() => setVehicles([]))
      .finally(() => setLoading(false));
    if (navigator.geolocation) locate(true);
    else Promise.resolve().then(() => setLocating(false));
    // Initial load only uses URL-provided filters. The button applies later edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearNear = () => {
    setNear(null);
    fetchVehicles(null);
  };

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
              <select
                className="input-field md:col-span-2 lg:col-span-2"
                value={filters.brand}
                aria-label="Brand"
                onChange={(e) => setFilters({ ...filters, brand: e.target.value, model: '' })}
              >
                <option value="">All Brands</option>
                {Object.keys(brandOptions).map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              <select
                className="input-field md:col-span-2 lg:col-span-2"
                value={filters.model}
                aria-label="Model"
                onChange={(e) => setFilters({ ...filters, model: e.target.value })}
              >
                <option value="">All Models</option>
                {modelChoices.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <select
                className="input-field md:col-span-2 lg:col-span-2"
                value={filters.islandGroup}
                aria-label="Island group"
                onChange={(e) => setFilters({ ...filters, islandGroup: e.target.value, province: '', city: '', barangay: '' })}
              >
                <option value="">Luzon, Visayas &amp; Mindanao</option>
                {islandGroups.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              <ProvinceSelect
                className="input-field md:col-span-2 lg:col-span-2"
                value={filters.province}
                group={filters.islandGroup as IslandGroup | ''}
                onChange={(province) => setFilters({ ...filters, province, city: '', barangay: '' })}
                allLabel={filters.islandGroup ? `All ${filters.islandGroup} provinces` : 'All provinces'}
              />
              <div className="relative md:col-span-2 lg:col-span-2">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                <OptionCombobox
                  className="input-field !pl-10"
                  placeholder={filters.province ? 'City or municipality' : 'Pick a province first'}
                  disabled={!filters.province}
                  loading={citiesLoading}
                  options={cityOptions}
                  value={filters.city}
                  onChange={(city) => setFilters((prev) => ({ ...prev, city, barangay: prev.city === city ? prev.barangay : '' }))}
                />
              </div>
              <div className="relative md:col-span-2 lg:col-span-2">
                <OptionCombobox
                  className="input-field"
                  placeholder={filters.city ? 'Barangay / area' : 'Pick a city first'}
                  disabled={!filters.city}
                  loading={barangaysLoading}
                  options={barangayOptions}
                  value={filters.barangay}
                  onChange={(barangay) => setFilters((prev) => ({ ...prev, barangay }))}
                />
              </div>
              <select className="input-field md:col-span-2 lg:col-span-2" value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
                <option value="">All Types</option>
                {vehicleTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input className={cn('input-field', priceError && 'ring-2 ring-red-500/60')} type="number" min="0" step="100" inputMode="numeric"
                placeholder="Min ₱ / day" aria-label="Minimum price per day"
                value={filters.minPrice} onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })} />
              <input className={cn('input-field', priceError && 'ring-2 ring-red-500/60')} type="number" min="0" step="100" inputMode="numeric"
                placeholder="Max ₱ / day" aria-label="Maximum price per day"
                value={filters.maxPrice} onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })} />
              <button onClick={() => fetchVehicles()} disabled={Boolean(priceError)} className="btn-primary flex items-center justify-center gap-2 !px-3 disabled:opacity-60 md:col-span-4 lg:col-span-1">
                <Filter className="w-4 h-4" /> Filter
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Price range">
              <span className="text-xs font-medium text-[var(--muted)]">Price per day:</span>
              {PRICE_PRESETS.map((p) => {
                const selected = filters.minPrice === p.min && filters.maxPrice === p.max;
                return (
                  <button
                    key={p.label}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setFilters({ ...filters, minPrice: p.min, maxPrice: p.max })}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                      selected
                        ? 'border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--primary)]'
                        : 'border-[var(--card-border)] text-[var(--muted)] hover:border-[var(--primary)]/50 hover:text-[var(--foreground)]'
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
            {priceError && <p className="mt-2 text-xs font-medium text-red-500">{priceError}</p>}
          </div>

          {filters.location && (
            <p className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-[var(--primary)]/10 py-1 pl-3 pr-1 text-xs font-semibold text-[var(--primary)]">
              <MapPin className="h-3.5 w-3.5" /> Area: {filters.location}
              <button onClick={() => setFilters({ ...filters, location: '' })} className="rounded-full p-0.5 hover:bg-[var(--primary)]/15" aria-label="Clear area">
                <X className="h-3.5 w-3.5" />
              </button>
            </p>
          )}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {priceActive && !priceError && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--primary)]/10 py-1 pl-3 pr-1 text-xs font-semibold text-[var(--primary)]">
                  Price: {priceLabel} / day
                  <button onClick={() => setFilters({ ...filters, minPrice: '', maxPrice: '' })} className="rounded-full p-0.5 hover:bg-[var(--primary)]/15" aria-label="Clear price range">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              )}
              <p className="text-sm text-[var(--muted)]">
                {loading ? 'Searching...' : `${vehicles.length} vehicle${vehicles.length === 1 ? '' : 's'} found${filters.city ? ` in ${filters.barangay ? `${filters.barangay}, ` : ''}${filters.city}` : filters.province ? ` in ${filters.province}` : filters.islandGroup ? ` in ${filters.islandGroup}` : ' across the Philippines'}`}
              </p>
              {near ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--primary)]/10 py-1 pl-3 pr-1 text-xs font-semibold text-[var(--primary)]">
                  <LocateFixed className="h-3.5 w-3.5" /> Nearest to you first
                  <button onClick={clearNear} className="rounded-full p-0.5 hover:bg-[var(--primary)]/15" aria-label="Stop sorting by distance">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ) : locating ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--primary)]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Finding vehicles near you...
                </span>
              ) : (
                // Only shown if the automatic location request was blocked/failed, or the user turned sorting off.
                <button
                  onClick={requestLocation}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--primary)] px-3 py-1 text-xs font-semibold text-[var(--primary)] transition hover:bg-[var(--primary)]/10"
                >
                  <LocateFixed className="h-3.5 w-3.5" /> Sort by distance
                </button>
              )}
            </div>
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
                      description={priceActive ? 'Try a wider price range, another province or city, or adjust your filters.' : 'Try another province or city, or adjust your filters.'}
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
