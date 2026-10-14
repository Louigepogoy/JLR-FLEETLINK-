'use client';

import { useEffect, useState } from 'react';
import { Car } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { IconChip, MyVehicleIcon } from '@/components/illustrations/MiniIcons';
import EmptyState from '@/components/ui/EmptyState';
import api from '@/lib/api';
import { formatCurrency, formatTimestamp } from '@/lib/utils';

type DeletedVehicle = {
  id: string;
  title: string;
  brand: string;
  model: string;
  plate_number: string | null;
  vehicle_type: string;
  price_per_day: string;
  city: string;
  province: string;
  images: string[] | null;
  deleted_at: string;
  owner_id: string;
  owner_name: string;
  owner_email: string;
  bookings_count: number;
  completed_count: number;
  total_paid: string;
};

/** Vehicles owners deleted after they had bookings: hidden from the site but kept on record. */
export default function AdminDeletedVehiclesPage() {
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<DeletedVehicle[]>([]);

  useEffect(() => {
    api.get('/vehicles/admin/deleted')
      .then((res) => setVehicles(res.data.data))
      .catch(() => setVehicles([]))
      .finally(() => setLoading(false));
  }, []);

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
      <h2 className="text-2xl font-bold flex items-center gap-3 mb-2">
        <IconChip icon={MyVehicleIcon} className="h-10 w-10 rounded-xl" iconClassName="h-7 w-7" />
        Deleted Vehicles
      </h2>
      <p className="text-sm text-[var(--muted)] mb-6">
        When an owner deletes a vehicle that already had bookings, it is hidden from the site but kept here, with
        its booking and payment history. These vehicles still count toward the owner&apos;s plan vehicle limit.
      </p>

      {vehicles.length === 0 ? (
        <EmptyState icon={Car} title="No deleted vehicles" description="Vehicles that owners delete after being booked appear here." />
      ) : (
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)]">
                <th className="text-left p-4">Vehicle</th>
                <th className="text-left p-4">Owner</th>
                <th className="text-left p-4">Location</th>
                <th className="text-left p-4">Price/day</th>
                <th className="text-left p-4">Bookings</th>
                <th className="text-left p-4">Total paid</th>
                <th className="text-left p-4">Deleted on</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id} className="border-b border-[var(--card-border)] hover:bg-[var(--primary)]/5">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-[var(--primary)]/10">
                        {v.images?.[0] && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={v.images[0]} alt={v.title} className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium">{v.title}</p>
                        <p className="text-xs text-[var(--muted)]">
                          {v.brand} {v.model}{v.plate_number ? ` · ${v.plate_number}` : ''} · {v.vehicle_type}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="font-medium">{v.owner_name}</p>
                    <p className="text-xs text-[var(--muted)]">{v.owner_email}</p>
                  </td>
                  <td className="p-4">{v.city}, {v.province}</td>
                  <td className="p-4 whitespace-nowrap">{formatCurrency(Number(v.price_per_day))}</td>
                  <td className="p-4 whitespace-nowrap">
                    {v.bookings_count} total
                    <span className="block text-xs text-[var(--muted)]">{v.completed_count} completed</span>
                  </td>
                  <td className="p-4 font-semibold text-green-600 dark:text-green-400 whitespace-nowrap">
                    {formatCurrency(Number(v.total_paid))}
                  </td>
                  <td className="p-4 whitespace-nowrap text-xs">{formatTimestamp(v.deleted_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
