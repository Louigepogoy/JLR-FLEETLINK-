'use client';

import { useEffect, useState } from 'react';
import { Plus, Wrench, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';

type MaintenanceBlock = {
  id: string;
  start_date: string;
  end_date: string;
  reason?: string;
};

export default function MaintenanceDates({ vehicleId }: { vehicleId: string }) {
  const [blocks, setBlocks] = useState<MaintenanceBlock[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ startDate: '', endDate: '', reason: '' });
  const [saving, setSaving] = useState(false);

  const fetchBlocks = () =>
    api.get(`/vehicles/${vehicleId}/maintenance-dates`).then((res) => setBlocks(res.data.data)).catch(() => {});

  useEffect(() => { fetchBlocks(); }, [vehicleId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.startDate || !form.endDate) {
      toast.error('Select a start and end date');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/vehicles/${vehicleId}/maintenance-dates`, form);
      toast.success('Vehicle blocked for those dates');
      setForm({ startDate: '', endDate: '', reason: '' });
      setShowForm(false);
      fetchBlocks();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to block those dates');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await api.delete(`/vehicles/${vehicleId}/maintenance-dates/${id}`);
      setBlocks((prev) => prev.filter((b) => b.id !== id));
    } catch {
      toast.error('Failed to remove maintenance dates');
    }
  };

  return (
    <div className="mt-3 rounded-xl border border-[var(--card-border)] p-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)]">
          <Wrench className="h-3.5 w-3.5" /> Maintenance Dates
        </p>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="rounded-lg p-1 text-[var(--primary)] hover:bg-[var(--primary)]/10"
          aria-label="Add maintenance date"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {blocks.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {blocks.map((b) => (
            <span key={b.id} className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 text-xs text-amber-600">
              {formatDate(b.start_date)} - {formatDate(b.end_date)}
              <button type="button" onClick={() => handleRemove(b.id)} aria-label="Remove maintenance date">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        !showForm && <p className="mt-2 text-xs text-[var(--muted)]">No maintenance dates set. Bookable every day.</p>
      )}

      {showForm && (
        <form onSubmit={handleAdd} className="mt-3 grid grid-cols-2 gap-2">
          <input
            type="date"
            className="input-field text-xs"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
          />
          <input
            type="date"
            className="input-field text-xs"
            value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
          />
          <input
            type="text"
            placeholder="Reason (optional)"
            className="input-field col-span-2 text-xs"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
          />
          <button type="submit" disabled={saving} className="btn-primary col-span-2 py-1.5 text-xs">
            {saving ? 'Saving...' : 'Block These Dates'}
          </button>
        </form>
      )}
    </div>
  );
}
