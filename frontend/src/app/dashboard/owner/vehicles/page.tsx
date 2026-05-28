'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import api from '@/lib/api';
import { formatCurrency, vehicleTypes } from '@/lib/utils';

export default function OwnerVehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '', brand: '', model: '', year: new Date().getFullYear(),
    vehicleType: 'Sedan', transmission: 'Automatic', fuelType: 'Gasoline',
    seats: 4, pricePerDay: '', location: '', description: '',
  });

  const fetchVehicles = () => api.get('/vehicles/owner/my-vehicles').then((res) => setVehicles(res.data.data)).catch(() => {});
  useEffect(() => { fetchVehicles(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/vehicles', { ...form, pricePerDay: parseFloat(form.pricePerDay) });
      toast.success('Vehicle added!');
      setShowForm(false);
      fetchVehicles();
    } catch {
      toast.error('Failed to add vehicle');
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
        <h2 className="text-2xl font-bold">My Vehicles</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Add Vehicle
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="glass-card p-6 mb-6 grid md:grid-cols-2 gap-4">
          {[
            { key: 'title', label: 'Title', type: 'text' },
            { key: 'brand', label: 'Brand', type: 'text' },
            { key: 'model', label: 'Model', type: 'text' },
            { key: 'year', label: 'Year', type: 'number' },
            { key: 'location', label: 'Location', type: 'text' },
            { key: 'pricePerDay', label: 'Price/Day (₱)', type: 'number' },
            { key: 'seats', label: 'Seats', type: 'number' },
          ].map(({ key, label, type }) => (
            <div key={key}>
              <label className="text-sm font-medium">{label}</label>
              <input type={type} required className="input-field mt-1"
                value={String(form[key as keyof typeof form])}
                onChange={(e) => setForm({ ...form, [key]: type === 'number' ? Number(e.target.value) : e.target.value })} />
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
            <label className="text-sm font-medium">Transmission</label>
            <select className="input-field mt-1" value={form.transmission}
              onChange={(e) => setForm({ ...form, transmission: e.target.value })}>
              <option>Automatic</option><option>Manual</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium">Description</label>
            <textarea className="input-field mt-1" rows={3} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <button type="submit" className="btn-primary md:col-span-2">Save Vehicle</button>
        </form>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map((v: { id: string; title: string; brand: string; model: string; price_per_day: number; status: string; location: string }) => (
          <div key={v.id} className="glass-card p-5">
            <div className="h-32 bg-gradient-to-br from-sky-500/20 to-violet-500/20 rounded-xl flex items-center justify-center text-4xl mb-4">🚗</div>
            <h3 className="font-semibold">{v.title}</h3>
            <p className="text-sm text-[var(--muted)]">{v.brand} {v.model}</p>
            <p className="text-[var(--primary)] font-bold mt-2">{formatCurrency(v.price_per_day)}/day</p>
            <div className="flex justify-between items-center mt-3">
              <span className="text-xs capitalize px-2 py-1 rounded-full bg-[var(--primary)]/20">{v.status}</span>
              <button onClick={() => handleDelete(v.id)} className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
