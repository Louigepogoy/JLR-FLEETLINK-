'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, FileSignature, FileText, Lock, Printer, Receipt } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import BrandLogo from '@/components/ui/BrandLogo';
import api from '@/lib/api';
import { bookingCode, cn, formatCurrency, formatDate, formatTime } from '@/lib/utils';
import { rentalAgreementTerms } from '@/lib/rentalAgreement';

type Documents = {
  viewer: 'customer' | 'owner' | 'admin';
  booking: {
    id: string; status: string; payment_status: string; payment_option: 'online' | 'cash';
    start_date: string; end_date: string; pickup_time: string | null; dropoff_time: string | null;
    with_driver: boolean; created_at: string; completed_at: string | null; handed_over_at: string | null;
  };
  vehicle: { title: string; brand: string; model: string; year: number; plate_number: string | null; vehicle_type: string; price_per_day: number };
  owner: { name: string; phone: string | null; email: string; business_name: string | null };
  customer: { name: string; phone: string | null; email: string; license_number: string | null };
  agreement: { signed_name: string | null; signed_at: string | null; version: string | null };
  billing: {
    rental: number; driver_fee: number; late_fee: number; late_hours: number; total: number;
    paid_online: number; paid_cash: number; cash_due: number; balance: number;
    payments: { amount: string; payment_method: string; reference_number: string | null; created_at: string; invoice_number: string | null }[];
    commission?: number; commission_percentage?: number | null; owner_net?: number;
  };
  trip_documents: { available: boolean; or_url: string | null; cr_url: string | null; has_documents: boolean };
};

type Tab = 'agreement' | 'billing' | 'trip';

const vehicleLine = (d: Documents) =>
  `${d.vehicle.year} ${d.vehicle.brand} ${d.vehicle.model}${d.vehicle.plate_number ? `, plate no. ${d.vehicle.plate_number}` : ''}`;

const periodLine = (d: Documents) =>
  `${formatDate(d.booking.start_date)} ${formatTime(d.booking.pickup_time || '09:00')} to ${formatDate(d.booking.end_date)} ${formatTime(d.booking.dropoff_time || '17:00')}`;

// Shared letterhead for every document.
function DocHeader({ title, d }: { title: string; d: Documents }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-[var(--card-border)] pb-4">
      <div className="flex items-center gap-3">
        <BrandLogo className="h-10 w-10" />
        <div>
          <p className="text-lg font-bold">JLR Fleetlink</p>
          <p className="text-xs text-[var(--muted)]">Vehicle Rental Platform · Philippines</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-xl font-bold">{title}</p>
        <p className="text-xs text-[var(--muted)]">Booking {bookingCode(d.booking.id)}</p>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn('flex justify-between gap-4 py-1.5 text-sm', strong && 'font-bold')}>
      <span className={strong ? '' : 'text-[var(--muted)]'}>{label}</span>
      <span className="text-right tabular-nums">{value}</span>
    </div>
  );
}

function Agreement({ d }: { d: Documents }) {
  return (
    <div className="glass-card print-page p-6 sm:p-8">
      <DocHeader title="Rental Agreement" d={d} />
      <div className="mb-6 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--muted)]">Owner</p>
          <p className="font-semibold">{d.owner.name}</p>
          {d.owner.business_name && <p>{d.owner.business_name}</p>}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--muted)]">Renter</p>
          <p className="font-semibold">{d.customer.name}</p>
          {d.customer.license_number && <p>Driver&apos;s license {d.customer.license_number}</p>}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--muted)]">Vehicle</p>
          <p>{d.vehicle.title}</p>
          <p>{vehicleLine(d)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--muted)]">Rental period</p>
          <p>{periodLine(d)}</p>
          {d.booking.with_driver && <p>With the owner&apos;s driver</p>}
        </div>
      </div>
      <ol className="space-y-3 text-sm">
        {rentalAgreementTerms.map((term, i) => (
          <li key={term.title}>
            <span className="font-semibold">{i + 1}. {term.title}.</span> {term.body}
          </li>
        ))}
      </ol>
      <div className="mt-8 rounded-xl border border-[var(--card-border)] p-4 text-sm">
        {d.agreement.signed_at ? (
          <>
            <p className="text-xs font-semibold uppercase text-[var(--muted)]">Signed electronically by the renter</p>
            <p className="mt-1 font-serif text-2xl italic">{d.agreement.signed_name}</p>
            <p className="text-xs text-[var(--muted)]">
              {new Date(d.agreement.signed_at).toLocaleString('en-PH', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Manila' })}
              {' · '}Agreement version {d.agreement.version}
            </p>
          </>
        ) : (
          <p className="text-[var(--muted)]">This booking was made before the Rental Agreement was introduced, so it has no signature.</p>
        )}
      </div>
    </div>
  );
}

