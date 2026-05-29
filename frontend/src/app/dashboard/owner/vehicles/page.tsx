'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Crown, ImagePlus, MapPin, Pencil, Plus, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import api from '@/lib/api';
import { cebuLocations, formatCurrency, getCebuLocation, vehicleTypes } from '@/lib/utils';

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
  city?: string;
  barangay?: string;
  pickup_address?: string;
  latitude?: number;
  longitude?: number;
  images?: string[];
};

type OwnerSubscription = {
  plan_id: 'basic' | 'pro' | 'premium';
  plan_name: string;
  vehicle_limit: number;
  status: string;
} | null;

const defaultVehicleLimit = 5;

const emptyForm = {
  title: '',
  brand: '',
  model: '',
  plateNumber: '',
  year: new Date().getFullYear(),
  vehicleType: 'Truck',
  transmission: 'Automatic',
  fuelType: 'Gasoline',
  seats: 4,
  pricePerDay: '',
  city: 'Cebu City',
  barangay: '',
  pickupAddress: '',
  latitude: 10.3157,
  longitude: 123.8854,
  description: '',
};

export default function OwnerVehiclesPage() {
  const [vehicles, setVehicles] = useState<OwnerVehicle[]>([]);
  const [subscription, setSubscription] = useState<OwnerSubscription>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<OwnerVehicle | null>(null);
  const [vehicleImage, setVehicleImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [form, setForm] = useState(emptyForm);

  const selectedLocation = useMemo(() => getCebuLocation(form.city), [form.city]);
  const pickupQuery = encodeURIComponent(
    [form.pickupAddress, form.barangay, form.city, 'Cebu', 'Philippines'].filter(Boolean).join(', ')
  );
  const mapSrc = `https://maps.google.com/maps?q=${pickupQuery || `${form.latitude},${form.longitude}`}&z=17&output=embed`;
  const vehicleLimit = Number(subscription?.vehicle_limit || defaultVehicleLimit);
  const planName = subscription?.plan_name || 'Basic';
  const isAtVehicleLimit = vehicles.length >= vehicleLimit;

  const fetchVehicles = () => api.get('/vehicles/owner/my-vehicles').then((res) => setVehicles(res.data.data)).catch(() => {});
  const fetchSubscription = () => api.get('/subscriptions/me').then((res) => setSubscription(res.data.data)).catch(() => setSubscription(null));
  useEffect(() => { fetchVehicles(); fetchSubscription(); }, []);

  const resetForm = () => {
    setEditingVehicle(null);
    setForm(emptyForm);
    setVehicleImage(null);
    setImagePreview('');
    setShowForm(false);
  };

  const handleCityChange = (city: string) => {
    const location = getCebuLocation(city);
    setForm({ ...form, city, latitude: location.lat, longitude: location.lng });
  };

  const handleImageChange = (file?: File) => {
    if (!file) return;
    setVehicleImage(file);
    setImagePreview(URL.createObjectURL(file));
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
    setVehicleImage(null);
    setImagePreview('');
    setShowForm(true);
  };

  const handleEdit = (vehicle: OwnerVehicle) => {
    const location = getCebuLocation(vehicle.city || vehicle.location || 'Cebu City');
    setEditingVehicle(vehicle);
    setForm({
      title: vehicle.title || '',
      brand: vehicle.brand || '',
      model: vehicle.model || '',
      plateNumber: vehicle.plate_number || '',
      year: Number(vehicle.year || new Date().getFullYear()),
      vehicleType: vehicle.vehicle_type || 'Truck',
      transmission: vehicle.transmission || 'Automatic',
      fuelType: vehicle.fuel_type || 'Gasoline',
      seats: Number(vehicle.seats || 4),
      pricePerDay: String(vehicle.price_per_day || ''),
      city: vehicle.city || vehicle.location || 'Cebu City',
      barangay: vehicle.barangay || '',
      pickupAddress: vehicle.pickup_address || '',
      latitude: Number(vehicle.latitude || location.lat),
      longitude: Number(vehicle.longitude || location.lng),
      description: vehicle.description || '',
    });
    setImagePreview(vehicle.images?.[0] || '');
    setVehicleImage(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle && isAtVehicleLimit) {
      toast.error(`Your ${planName} plan allows ${vehicleLimit} vehicles only. Select a higher plan to add more.`);
      return;
    }
    if (!editingVehicle && !vehicleImage) {
      toast.error('Please upload an actual vehicle photo/proof first');
      return;
    }

    try {
      const data = new FormData();
      Object.entries({
        ...form,
        location: form.city,
        pricePerDay: String(parseFloat(form.pricePerDay)),
        latitude: String(Number(form.latitude)),
        longitude: String(Number(form.longitude)),
        ...(editingVehicle ? { status: editingVehicle.status } : {}),
      }).forEach(([key, value]) => data.append(key, String(value)));
      if (vehicleImage) data.append('vehicleImage', vehicleImage);

      if (editingVehicle) {
        await api.put(`/vehicles/${editingVehicle.id}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/vehicles', data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      toast.success(editingVehicle ? 'Vehicle updated!' : 'Vehicle added in Cebu!');
      resetForm();
      fetchVehicles();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; errors?: { msg: string }[]; upgradeRequired?: boolean } } };
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
    await api.delete(`/vehicles/${id}`);
    toast.success('Vehicle deleted');
    fetchVehicles();
  };

  return (
    <DashboardLayout role="owner">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">My Cebu Vehicles</h2>
          <p className="text-sm text-[var(--muted)]">Add, edit, and manage your Cebu vehicle listings.</p>
        </div>
        <button onClick={handleAddClick} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Add Vehicle
        </button>
      </div>

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
                  ? 'You reached your vehicle limit. Select Pro or Premium to publish more vehicles.'
                  : 'You can still add vehicles under your current plan.'}
              </p>
            </div>
          </div>
          <Link href="/dashboard/owner/subscription" className={isAtVehicleLimit ? 'btn-primary text-sm' : 'btn-outline text-sm'}>
            Select Plan
          </Link>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="glass-card p-6 mb-6 grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold">{editingVehicle ? 'Edit Vehicle Details' : 'Add Cebu Vehicle'}</h3>
              <p className="text-sm text-[var(--muted)]">You can edit brand, model, plate, price, pickup details, status, and photo.</p>
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

          <div className="md:col-span-2">
            <label className="text-sm font-medium">Vehicle Photo / Proof</label>
            <label className="mt-1 flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--card)] p-4 text-center hover:border-[var(--primary)]">
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreview} alt="Selected vehicle proof" className="h-56 w-full rounded-lg object-cover" />
              ) : (
                <>
                  <ImagePlus className="mb-3 h-10 w-10 text-[var(--primary)]" />
                  <span className="font-semibold">Upload actual vehicle picture</span>
                  <span className="text-sm text-[var(--muted)]">Required for new listings. Optional when editing.</span>
                </>
              )}
              <input
                type="file"
                required={!editingVehicle}
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => handleImageChange(e.target.files?.[0])}
              />
            </label>
          </div>

          <div>
            <label className="text-sm font-medium">Pickup Location</label>
            <select required className="input-field mt-1" value={form.city}
              onChange={(e) => handleCityChange(e.target.value)}>
              {cebuLocations.map((location) => <option key={location.value} value={location.value}>{location.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Barangay</label>
            <input required className="input-field mt-1" placeholder="Barangay or district"
              value={form.barangay}
              onChange={(e) => setForm({ ...form, barangay: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium">Pickup Area</label>
            <input required className="input-field mt-1" placeholder="Mall, hotel, terminal, subdivision gate, or landmark"
              value={form.pickupAddress}
              onChange={(e) => setForm({ ...form, pickupAddress: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium">Latitude</label>
            <input type="number" step="0.000001" required className="input-field mt-1"
              value={form.latitude}
              onChange={(e) => setForm({ ...form, latitude: Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-sm font-medium">Longitude</label>
            <input type="number" step="0.000001" required className="input-field mt-1"
              value={form.longitude}
              onChange={(e) => setForm({ ...form, longitude: Number(e.target.value) })} />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium">Description</label>
            <textarea className="input-field mt-1" rows={3} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="md:col-span-2 overflow-hidden rounded-xl border border-[var(--card-border)]">
            <div className="flex items-center gap-2 px-4 py-3 text-sm bg-[var(--primary)]/10">
              <MapPin className="w-4 h-4 text-[var(--primary)]" />
              Static pickup preview: {[form.pickupAddress, form.barangay, selectedLocation.label].filter(Boolean).join(', ')}
            </div>
            <iframe title="Static pickup map preview" src={mapSrc} className="h-56 w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
          <button type="submit" className="btn-primary md:col-span-2">
            {editingVehicle ? 'Update Vehicle' : 'Save Cebu Vehicle'}
          </button>
        </form>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map((v) => (
          <div key={v.id} className="glass-card p-5">
            <div className="h-40 overflow-hidden rounded-xl bg-gradient-to-br from-sky-500/20 via-emerald-500/10 to-amber-400/20 mb-4">
              {v.images?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={v.images[0]} alt={v.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-2xl font-bold text-[var(--primary)]">No photo</div>
              )}
            </div>
            <div className="flex justify-between gap-3">
              <div>
                <h3 className="font-semibold">{v.title}</h3>
                <p className="text-sm text-[var(--muted)]">{v.brand} {v.model}</p>
                {v.plate_number && <p className="text-xs text-[var(--muted)]">Plate: {v.plate_number}</p>}
              </div>
              <span className="h-fit text-xs px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-600">Cebu</span>
            </div>
            <p className="text-sm text-[var(--muted)] mt-3">{[v.city || v.location, v.barangay].filter(Boolean).join(', ')}</p>
            {v.pickup_address && <p className="text-xs text-[var(--muted)]">Pickup: {v.pickup_address}</p>}
            <p className="text-[var(--primary)] font-bold mt-2">{formatCurrency(v.price_per_day)}/day</p>
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
    </DashboardLayout>
  );
}
