'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Footprints } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { IconChip, MyVehicleIcon } from '@/components/illustrations/MiniIcons';
import EmptyState from '@/components/ui/EmptyState';
import api from '@/lib/api';
import { profilePath } from '@/lib/chat';
import { formatDate, formatTimestamp } from '@/lib/utils';

type WalkIn = {
  id: string;
  start_date: string;
  end_date: string;
  renter_name: string | null;
  proof_url: string | null;
  created_at: string;
  vehicle_id: string;
  vehicle_title: string;
  owner_id: string;
  owner_name: string;
};

/** Offline rentals owners reported by blocking dates, with the renter's name and proof photo. */
export default function AdminWalkInsPage() {
  const [loading, setLoading] = useState(true);
  const [walkIns, setWalkIns] = useState<WalkIn[]>([]);

  useEffect(() => {
    api.get('/vehicles/admin/walk-ins')
      .then((res) => setWalkIns(res.data.data))
      .catch(() => setWalkIns([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout role="admin">
      <h2 className="text-2xl font-bold flex items-center gap-3 mb-6">
        <IconChip icon={MyVehicleIcon} className="h-10 w-10 rounded-xl" iconClassName="h-7 w-7" />Walk-in Rentals
      </h2>
      {loading ? (
        <div className="skeleton h-64 rounded-2xl" />
      ) : walkIns.length === 0 ? (
        <EmptyState icon={Footprints} title="No walk-in rentals reported yet" />
      ) : (
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)]">
                <th className="text-left p-4">Vehicle</th>
                <th className="text-left p-4">Owner</th>
                <th className="text-left p-4">Renter</th>
                <th className="text-left p-4">Dates</th>
                <th className="text-left p-4">Proof</th>
                <th className="text-left p-4">Reported</th>
              </tr>
            </thead>
            <tbody>
              {walkIns.map((w) => (
                <tr key={w.id} className="border-b border-[var(--card-border)]">
                  <td className="p-4 font-medium">{w.vehicle_title}</td>
                  <td className="p-4">
                    <Link href={profilePath(w.owner_id)} className="hover:underline hover:text-[var(--primary)]">{w.owner_name}</Link>
                  </td>
                  <td className="p-4">{w.renter_name || '-'}</td>
                  <td className="p-4 text-[var(--muted)] whitespace-nowrap">{formatDate(w.start_date)} - {formatDate(w.end_date)}</td>
                  <td className="p-4">
                    {w.proof_url ? (
                      <a href={w.proof_url} target="_blank" rel="noreferrer" className="text-[var(--primary)] hover:underline">View proof</a>
                    ) : (
                      <span className="text-red-500">None</span>
                    )}
                  </td>
                  <td className="p-4 text-[var(--muted)]">{formatTimestamp(w.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
