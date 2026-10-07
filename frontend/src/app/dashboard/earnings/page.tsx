'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { IconChip, EarningsIcon } from '@/components/illustrations/MiniIcons';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

type PayoutAccount = {
  payout_method: 'gcash' | 'bank';
  account_name: string;
  account_number: string;
  status: 'unverified' | 'verified';
} | null;

export default function EarningsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    summary: { total_earnings: 0, monthly_earnings: 0, on_hold: 0, pending_payout: 0, paid_out: 0 },
    monthlyBreakdown: [],
  });
  const [payoutAccount, setPayoutAccount] = useState<PayoutAccount>(null);
  const [payoutForm, setPayoutForm] = useState({ payoutMethod: 'gcash', accountName: '', accountNumber: '' });
  const [savingPayout, setSavingPayout] = useState(false);

  useEffect(() => {
    api.get('/transactions/earnings').then((res) => setData(res.data.data)).catch(() => {}).finally(() => setLoading(false));
    api.get('/transactions/payout-account').then((res) => {
      const account = res.data.data;
      setPayoutAccount(account);
      if (account) {
        setPayoutForm({
          payoutMethod: account.payout_method,
          accountName: account.account_name,
          accountNumber: account.account_number,
        });
      }
    }).catch(() => {});
  }, []);

  const handleSavePayoutAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPayout(true);
    try {
      const res = await api.put('/transactions/payout-account', payoutForm);
      setPayoutAccount(res.data.data);
      const paidOut = Number(res.data.paidOut || 0);
      toast.success(paidOut > 0 ? `Payout account saved — ${formatCurrency(paidOut)} sent to it` : 'Payout account saved');
      if (paidOut > 0) api.get('/transactions/earnings').then((r) => setData(r.data.data)).catch(() => {});
    } catch {
      toast.error('Failed to save payout account');
    } finally {
      setSavingPayout(false);
    }
  };

  const chartData = data.monthlyBreakdown.map((m: { month: string; earnings: string }) => ({
    month: new Date(m.month).toLocaleDateString('en-PH', { month: 'short', year: '2-digit' }),
    earnings: parseFloat(m.earnings),
  }));

  if (loading) {
    return (
      <DashboardLayout role="user">
        <div className="skeleton h-8 w-52 mb-6" />
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="skeleton h-24 rounded-2xl" />
          <div className="skeleton h-24 rounded-2xl" />
        </div>
        <div className="skeleton h-80 rounded-2xl" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="user">
      <h2 className="text-2xl font-bold flex items-center gap-3 mb-6"><IconChip icon={EarningsIcon} className="h-10 w-10 rounded-xl" iconClassName="h-7 w-7" />Earnings Dashboard</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="glass-card p-6">
          <p className="text-sm text-[var(--muted)]">Total Earnings</p>
          <p className="text-3xl font-bold gradient-text">{formatCurrency(data.summary.total_earnings)}</p>
        </div>
        <div className="glass-card p-6">
          <p className="text-sm text-[var(--muted)]">This Month</p>
          <p className="text-3xl font-bold">{formatCurrency(data.summary.monthly_earnings)}</p>
        </div>
        <div className="glass-card p-6">
          <p className="text-sm text-[var(--muted)]">On Hold</p>
          <p className="text-3xl font-bold text-[var(--muted)]">{formatCurrency(data.summary.on_hold || 0)}</p>
          <p className="text-xs text-[var(--muted)] mt-1">Held until the renter accepts the vehicle</p>
        </div>
        <div className="glass-card p-6">
          <p className="text-sm text-[var(--muted)]">Pending Payout</p>
          <p className="text-3xl font-bold text-amber-500">{formatCurrency(data.summary.pending_payout)}</p>
          <p className="text-xs text-[var(--muted)] mt-1">Ready — not yet sent to you</p>
        </div>
        <div className="glass-card p-6">
          <p className="text-sm text-[var(--muted)]">Paid Out</p>
          <p className="text-3xl font-bold text-green-500">{formatCurrency(data.summary.paid_out)}</p>
          <p className="text-xs text-[var(--muted)] mt-1">Already sent to you</p>
        </div>
      </div>

      <div className="glass-card p-6 mb-8">
        <h3 className="font-semibold mb-1">Payout Account</h3>
        <p className="text-sm text-[var(--muted)] mb-4">
          Where should we send your earnings? Your share is sent here automatically — no need to request it.
        </p>
        <p className="text-sm text-[var(--muted)] mb-4">
          Renters pay JLR Fleetlink, not you. We hold each payment until the renter accepts your vehicle at pickup
          (or their inspection time runs out), then your share is sent to this account right away. Never accept cash
          directly from a renter.
        </p>
        <form onSubmit={handleSavePayoutAccount} className="grid sm:grid-cols-3 gap-3">
          <select
            className="input-field"
            value={payoutForm.payoutMethod}
            onChange={(e) => setPayoutForm({ ...payoutForm, payoutMethod: e.target.value })}
          >
            <option value="gcash">GCash</option>
            <option value="bank">Bank Account</option>
          </select>
          <input
            required
            className="input-field"
            placeholder="Account Name"
            value={payoutForm.accountName}
            onChange={(e) => setPayoutForm({ ...payoutForm, accountName: e.target.value })}
          />
          <input
            required
            className="input-field"
            placeholder={payoutForm.payoutMethod === 'gcash' ? 'GCash Number' : 'Account Number'}
            value={payoutForm.accountNumber}
            onChange={(e) => setPayoutForm({ ...payoutForm, accountNumber: e.target.value })}
          />
          <button type="submit" disabled={savingPayout} className="btn-primary sm:col-span-3">
            {savingPayout ? 'Saving...' : payoutAccount ? 'Update Payout Account' : 'Save Payout Account'}
          </button>
        </form>
      </div>

      <div className="glass-card p-6">
        <h3 className="font-semibold mb-4">Monthly Earnings</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="month" stroke="var(--muted)" fontSize={12} />
            <YAxis stroke="var(--muted)" fontSize={12} />
            <Tooltip formatter={(v) => formatCurrency(Number(v))} />
            <Bar dataKey="earnings" fill="url(#gradient)" radius={[8, 8, 0, 0]} />
            <defs>
              <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0ea5e9" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </DashboardLayout>
  );
}
