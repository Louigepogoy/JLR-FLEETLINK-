'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import api from '@/lib/api';

export default function AdminSettingsPage() {
  const [pageLoading, setPageLoading] = useState(true);
  const [commission, setCommission] = useState(10);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/commission').then((res) => setCommission(parseFloat(res.data.data.commission_percentage))),
      api.get('/commission/history').then((res) => setHistory(res.data.data)).catch(() => {}),
    ]).finally(() => setPageLoading(false));
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.put('/commission', { percentage: commission });
      toast.success(`Commission updated to ${commission}%`);
      const hist = await api.get('/commission/history');
      setHistory(hist.data.data);
    } catch {
      toast.error('Failed to update commission');
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <DashboardLayout role="admin">
        <div className="skeleton h-8 w-48 mb-6" />
        <div className="skeleton h-48 rounded-2xl max-w-lg mb-8" />
        <div className="skeleton h-32 rounded-2xl" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin">
      <h2 className="text-2xl font-bold mb-6">Platform Settings</h2>

      <div className="glass-card p-6 max-w-lg mb-8">
        <h3 className="font-semibold mb-4">Commission Percentage</h3>
        <p className="text-sm text-[var(--muted)] mb-4">
          When a customer pays for a booking, this percentage is automatically deducted as platform revenue.
          Example: ₱10,000 payment at 10% = ₱1,000 platform, ₱9,000 to owner.
        </p>
        <div className="flex items-center gap-4 mb-4">
          <input
            type="range" min="0" max="50" step="0.5"
            value={commission}
            onChange={(e) => setCommission(parseFloat(e.target.value))}
            className="flex-1"
          />
          <span className="text-3xl font-bold gradient-text w-20 text-right">{commission}%</span>
        </div>
        <input
          type="number" min="0" max="100" step="0.5"
          className="input-field mb-4"
          value={commission}
          onChange={(e) => setCommission(parseFloat(e.target.value))}
        />
        <button onClick={handleSave} disabled={loading} className="btn-primary w-full">
          {loading ? 'Saving...' : 'Save Commission Rate'}
        </button>
      </div>

      <div className="glass-card p-6">
        <h3 className="font-semibold mb-4">Commission History</h3>
        <div className="space-y-2">
          {history.map((h: { id: number; percentage: string; set_by_name: string; created_at: string }) => (
            <div key={h.id} className="flex justify-between p-3 rounded-lg border border-[var(--card-border)]">
              <span className="font-medium">{h.percentage}%</span>
              <span className="text-sm text-[var(--muted)]">{h.set_by_name || 'System'} · {new Date(h.created_at).toLocaleDateString()}</span>
            </div>
          ))}
          {history.length === 0 && <p className="text-[var(--muted)] text-sm">No history yet</p>}
        </div>
      </div>
    </DashboardLayout>
  );
}
