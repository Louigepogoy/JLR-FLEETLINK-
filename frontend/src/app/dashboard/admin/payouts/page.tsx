'use client';

import { useEffect, useState } from 'react';
import { Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import EmptyState from '@/components/ui/EmptyState';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

type PendingPayout = {
  owner_id: string;
  owner_name: string;
  owner_email: string;
  payout_method: 'gcash' | 'bank' | null;
  account_name: string | null;
  account_number: string | null;
  account_status: 'unverified' | 'verified' | null;
  pending_amount: number;
  pending_transactions: number;
};

export default function AdminPayoutsPage() {
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<PendingPayout[]>([]);
  const [payingId, setPayingId] = useState<string | null>(null);

  const fetchPayouts = () =>
    api.get('/transactions/payouts/pending').then((res) => setPayouts(res.data.data)).catch(() => {}).finally(() => setLoading(false));

  useEffect(() => { fetchPayouts(); }, []);

  const handleMarkPaid = async (ownerId: string, ownerName: string) => {
    if (!confirm(`Confirm that you already sent this payout to ${ownerName}? This cannot be undone.`)) return;
    setPayingId(ownerId);
    try {
      const res = await api.post(`/transactions/payouts/${ownerId}/mark-paid`);
      toast.success(`Marked ${formatCurrency(res.data.data.totalPaid)} as paid to ${ownerName}`);
      fetchPayouts();
    } catch {
      toast.error('Failed to mark payout as paid');
    } finally {
      setPayingId(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="admin">
        <div className="skeleton h-8 w-56 mb-6" />
        <div className="skeleton h-64 rounded-2xl" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin">
      <h2 className="text-2xl font-bold mb-2">Owner Payouts</h2>
      <p className="text-sm text-[var(--muted)] mb-6">
        PayMongo does not auto-transfer funds to owners. Send each owner their pending amount manually
        (GCash/bank), then mark it paid here.
      </p>
      {payouts.length === 0 ? (
        <EmptyState icon={Wallet} title="No pending payouts" description="All owner earnings have been paid out." />
      ) : (
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)]">
                <th className="text-left p-4">Owner</th>
                <th className="text-left p-4">Payout Method</th>
                <th className="text-left p-4">Account</th>
                <th className="text-left p-4">Pending Amount</th>
                <th className="text-left p-4">Transactions</th>
                <th className="text-left p-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.owner_id} className="border-b border-[var(--card-border)] hover:bg-[var(--primary)]/5">
                  <td className="p-4">
                    <p className="font-medium">{p.owner_name}</p>
                    <p className="text-xs text-[var(--muted)]">{p.owner_email}</p>
                  </td>
                  <td className="p-4 capitalize">{p.payout_method || <span className="text-red-500">Not set</span>}</td>
                  <td className="p-4">
                    {p.account_name ? (
                      <>
                        <p>{p.account_name}</p>
                        <p className="text-xs text-[var(--muted)]">{p.account_number}</p>
                      </>
                    ) : (
                      <span className="text-red-500 text-xs">Owner hasn&apos;t set a payout account</span>
                    )}
                  </td>
                  <td className="p-4 font-bold text-[var(--primary)]">{formatCurrency(p.pending_amount)}</td>
                  <td className="p-4">{p.pending_transactions}</td>
                  <td className="p-4">
                    <button
                      onClick={() => handleMarkPaid(p.owner_id, p.owner_name)}
                      disabled={payingId === p.owner_id}
                      className="btn-outline text-xs py-2"
                    >
                      {payingId === p.owner_id ? 'Saving...' : 'Mark as Paid'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
