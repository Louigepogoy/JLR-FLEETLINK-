'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarCheck, Car, KeyRound, Trophy } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { ChartIcon, IconChip } from '@/components/illustrations/MiniIcons';
import api from '@/lib/api';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

type Summary = {
  total_bookings: number;
  rented: number;
  completed: number;
  active: number;
  upcoming: number;
  cancelled: number;
  vehicles_rented: number;
  total_amount: number;
  rental_days: number;
  vehicles_listed?: number;
};

type OwnerVehicle = {
  id: string;
  title: string;
  brand: string;
  model: string;
  plate_number: string | null;
  image: string | null;
  total_bookings: number;
  rented: number;
  completed: number;
  total_amount: number;
  rental_days: number;
  last_rented: string | null;
};

type RentedVehicle = {
  id: string;
  title: string;
  brand: string;
  model: string;
  image: string | null;
  times_rented: number;
  total_amount: number;
  rental_days: number;
  last_rented: string | null;
};

type Report = {
  owner: { summary: Summary; bestSeller: OwnerVehicle | null; vehicles: OwnerVehicle[]; monthly: { month: string; rentals: number; total_amount: number }[] };
  renter: { summary: Summary; vehicles: RentedVehicle[] };
};

type Tab = 'owner' | 'renter';

function Thumb({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-[var(--primary)]/10">
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} onError={() => setFailed(true)} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center text-[var(--primary)]"><Car className="h-5 w-5" /></div>
      )}
    </div>
  );
}

function StatTile({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="glass-card p-5 money-box">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-1 money-fit font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p>}
    </div>
  );
}