function Billing({ d }: { d: Documents }) {
  const b = d.billing;
  const days = d.vehicle.price_per_day > 0 ? Math.round(b.rental / d.vehicle.price_per_day) : 0;
  return (
    <div className="glass-card print-page p-6 sm:p-8">
      <DocHeader title="Billing Statement" d={d} />
      <div className="mb-6 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--muted)]">Billed to</p>
          <p className="font-semibold">{d.customer.name}</p>
          <p>{d.customer.email}</p>
        </div>
        <div className="sm:text-right">
          <p className="text-xs font-semibold uppercase text-[var(--muted)]">Vehicle and period</p>
          <p>{d.vehicle.title} · {vehicleLine(d)}</p>
          <p>{periodLine(d)}</p>
        </div>
      </div>

      <p className="text-xs font-semibold uppercase text-[var(--muted)]">Charges</p>
      <div className="mb-4 divide-y divide-[var(--card-border)]">
        <Row label={`Rental${days ? ` (${days} day${days === 1 ? '' : 's'} × ${formatCurrency(d.vehicle.price_per_day)})` : ''}`} value={formatCurrency(b.rental)} />
        {b.driver_fee > 0 && <Row label="Driver" value={formatCurrency(b.driver_fee)} />}
        {b.late_fee > 0 && <Row label={`Late return (${b.late_hours}h × ${formatCurrency(d.vehicle.price_per_day / 24)})`} value={formatCurrency(b.late_fee)} />}
        <Row label="Total" value={formatCurrency(b.total)} strong />
      </div>

      <p className="text-xs font-semibold uppercase text-[var(--muted)]">Payments</p>
      <div className="mb-4 divide-y divide-[var(--card-border)]">
        {b.payments.map((p, i) => (
          <Row
            key={i}
            label={`${new Date(p.created_at).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })} · Online (${p.payment_method.toUpperCase()})${p.invoice_number ? ` · ${p.invoice_number}` : ''}`}
            value={formatCurrency(Number(p.amount))}
          />
        ))}
        {b.paid_cash > 0 && <Row label="Cash paid to the owner" value={formatCurrency(b.paid_cash)} />}
        {b.cash_due > 0 && <Row label="Cash due at pickup" value={formatCurrency(b.cash_due)} />}
        <Row label={b.balance > 0 ? 'Balance due' : 'Balance'} value={formatCurrency(Math.max(0, b.balance))} strong />
      </div>

      {b.commission !== undefined && (
        <>
          <p className="text-xs font-semibold uppercase text-[var(--muted)]">Owner summary (visible to the owner and admins only)</p>
          <div className="divide-y divide-[var(--card-border)]">
            <Row label={`Platform commission${b.commission_percentage ? ` (${b.commission_percentage}%)` : ''}`} value={`− ${formatCurrency(b.commission)}`} />
            <Row label="Owner net (online share + cash collected)" value={formatCurrency(b.owner_net || 0)} strong />
          </div>
        </>
      )}
      <p className="mt-6 text-xs text-[var(--muted)]">
        Payment method: {d.booking.payment_option === 'cash' ? 'Reservation fee online, rest in cash at pickup' : 'Online'}.
        Status: {d.booking.payment_status.replace('_', ' ')}.
      </p>
    </div>
  );
}

