'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Car, Crown, MapPin, Pencil, Plus, ShieldAlert, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { IconChip, MyVehicleIcon } from '@/components/illustrations/MiniIcons';
import EmptyState from '@/components/ui/EmptyState';
import ImageGallery from '@/components/vehicles/ImageGallery';
import MaintenanceDates from '@/components/vehicles/MaintenanceDates';
import VehicleProofUpload, { emptyProofPhotos, type ProofPhotoState } from '@/components/vehicles/VehicleProofUpload';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency, vehicleProofSlots, vehicleTypes } from '@/lib/utils';
import { formatPlace, getProvince, PHILIPPINES_CENTER } from '@/lib/philippines';
import { geocodeCity, geocodeWithinCity } from '@/lib/geocode';
import ProvinceSelect from '@/components/ui/ProvinceSelect';
import PlaceAutocomplete from '@/components/ui/PlaceAutocomplete';
import { LocationPickerMap } from '@/components/maps';

type OwnerVehicle = {
  id: string;
  title: string;
  brand: string;
  model: string;
  plate_number?: string;
  year: number;
  vehicle_type: string;
  transmission: string;
  fuel_type: string;
  seats: number;
  price_per_day: number;
  description?: string;
  status: string;
  location: string;
  province?: string;
  city?: string;
  barangay?: string;
  pickup_address?: string;
  latitude?: number;
  longitude?: number;
  images?: string[];
  proof_photos?: Record<string, string>;
  driver_available?: boolean;
  driver_fee_per_day?: number;
  verification_status?: 'unreviewed' | 'approved' | 'rejected' | 'needs_more_info';
  verification_notes?: string | null;
};

type OwnerSubscription = {
  plan_id: 'basic' | 'pro' | 'premium' | 'enterprise';
  plan_name: string;
  vehicle_limit: number;
  status: string;
} | null;

const defaultVehicleLimit = 5;
const PH_MAP_FOCUS = { lat: PHILIPPINES_CENTER.lat, lng: PHILIPPINES_CENTER.lng, zoom: 5 };

const emptyForm = {
  title: '',
  brand: '',
  model: '',
  plateNumber: '',
  year: new Date().getFullYear(),
  vehicleType: 'Sedan',
  transmission: 'Automatic',
  fuelType: 'Gasoline',
  seats: 4,
  pricePerDay: '',
  province: '',
  city: '',
  barangay: '',
  pickupAddress: '',
  latitude: PHILIPPINES_CENTER.lat,
  longitude: PHILIPPINES_CENTER.lng,
  description: '',
  driverAvailable: false,
  driverFeePerDay: '',
};

