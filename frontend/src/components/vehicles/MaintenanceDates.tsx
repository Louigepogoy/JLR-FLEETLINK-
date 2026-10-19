'use client';

import { useEffect, useState } from 'react';
import { Footprints, Plus, Wrench, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { apiErrorMessage } from '@/lib/chat';
import { formatDate } from '@/lib/utils';

type Block = {
  id: string;
  start_date: string;
  end_date: string;
  reason?: string;
  block_type?: 'maintenance' | 'walk_in';
  renter_name?: string | null;
  proof_url?: string | null;
};

const emptyForm = { blockType: 'maintenance', startDate: '', endDate: '', reason: '', renterName: '' };

export default function MaintenanceDates({ vehicleId }: { vehicleId: string }) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [proof, setProof] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const isWalkIn = form.blockType === 'walk_in';

  const fetchBlocks = () =>
    api.get(`/vehicles/${vehicleId}/maintenance-dates`).then((res) => setBlocks(res.data.data)).catch(() => {});

  useEffect(() => { fetchBlocks(); }, [vehicleId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.startDate || !form.endDate) {
      toast.error('Select a start and end date');
      return;
    }
    if (isWalkIn && (!form.renterName.trim() || !proof)) {
      toast.error("Add the renter's name and a proof photo");
      return;
    }
    const data = new FormData();
    data.append('blockType', form.blockType);
    data.append('startDate', form.startDate);
    data.append('endDate', form.endDate);
    data.append('reason', form.reason);
    if (isWalkIn) {
      data.append('renterName', form.renterName.trim());
      if (proof) data.append('walkInProof', proof);
    }
    setSaving(true);
    try {
      await api.post(`/vehicles/${vehicleId}/maintenance-dates`, data);
      toast.success('Vehicle blocked for those dates');
      setForm(emptyForm);
      setProof(null);
      setShowForm(false);
      fetchBlocks();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to block those dates'));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await api.delete(`/vehicles/${vehicleId}/maintenance-dates/${id}`);
      setBlocks((prev) => prev.filter((b) => b.id !== id));
    } catch {
      toast.error('Failed to remove blocked dates');
    }
  };

  return (
    <div className="mt-3 rounded-xl border border-[var(--card-border)] p-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)]">
          <Wrench className="h-3.5 w-3.5" /> Blocked Dates
        </p>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="rounded-lg p-1 text-[var(--primary)] hover:bg-[var(--primary)]/10"
          aria-label="Block dates"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {blocks.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {blocks.map((b) => {
            const walkIn = b.block_type === 'walk_in';
            return (
              <span
                key={b.id}
                className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs ${
                  walkIn ? 'bg-sky-500/10 text-sky-600' : 'bg-amber-500/10 text-amber-600'
                }`}
              >
                {walkIn ? <Footprints className="h-3 w-3" /> : <Wrench className="h-3 w-3" />}
                {walkIn && 'Walk-in: '}
                {formatDate(b.start_date)} - {formatDate(b.end_date)}
                {walkIn && b.proof_url && (
                  <a href={b.proof_url} target="_blank" rel="noreferrer" className="underline">proof</a>
                )}
                <button type="button" onClick={() => handleRemove(b.id)} aria-label="Remove blocked dates">
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      ) : (
        !showForm && <p className="mt-2 text-xs text-[var(--muted)]">No blocked dates. Bookable every day.</p>
      )}

      {showForm && (
        <form onSubmit={handleAdd} className="mt-3 grid grid-cols-2 gap-2">
          <select
            className="input-field col-span-2 text-xs"
            value={form.blockType}
            onChange={(e) => setForm({ ...form, blockType: e.target.value })}
          >
            <option value="maintenance">Maintenance</option>
            <option value="walk_in">Walk-in rental (rented outside the website)</option>
          </select>
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
          {isWalkIn ? (
            <>
              <input
                type="text"
                placeholder="Renter's full name"
                className="input-field col-span-2 text-xs"
                value={form.renterName}
                onChange={(e) => setForm({ ...form, renterName: e.target.value })}
              />
              <label className="col-span-2 text-xs text-[var(--muted)]">
                Proof photo (renter&apos;s license, agreement or receipt)
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="input-field mt-1 w-full text-xs"
                  onChange={(e) => setProof(e.target.files?.[0] || null)}
                />
              </label>
            </>
          ) : (
            <input
              type="text"
              placeholder="Reason (optional)"
              className="input-field col-span-2 text-xs"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
          )}
          <button type="submit" disabled={saving} className="btn-primary col-span-2 py-1.5 text-xs">
            {saving ? 'Saving...' : 'Block These Dates'}
          </button>
        </form>
      )}
    </div>
  );
}