function TripDocuments({ d }: { d: Documents }) {
  const t = d.trip_documents;
  if (!t.available) {
    return (
      <div className="glass-card p-8 text-center">
        <Lock className="mx-auto mb-3 h-8 w-8 text-[var(--muted)]" />
        <p className="font-semibold">Available during your trip</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-[var(--muted)]">
          The vehicle&apos;s OR/CR and the owner&apos;s authorization letter open here once the owner hands over the vehicle,
          and close again when it&apos;s returned.
        </p>
      </div>
    );
  }
  const today = new Date().toLocaleDateString('en-PH', { dateStyle: 'long', timeZone: 'Asia/Manila' });
  return (
    <div className="space-y-6">
      <div className="glass-card print-page p-6 sm:p-8">
        <DocHeader title="Authorization to Use Vehicle" d={d} />
        <p className="mb-4 text-sm">{today}</p>
        <p className="mb-4 text-sm font-semibold">TO WHOM IT MAY CONCERN:</p>
        <div className="space-y-4 text-sm leading-relaxed">
          <p>
            I, <span className="font-semibold">{d.owner.name}</span>, the registered owner of the vehicle described below,
            hereby authorize <span className="font-semibold">{d.customer.name}</span>
            {d.customer.license_number ? <>, holder of driver&apos;s license no. <span className="font-semibold">{d.customer.license_number}</span>,</> : ''}{' '}
            to use and drive this vehicle under a rental booked through JLR Fleetlink (booking {bookingCode(d.booking.id)}).
          </p>
          <div className="rounded-xl border border-[var(--card-border)] p-4">
            <Row label="Vehicle" value={`${d.vehicle.title} (${d.vehicle.vehicle_type})`} />
            <Row label="Make / model / year" value={`${d.vehicle.brand} ${d.vehicle.model} ${d.vehicle.year}`} />
            <Row label="Plate number" value={d.vehicle.plate_number || '—'} />
            <Row label="Authorized period" value={periodLine(d)} />
          </div>
          <p>This authorization is valid only for the period above. Its OR/CR are attached.</p>
        </div>
        <div className="mt-10 grid gap-8 text-sm sm:grid-cols-2">
          <div>
            <div className="border-t border-[var(--foreground)]/40 pt-1 font-semibold">{d.owner.name}</div>
            <p className="text-xs text-[var(--muted)]">Registered owner{d.owner.phone ? ` · ${d.owner.phone}` : ''}</p>
          </div>
          <div>
            <div className="border-t border-[var(--foreground)]/40 pt-1 font-semibold">{d.customer.name}</div>
            <p className="text-xs text-[var(--muted)]">Authorized driver (renter)</p>
          </div>
        </div>
      </div>

      <div className="glass-card print-page p-6 sm:p-8">
        <DocHeader title="Vehicle OR/CR" d={d} />
        {t.has_documents ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {([['OR (Official Receipt)', t.or_url], ['CR (Certificate of Registration)', t.cr_url]] as const).map(([label, url]) => (
              <div key={label}>
                <p className="mb-2 text-sm font-semibold">{label}</p>
                {url && (
                  <a href={url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl border border-[var(--card-border)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={label} className="w-full object-contain" />
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">The owner hasn&apos;t uploaded this vehicle&apos;s OR/CR yet. Ask them for a copy before driving.</p>
        )}
        <p className="mt-4 text-xs text-[var(--muted)]">For showing to authorities during the rental only. Do not copy or share.</p>
      </div>
    </div>
  );
}

export default function BookingDocumentsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [docs, setDocs] = useState<Documents | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('agreement');

  useEffect(() => {
    if (!id) return;
    api.get(`/bookings/${id}/documents`)
      .then((res) => setDocs(res.data.data))
      .catch(() => setError('Documents not found, or you don\'t have access to this booking.'));
  }, [id]);

  const tabs: { key: Tab; label: string; icon: typeof FileText }[] = [
    { key: 'agreement', label: 'Rental Agreement', icon: FileSignature },
    { key: 'billing', label: 'Billing Statement', icon: Receipt },
    { key: 'trip', label: 'Trip Documents', icon: FileText },
  ];

  return (
    <DashboardLayout role="user">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--primary)]">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        {docs && (
          <button onClick={() => window.print()} className="btn-outline text-sm py-2 flex items-center gap-2">
            <Printer className="h-4 w-4" /> Print / Save as PDF
          </button>
        )}
      </div>

      {error && <div className="glass-card p-12 text-center text-[var(--muted)]">{error}</div>}
      {!docs && !error && <div className="skeleton h-96 w-full rounded-2xl" />}

      {docs && (
        <>
          <div className="mb-6 flex gap-2 overflow-x-auto print:hidden" role="tablist">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition',
                  tab === key ? 'gradient-bg text-white' : 'border border-[var(--card-border)] text-[var(--muted)] hover:text-[var(--foreground)]'
                )}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
          <div className="mx-auto max-w-3xl">
            {tab === 'agreement' && <Agreement d={docs} />}
            {tab === 'billing' && <Billing d={docs} />}
            {tab === 'trip' && <TripDocuments d={docs} />}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
