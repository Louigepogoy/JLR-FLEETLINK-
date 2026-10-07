'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { IconChip, SettingsIcon } from '@/components/illustrations/MiniIcons';
import api from '@/lib/api';
import { apiErrorMessage } from '@/lib/chat';
import { formatCurrency, formatTimestamp } from '@/lib/utils';

type CommissionEarnings = {
  summary: { total_earned: string; this_month: string; payments_count: string };
  records: {
    id: string; created_at: string; invoice_number: string; type: 'payment' | 'refund'; status: string;
    total_amount: string; commission_amount: string; commission_percentage: string | null;
    vehicle_title: string | null; customer_name: string | null; owner_name: string | null;
  }[];
};

export default function AdminSettingsPage() {
  const [pageLoading, setPageLoading] = useState(true);
  const [commission, setCommission] = useState(10);
  const [inspectionMinutes, setInspectionMinutes] = useState(60);
  const [savingInspection, setSavingInspection] = useState(false);
  const [history, setHistory] = useState([]);
  const [earnings, setEarnings] = useState<CommissionEarnings | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/commission').then((res) => {
        setCommission(parseFloat(res.data.data.commission_percentage));
        setInspectionMinutes(res.data.data.inspection_window_minutes ?? 60);
      }),
      api.get('/commission/history').then((res) => setHistory(res.data.data)).catch(() => {}),
      api.get('/commission/earnings').then((res) => setEarnings(res.data.data)).catch(() => {}),
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

  const handleSaveInspection = async () => {
    setSavingInspection(true);
    try {
      await api.put('/commission/inspection-window', { minutes: inspectionMinutes });
      toast.success(`Inspection time updated to ${inspectionMinutes} minutes`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to update inspection time'));
    } finally {
      setSavingInspection(false);
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
      <h2 className="text-2xl font-bold flex items-center gap-3 mb-6"><IconChip icon={SettingsIcon} className="h-10 w-10 rounded-xl" iconClassName="h-7 w-7" />Platform Settings</h2>

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

      <div className="glass-card p-6 max-w-lg mb-8">
        <h3 className="font-semibold mb-4">Pickup Inspection Time</h3>
        <p className="text-sm text-[var(--muted)] mb-4">
          After the owner taps &ldquo;Hand Over Vehicle&rdquo;, the renter has this long to accept the vehicle or report a
          problem. If they don&apos;t respond, it&apos;s accepted automatically and the owner&apos;s payout is unlocked.
        </p>
        <div className="flex items-center gap-3 mb-4">
          <input
            type="number" min="5" max="1440" step="5"
            className="input-field"
            value={inspectionMinutes}
            onChange={(e) => setInspectionMinutes(parseInt(e.target.value, 10) || 0)}
          />
          <span className="text-sm text-[var(--muted)]">minutes</span>
        </div>
        <button onClick={handleSaveInspection} disabled={savingInspection} className="btn-primary w-full">
          {savingInspection ? 'Saving...' : 'Save Inspection Time'}
        </button>
      </div>

      <div className="glass-card p-6 mb-8">
        <h3 className="font-semibold mb-1">Commission History</h3>
        <p className="text-sm text-[var(--muted)] mb-4">
          Commission the platform earned from each booking payment, as recorded in the database.
        </p>
        {earnings && (
          <>
            <div className="grid gap-4 sm:grid-cols-3 mb-6">
              <div className="rounded-xl border border-[var(--card-border)] p-4 money-box">
                <p className="text-xs text-[var(--muted)]">Total commission earned</p>
                <p className="money-fit font-bold gradient-text" style={{ '--money-max': '1.5rem' } as React.CSSProperties}>{formatCurrency(Number(earnings.summary.total_earned))}</p>
              </div>
              <div className="rounded-xl border border-[var(--card-border)] p-4 money-box">
                <p className="text-xs text-[var(--muted)]">This month</p>
                <p className="money-fit font-bold" style={{ '--money-max': '1.5rem' } as React.CSSProperties}>{formatCurrency(Number(earnings.summary.this_month))}</p>
              </div>
              <div className="rounded-xl border border-[var(--card-border)] p-4">
                <p className="text-xs text-[var(--muted)]">Paid booking payments</p>
                <p className="text-2xl font-bold">{earnings.summary.payments_count}</p>
              </div>
            </div>
            {earnings.records.length === 0 ? (
              <p className="text-[var(--muted)] text-sm">No commission earned yet. It appears here as soon as a renter pays for a booking.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--card-border)] text-left">
                      <th className="p-3">Date</th>
                      <th className="p-3">Invoice</th>
                      <th className="p-3">Vehicle</th>
                      <th className="p-3">Renter → Owner</th>
                      <th className="p-3 text-right">Payment</th>
                      <th className="p-3 text-right">Rate</th>
                      <th className="p-3 text-right">Commission</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {earnings.records.map((r) => {
                      const fullyRefunded = r.type === 'payment' && r.status === 'refunded';
                      const status = r.type === 'refund'
                        ? { label: 'Partial refund', cls: 'bg-amber-500/20 text-amber-600' }
                        : fullyRefunded
                          ? { label: 'Refunded', cls: 'bg-red-500/20 text-red-500' }
                          : { label: 'Earned', cls: 'bg-green-500/20 text-green-600' };
                      return (
                        <tr key={r.id} className="border-b border-[var(--card-border)]">
                          <td className="p-3 whitespace-nowrap">{formatTimestamp(r.created_at)}</td>
                          <td className="p-3 font-mono text-xs">{r.invoice_number}</td>
                          <td className="p-3">{r.vehicle_title || '—'}</td>
                          <td className="p-3">{r.customer_name || '—'} → {r.owner_name || '—'}</td>
                          <td className="p-3 text-right">{formatCurrency(Number(r.total_amount))}</td>
                          <td className="p-3 text-right">{r.commission_percentage ? `${Number(r.commission_percentage)}%` : '—'}</td>
                          <td className={`p-3 text-right font-semibold ${fullyRefunded ? 'line-through text-[var(--muted)]' : ''}`}>
                            {formatCurrency(Number(r.commission_amount))}
                          </td>
                          <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs ${status.cls}`}>{status.label}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      <div className="glass-card p-6">
        <h3 className="font-semibold mb-4">Commission Rate Changes</h3>
        <div className="space-y-2">
          {history.map((h: { id: number; percentage: string; set_by_name: string; created_at: string }) => (
            <div key={h.id} className="flex justify-between p-3 rounded-lg border border-[var(--card-border)]">
              <span className="font-medium">{h.percentage}%</span>
              <span className="text-sm text-[var(--muted)]">{h.set_by_name || 'System'} · {new Date(h.created_at).toLocaleDateString()}</span>
            </div>
          ))}
          {history.length === 0 && (
            <p className="text-[var(--muted)] text-sm">The rate hasn&apos;t been changed yet (currently {commission}%).</p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