export default function MyVehiclesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<OwnerVehicle[]>([]);
  const [subscription, setSubscription] = useState<OwnerSubscription>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<OwnerVehicle | null>(null);
  const [proofPhotos, setProofPhotos] = useState<ProofPhotoState>(emptyProofPhotos());
  const [form, setForm] = useState(emptyForm);

  // Where the pickup map is centered; moves when a province is chosen or a vehicle is opened, but not
  // when the owner clicks/drags the pin.
  const [mapFocus, setMapFocus] = useState(PH_MAP_FOCUS);
  const selectedProvince = useMemo(() => getProvince(form.province), [form.province]);
  const vehicleLimit = Number(subscription?.vehicle_limit || defaultVehicleLimit);
  const planName = subscription?.plan_name || 'Basic';
  const isAtVehicleLimit = vehicles.length >= vehicleLimit;

  const fetchVehicles = () => api.get('/vehicles/owner/my-vehicles').then((res) => setVehicles(res.data.data)).catch(() => {});
  const fetchSubscription = () => api.get('/subscriptions/me').then((res) => setSubscription(res.data.data)).catch(() => setSubscription(null));
  useEffect(() => {
    Promise.all([fetchVehicles(), fetchSubscription()]).finally(() => setLoading(false));
  }, []);

  const resetForm = () => {
    setEditingVehicle(null);
    setForm(emptyForm);
    setMapFocus(PH_MAP_FOCUS);
    cancelLocate();
    setProofPhotos(emptyProofPhotos());
    setShowForm(false);
  };

  // Moves the pin to what the owner typed: the pickup landmark, else the barangay, else the city center.
  // Runs when a field is finished; a newer run (or a province change) makes older results stale.
  const [locating, setLocating] = useState(false);
  const locateRun = useRef(0);
  const lastLocated = useRef('');
  const cancelLocate = () => {
    locateRun.current += 1;
    lastLocated.current = '';
    setLocating(false);
  };

  const locateKey = (values: typeof emptyForm) =>
    [values.province, values.city, values.barangay, values.pickupAddress].map((v) => v.trim().toLowerCase()).join('|');

  const locatePin = async (values: typeof emptyForm) => {
    const province = getProvince(values.province);
    const city = values.city.trim();
    const barangay = values.barangay.trim();
    const pickup = values.pickupAddress.trim();
    if (!province || !city) return;
    const key = locateKey(values);
    if (key === lastLocated.current) return;
    lastLocated.current = key;

    const run = ++locateRun.current;
    setLocating(true);
    try {
      const cityPoint = await geocodeCity(city, province.name, province);
      if (run !== locateRun.current) return;
      let point = cityPoint;
      let zoom = 14;
      for (const [place, placeZoom] of [[pickup, 17], [barangay, 16]] as const) {
        if (!place) continue;
        const hit = await geocodeWithinCity(place, city, cityPoint || province);
        if (run !== locateRun.current) return;
        if (hit) {
          point = hit;
          zoom = placeZoom;
          break;
        }
      }
      if (!point) {
        toast('Could not find that place on the map. Drag the pin to the pickup spot.', { icon: '📍' });
        return;
      }
      setForm((prev) => ({ ...prev, latitude: point.lat, longitude: point.lng }));
      setMapFocus({ lat: point.lat, lng: point.lng, zoom });
    } finally {
      if (run === locateRun.current) setLocating(false);
    }
  };

  const handleProvinceChange = (provinceName: string) => {
    const province = getProvince(provinceName);
    if (!province) return;
    cancelLocate();
    // Drop the pin on the provincial capital; the owner then fine-tunes it on the map.
    setForm({ ...form, province: province.name, city: '', latitude: province.lat, longitude: province.lng });
    setMapFocus({ lat: province.lat, lng: province.lng, zoom: 11 });
  };

  const handleAddClick = () => {
    if (isAtVehicleLimit) {
      toast.error(`Vehicle limit reached. Upgrade from ${planName} to add more vehicles.`);
      return;
    }
    if (showForm && !editingVehicle) {
      resetForm();
      return;
    }
    setEditingVehicle(null);
    setForm(emptyForm);
    setMapFocus(PH_MAP_FOCUS);
    cancelLocate();
    setProofPhotos(emptyProofPhotos());
    setShowForm(true);
  };

  const loadProofPhotosFromVehicle = (vehicle: OwnerVehicle): ProofPhotoState => {
    const proofs = emptyProofPhotos();
    const saved = vehicle.proof_photos || {};
    vehicleProofSlots.forEach(({ key }) => {
      if (saved[key]) proofs[key] = { file: null, preview: saved[key] };
    });
    if (!Object.values(saved).some(Boolean) && vehicle.images?.length) {
      const keys = vehicleProofSlots.map(({ key }) => key);
      vehicle.images.forEach((url, index) => {
        if (keys[index]) proofs[keys[index]] = { file: null, preview: url };
      });
    }
    return proofs;
  };

  const handleEdit = (vehicle: OwnerVehicle) => {
    const province = getProvince(vehicle.province) || getProvince('Cebu');
    const latitude = Number(vehicle.latitude || province?.lat || PHILIPPINES_CENTER.lat);
    const longitude = Number(vehicle.longitude || province?.lng || PHILIPPINES_CENTER.lng);
    setEditingVehicle(vehicle);
    setMapFocus({ lat: latitude, lng: longitude, zoom: 15 });
    const values = {
      title: vehicle.title || '',
      brand: vehicle.brand || '',
      model: vehicle.model || '',
      plateNumber: vehicle.plate_number || '',
      year: Number(vehicle.year || new Date().getFullYear()),
      vehicleType: vehicle.vehicle_type || 'Sedan',
      transmission: vehicle.transmission || 'Automatic',
      fuelType: vehicle.fuel_type || 'Gasoline',
      seats: Number(vehicle.seats || 4),
      pricePerDay: String(vehicle.price_per_day || ''),
      province: province?.name || '',
      city: vehicle.city || '',
      barangay: vehicle.barangay || '',
      pickupAddress: vehicle.pickup_address || '',
      latitude,
      longitude,
      description: vehicle.description || '',
      driverAvailable: Boolean(vehicle.driver_available),
      driverFeePerDay: vehicle.driver_fee_per_day ? String(vehicle.driver_fee_per_day) : '',
    };
    setForm(values);
    // Keep the saved pin unless the owner changes the address.
    cancelLocate();
    lastLocated.current = locateKey(values);
    setProofPhotos(loadProofPhotosFromVehicle(vehicle));
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle && isAtVehicleLimit) {
      toast.error(`Your ${planName} plan allows ${vehicleLimit} vehicles only. Select a higher plan to add more.`);
      return;
    }

    const missingProofs = vehicleProofSlots.filter(({ key }) => !proofPhotos[key]?.preview);
    if (!editingVehicle && missingProofs.length) {
      toast.error(`Please upload all 6 proof photos. Missing: ${missingProofs.map((p) => p.label).join(', ')}`);
      return;
    }

    try {
      const data = new FormData();
      Object.entries({
        ...form,
        location: `${form.city}, ${form.province}`,
        pricePerDay: String(parseFloat(form.pricePerDay)),
        latitude: String(Number(form.latitude)),
        longitude: String(Number(form.longitude)),
        driverFeePerDay: String(form.driverAvailable ? parseFloat(form.driverFeePerDay || '0') || 0 : 0),
        ...(editingVehicle ? { status: editingVehicle.status } : {}),
      }).forEach(([key, value]) => data.append(key, String(value)));

      vehicleProofSlots.forEach(({ key, field }) => {
        const file = proofPhotos[key]?.file;
        if (file) data.append(field, file);
      });

      if (editingVehicle) {
        await api.put(`/vehicles/${editingVehicle.id}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/vehicles', data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      toast.success(editingVehicle ? 'Vehicle updated!' : 'Vehicle added!');
      resetForm();
      fetchVehicles();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; errors?: { msg: string }[]; upgradeRequired?: boolean; code?: string } } };
      if (error.response?.data?.code === 'VERIFICATION_REQUIRED') {
        router.push('/verify-identity?returnTo=/dashboard/vehicles');
        return;
      }
      if (error.response?.data?.upgradeRequired) {
        toast.error(error.response.data.message || 'Select a higher subscription plan to add more vehicles.');
        setShowForm(false);
        return;
      }
      toast.error(error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || 'Failed to save vehicle');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this vehicle?')) return;
    try {
      await api.delete(`/vehicles/${id}`);
      toast.success('Vehicle deleted');
      fetchVehicles();
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to delete vehicle');
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="user">
        <div className="skeleton h-8 w-56 mb-6" />
        <div className="skeleton h-20 rounded-2xl mb-6" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-72 rounded-2xl" />)}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="user">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3"><IconChip icon={MyVehicleIcon} className="h-10 w-10 rounded-xl" iconClassName="h-7 w-7" />My Vehicles</h2>
          <p className="text-sm text-[var(--muted)]">Add, edit, and manage your vehicle listings anywhere in the Philippines.</p>
        </div>
        <button onClick={handleAddClick} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Add Vehicle
        </button>
      </div>

      {user?.approval_status !== 'approved' && (
        <Link
          href="/verify-identity?returnTo=/dashboard/vehicles"
          className="flex items-center gap-2 text-sm p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-6"
        >
          <ShieldAlert className="w-4 h-4 shrink-0" />
          Verify your driver&apos;s license to list a vehicle.
        </Link>
      )}

      <div className={`mb-6 rounded-2xl border p-4 ${
        isAtVehicleLimit
          ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100'
          : 'border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)]'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            {isAtVehicleLimit ? <AlertTriangle className="mt-0.5 h-5 w-5" /> : <Crown className="mt-0.5 h-5 w-5 text-[var(--primary)]" />}
            <div>
              <p className="font-semibold">{vehicles.length}/{vehicleLimit} vehicles used on {planName} plan</p>
              <p className="text-sm opacity-80">
                {isAtVehicleLimit
                  ? 'You reached your vehicle limit. Select Pro, Premium, or Enterprise to publish more vehicles.'
                  : 'You can still add vehicles under your current plan.'}
              </p>
            </div>
          </div>
          <Link href="/dashboard/subscription" className={isAtVehicleLimit ? 'btn-primary text-sm' : 'btn-outline text-sm'}>
            Select Plan
          </Link>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="glass-card p-6 mb-6 grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold">{editingVehicle ? 'Edit Vehicle Details' : 'Add Vehicle'}</h3>
              <p className="text-sm text-[var(--muted)]">Upload 6 proof photos and pin the exact pickup spot on the map.</p>
            </div>
            <button type="button" onClick={resetForm} className="btn-outline flex items-center gap-2 text-sm">
              <X className="h-4 w-4" /> Cancel
            </button>
          </div>

          {[
            { key: 'title', label: 'Title', type: 'text' },
            { key: 'brand', label: 'Brand', type: 'text' },
            { key: 'model', label: 'Model', type: 'text' },
            { key: 'plateNumber', label: 'Plate Number', type: 'text' },
            { key: 'year', label: 'Year', type: 'number' },
            { key: 'pricePerDay', label: 'Price/Day (PHP)', type: 'number' },
            { key: 'seats', label: 'Seats', type: 'number' },
          ].map(({ key, label, type }) => (
            <div key={key}>
              <label className="text-sm font-medium">{label}</label>
              <input
                type={type}
                required
                className="input-field mt-1"
                value={String(form[key as keyof typeof form])}
                onChange={(e) => setForm({ ...form, [key]: type === 'number' ? Number(e.target.value) : e.target.value })}
              />
            </div>
          ))}

          <div className="md:col-span-2 rounded-xl border border-[var(--card-border)] p-4">
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={form.driverAvailable}
                onChange={(e) => setForm({ ...form, driverAvailable: e.target.checked })}
              />
              Offer a driver for this vehicle
            </label>
            {form.driverAvailable && (
              <div className="mt-3">
                <label className="text-sm font-medium">Driver Fee/Day (PHP)</label>
                <input
                  type="number"
                  min={0}
                  required
                  className="input-field mt-1"
                  value={form.driverFeePerDay}
                  onChange={(e) => setForm({ ...form, driverFeePerDay: e.target.value })}
                />
                <p className="text-xs text-[var(--muted)] mt-1">
                  Customers can choose &quot;With Driver&quot; at booking for this extra fee per day, on top of your daily rate.
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">Type</label>
            <select className="input-field mt-1" value={form.vehicleType}
              onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}>
              {vehicleTypes.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Status</label>
            <select className="input-field mt-1" value={editingVehicle?.status || 'available'}
              onChange={(e) => setEditingVehicle(editingVehicle ? { ...editingVehicle, status: e.target.value } : editingVehicle)}>
              <option value="available">Available</option>
              <option value="maintenance">Maintenance</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Transmission</label>
            <select className="input-field mt-1" value={form.transmission}
              onChange={(e) => setForm({ ...form, transmission: e.target.value })}>
              <option>Automatic</option><option>Manual</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Fuel Type</label>
            <select className="input-field mt-1" value={form.fuelType}
              onChange={(e) => setForm({ ...form, fuelType: e.target.value })}>
              <option>Gasoline</option><option>Diesel</option><option>Electric</option><option>Hybrid</option>
            </select>
          </div>

          <VehicleProofUpload
            proofs={proofPhotos}
            onChange={setProofPhotos}
            required={!editingVehicle}
          />

          <div className="md:col-span-2">
            <label className="text-sm font-medium">Description</label>
            <textarea className="input-field mt-1" rows={3} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="md:col-span-2 mt-2 border-t border-[var(--card-border)] pt-4">
            <h4 className="font-semibold flex items-center gap-2"><MapPin className="w-4 h-4 text-[var(--primary)]" /> Pickup Location</h4>
            <p className="text-xs text-[var(--muted)]">Anywhere in the Philippines. Choose the province, then pin the exact pickup spot on the map.</p>
          </div>
          <div>
            <label className="text-sm font-medium">Province</label>
            <ProvinceSelect required className="input-field mt-1" value={form.province} onChange={handleProvinceChange} />
          </div>
          <div>
            <label className="text-sm font-medium">City / Municipality</label>
            <input required maxLength={100} list="province-cities" className="input-field mt-1"
              placeholder={selectedProvince ? `e.g. ${selectedProvince.cities[0]}` : 'Choose a province first'}
              disabled={!form.province}
              value={form.city}
              onChange={(e) => {
                const next = { ...form, city: e.target.value };
                setForm(next);
                // Picking a suggestion from the list is a finished entry, so find it right away.
                if (selectedProvince?.cities.includes(e.target.value)) locatePin(next);
              }}
              onBlur={() => locatePin(form)} />
            <datalist id="province-cities">
              {selectedProvince?.cities.map((city) => <option key={city} value={city} />)}
            </datalist>
          </div>
          <div>
            <label className="text-sm font-medium">Barangay</label>
            <input required className="input-field mt-1" placeholder="Barangay or district"
              value={form.barangay}
              onChange={(e) => setForm({ ...form, barangay: e.target.value })}
              onBlur={() => locatePin(form)} />
          </div>
          <div>
            <label className="text-sm font-medium">Pickup Area</label>
            <PlaceAutocomplete required className="input-field mt-1" placeholder="Type a street, mall, terminal, or landmark"
              value={form.pickupAddress}
              near={{ lat: Number(form.latitude), lng: Number(form.longitude) }}
              onChange={(pickupAddress) => setForm((prev) => ({ ...prev, pickupAddress }))}
              onPick={(place) => {
                const pickupAddress = place.detail ? `${place.name}, ${place.detail.split(', ')[0]}` : place.name;
                const next = { ...form, pickupAddress, latitude: place.lat, longitude: place.lng };
                // The suggestion is already exact, so skip the blur lookup for this address.
                cancelLocate();
                lastLocated.current = locateKey(next);
                setForm(next);
                setMapFocus({ lat: place.lat, lng: place.lng, zoom: 17 });
              }}
              onBlur={() => locatePin(form)} />
          </div>
          <div className="md:col-span-2 overflow-hidden rounded-xl border border-[var(--card-border)]">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm bg-[var(--primary)]/10">
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[var(--primary)]" />
                {locating
                  ? 'Finding that place on the map...'
                  : form.province
                  ? `The map follows the city, barangay, and pickup area you type. Click or drag the pin to fine-tune.`
                  : 'Choose a province to jump the map there.'}
              </span>
              <span className="text-xs text-[var(--muted)]">{Number(form.latitude).toFixed(5)}, {Number(form.longitude).toFixed(5)}</span>
            </div>
            <LocationPickerMap
              lat={Number(form.latitude)}
              lng={Number(form.longitude)}
              focus={mapFocus}
              onChange={(latitude, longitude) => setForm((prev) => ({ ...prev, latitude, longitude }))}
              className="h-80"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs text-[var(--muted)]">
              <span>
                {formatPlace(form.city, form.province, form.barangay) || 'No location yet'}{form.pickupAddress ? ` · ${form.pickupAddress}` : ''}
              </span>
              {form.province && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${Number(form.latitude)},${Number(form.longitude)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[var(--primary)] hover:underline"
                >
                  Check pin in Google Maps ↗
                </a>
              )}
            </div>
          </div>
          <button type="submit" className="btn-primary md:col-span-2">
            {editingVehicle ? 'Update Vehicle' : 'Save Vehicle'}
          </button>
        </form>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map((v) => (
          <div key={v.id} className="glass-card p-5">
            <ImageGallery images={v.images ?? []} alt={v.title} className="h-40 rounded-xl mb-4" />
            <div className="flex justify-between gap-3">
              <div>
                <h3 className="font-semibold">{v.title}</h3>
                <p className="text-sm text-[var(--muted)]">{v.brand} {v.model}</p>
                {v.plate_number && <p className="text-xs text-[var(--muted)]">Plate: {v.plate_number}</p>}
              </div>
              <span className="h-fit shrink-0 text-xs px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-600">{v.province || 'Philippines'}</span>
            </div>
            {v.verification_status === 'approved' ? (
              <p className="mt-3 inline-block rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-semibold text-emerald-600">✓ Approved by Admin</p>
            ) : v.verification_status === 'rejected' ? (
              <div className="mt-3 rounded-lg bg-red-500/10 p-2 text-xs text-red-500">
                <p className="font-semibold">Rejected by Admin — hidden from Browse Vehicles</p>
                {v.verification_notes && <p className="mt-0.5">Reason: {v.verification_notes}</p>}
                <p className="mt-0.5">Edit the listing to fix it and send it back for review.</p>
              </div>
            ) : v.verification_status === 'needs_more_info' ? (
              <div className="mt-3 rounded-lg bg-amber-500/10 p-2 text-xs text-amber-600">
                <p className="font-semibold">Admin needs more information</p>
                {v.verification_notes && <p className="mt-0.5">{v.verification_notes}</p>}
              </div>
            ) : (
              <p className="mt-3 inline-block rounded-full bg-slate-500/15 px-2 py-1 text-xs text-[var(--muted)]">Pending admin review</p>
            )}
            <p className="text-sm text-[var(--muted)] mt-3">{formatPlace(v.city || v.location, v.province, v.barangay)}</p>
            {v.pickup_address && <p className="text-xs text-[var(--muted)]">Pickup: {v.pickup_address}</p>}
            <p className="text-[var(--primary)] font-bold mt-2">{formatCurrency(v.price_per_day)}/day</p>
            {v.driver_available && (
              <p className="text-xs text-[var(--muted)]">
                + {formatCurrency(v.driver_fee_per_day || 0)}/day with driver
              </p>
            )}
            <MaintenanceDates vehicleId={v.id} />
            <div className="flex justify-between items-center mt-3">
              <span className="text-xs capitalize px-2 py-1 rounded-full bg-[var(--primary)]/20">{v.status}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => handleEdit(v)} className="text-[var(--primary)] hover:bg-[var(--primary)]/10 p-2 rounded-lg" aria-label="Edit vehicle">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(v.id)} className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg" aria-label="Delete vehicle">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {vehicles.length === 0 && (
        <EmptyState
          icon={Car}
          title="No vehicles listed yet"
          description="Add your first vehicle above to start earning as a provider."
        />
      )}
    </DashboardLayout>
  );
}