// Booking status split as a small text breakdown (labels carry meaning, not color alone).
function StatusBreakdown({ summary }: { summary: Summary }) {
  const items = [
    { label: 'Completed', value: summary.completed },
    { label: 'Ongoing', value: summary.active },
    { label: 'Upcoming', value: summary.upcoming },
    { label: 'Cancelled / Rejected', value: summary.cancelled },
  ];
  return (
    <div className="glass-card p-5">
      <p className="mb-3 text-sm font-semibold">Bookings by status</p>
      <ul className="space-y-2 text-sm">
        {items.map((item) => (
          <li key={item.label} className="flex items-center justify-between">
            <span className="text-[var(--muted)]">{item.label}</span>
            <span className="font-semibold tabular-nums">{item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const monthLabel = (month: string) =>
  new Date(`${month}-01T00:00:00`).toLocaleDateString('en-PH', { month: 'short', year: '2-digit' });

export default function VehicleReportPage() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<Report | null>(null);
  const [tab, setTab] = useState<Tab>('owner');

  useEffect(() => {
    api.get('/bookings/report')
      .then((res) => {
        const data: Report = res.data.data;
        setReport(data);
        // Someone who only rents (no listed vehicles) lands on their renter report.
        if (!data.owner.summary.vehicles_listed && data.renter.summary.total_bookings) setTab('renter');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <DashboardLayout role="user">
        <div className="skeleton h-8 w-60 mb-6" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
        </div>
        <div className="skeleton h-80 rounded-2xl" />
      </DashboardLayout>
    );
  }

  if (!report) {
    return (
      <DashboardLayout role="user">
        <p className="text-[var(--muted)]">Could not load your report. Please try again.</p>
      </DashboardLayout>
    );
  }

  const { owner, renter } = report;
  const chartData = owner.monthly.map((m) => ({ ...m, label: monthLabel(m.month) }));

  return (
    <DashboardLayout role="user">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="flex items-center gap-3 text-2xl font-bold">
          <IconChip icon={ChartIcon} className="h-10 w-10 rounded-xl" iconClassName="h-7 w-7" />
          Vehicle Report
        </h2>
        <div className="inline-flex rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-1 text-sm">
          {([['owner', 'My Vehicles'], ['renter', 'My Rentals']] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                'min-h-9 rounded-lg px-4 font-semibold transition',
                tab === key ? 'gradient-bg text-white' : 'text-[var(--muted)] hover:text-[var(--foreground)]'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'owner' ? (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatTile label="Total bookings received" value={owner.summary.total_bookings} hint="All bookings on your vehicles" />
            <StatTile label="Times rented" value={owner.summary.rented} hint="Approved, ongoing and completed" />
            <StatTile
              label="Vehicles rented out"
              value={`${owner.summary.vehicles_rented} / ${owner.summary.vehicles_listed ?? 0}`}
              hint="Of your listed vehicles"
            />
            <StatTile label="Booking value" value={formatCurrency(owner.summary.total_amount)} hint={`${owner.summary.rental_days} rental days`} />
          </div>

          <div className="grid lg:grid-cols-[1fr_320px] gap-4 mb-6">
            <div className="glass-card p-5">
              <h3 className="font-semibold">Rentals per month</h3>
              <p className="mb-4 text-xs text-[var(--muted)]">Last 6 months, by rental start date</p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--card-border)" />
                  <XAxis dataKey="label" stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted)" fontSize={12} allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: 'var(--primary)', fillOpacity: 0.06 }}
                    contentStyle={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 12, color: 'var(--foreground)' }}
                    formatter={(value, _name, item) => [
                      `${value} rental${Number(value) === 1 ? '' : 's'} · ${formatCurrency((item.payload as { total_amount: number }).total_amount)}`,
                      'Rentals',
                    ]}
                  />
                  <Bar dataKey="rentals" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-col gap-4">
              <div className="glass-card p-5">
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <Trophy className="h-4 w-4 text-amber-500" /> Best seller
                </p>
                {owner.bestSeller ? (
                  <div className="flex items-center gap-3">
                    <Thumb src={owner.bestSeller.image} alt={owner.bestSeller.title} />
                    <div className="min-w-0">
                      <p className="truncate font-bold">{owner.bestSeller.title}</p>
                      <p className="text-sm text-[var(--muted)]">
                        Rented {owner.bestSeller.rented}× · {formatCurrency(owner.bestSeller.total_amount)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--muted)]">No rentals yet. Your best seller will show here.</p>
                )}
              </div>
              <StatusBreakdown summary={owner.summary} />
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="border-b border-[var(--card-border)] p-5">
              <h3 className="font-semibold">Your vehicles</h3>
              <p className="text-xs text-[var(--muted)]">Ranked by times rented</p>
            </div>
            {owner.vehicles.length === 0 ? (
              <div className="p-6 text-sm text-[var(--muted)]">
                You haven&apos;t listed any vehicles yet.{' '}
                <Link href="/dashboard/vehicles" className="font-semibold text-[var(--primary)] hover:underline">Add a vehicle</Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                      <th className="px-5 py-3 font-semibold">#</th>
                      <th className="px-5 py-3 font-semibold">Vehicle</th>
                      <th className="px-5 py-3 text-right font-semibold">Bookings</th>
                      <th className="px-5 py-3 text-right font-semibold">Rented</th>
                      <th className="px-5 py-3 text-right font-semibold">Days</th>
                      <th className="px-5 py-3 text-right font-semibold">Booking value</th>
                      <th className="px-5 py-3 font-semibold">Last rented</th>
                    </tr>
                  </thead>
                  <tbody>
                    {owner.vehicles.map((v, i) => (
                      <tr key={v.id} className="border-t border-[var(--card-border)]">
                        <td className="px-5 py-3 font-semibold text-[var(--muted)] tabular-nums">{i + 1}</td>
                        <td className="px-5 py-3">
                          <Link href={`/vehicles/${v.id}`} className="flex items-center gap-3 hover:underline">
                            <Thumb src={v.image} alt={v.title} />
                            <span className="min-w-0">
                              <span className="flex items-center gap-2 font-semibold">
                                <span className="truncate">{v.title}</span>
                                {owner.bestSeller?.id === v.id && (
                                  <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                    Best seller
                                  </span>
                                )}
                              </span>
                              <span className="block text-xs text-[var(--muted)]">
                                {v.brand} {v.model}{v.plate_number ? ` · ${v.plate_number}` : ''}
                              </span>
                            </span>
                          </Link>
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums">{v.total_bookings}</td>
                        <td className="px-5 py-3 text-right font-semibold tabular-nums">{v.rented}</td>
                        <td className="px-5 py-3 text-right tabular-nums">{v.rental_days}</td>
                        <td className="px-5 py-3 text-right tabular-nums">{formatCurrency(v.total_amount)}</td>
                        <td className="px-5 py-3 text-[var(--muted)]">{v.last_rented ? formatDate(v.last_rented) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatTile label="Bookings made" value={renter.summary.total_bookings} hint="All your booking requests" />
            <StatTile label="Times rented" value={renter.summary.rented} hint="Approved, ongoing and completed" />
            <StatTile label="Different vehicles rented" value={renter.summary.vehicles_rented} />
            <StatTile label="Total spent" value={formatCurrency(renter.summary.total_amount)} hint={`${renter.summary.rental_days} rental days`} />
          </div>

          <div className="grid lg:grid-cols-[1fr_320px] gap-4">
            <div className="glass-card overflow-hidden">
              <div className="border-b border-[var(--card-border)] p-5">
                <h3 className="font-semibold">Vehicles you&apos;ve rented</h3>
                <p className="text-xs text-[var(--muted)]">Most rented first</p>
              </div>
              {renter.vehicles.length === 0 ? (
                <div className="p-6 text-sm text-[var(--muted)]">
                  You haven&apos;t rented a vehicle yet.{' '}
                  <Link href="/vehicles" className="font-semibold text-[var(--primary)] hover:underline">Browse vehicles</Link>
                </div>
              ) : (
                <ul>
                  {renter.vehicles.map((v) => (
                    <li key={v.id} className="flex items-center gap-3 border-t border-[var(--card-border)] px-5 py-3 first:border-t-0">
                      <Thumb src={v.image} alt={v.title} />
                      <Link href={`/vehicles/${v.id}`} className="min-w-0 flex-1 hover:underline">
                        <span className="block truncate font-semibold">{v.title}</span>
                        <span className="block text-xs text-[var(--muted)]">
                          {v.brand} {v.model}{v.last_rented ? ` · Last rented ${formatDate(v.last_rented)}` : ''}
                        </span>
                      </Link>
                      <div className="shrink-0 text-right text-sm">
                        <p className="flex items-center justify-end gap-1 font-semibold"><KeyRound className="h-3.5 w-3.5 text-[var(--primary)]" />{v.times_rented}×</p>
                        <p className="text-xs text-[var(--muted)] tabular-nums">{formatCurrency(v.total_amount)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex flex-col gap-4">
              <StatusBreakdown summary={renter.summary} />
              <Link href="/dashboard/bookings" className="glass-card flex items-center gap-3 p-5 text-sm font-semibold hover:border-[var(--primary)]/50">
                <CalendarCheck className="h-5 w-5 text-[var(--primary)]" /> View all my bookings
              </Link>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
