'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, Clock, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { apiErrorMessage } from '@/lib/chat';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';

interface ExtensionOptions {
  allowed: boolean;
  reason: string | null;
  maxHours: number;
  hourlyRate: number;
  paymentOption: 'online' | 'cash';
  currentEndDate: string;
  currentDropoffTime: string;
  hours?: number;
  amount?: number;
  onlineAmount?: number;
  cashAmount?: number;
  newEndDate?: string;
  newDropoffTime?: string;
}

interface ExtendBookingModalProps {
  booking: { id: string; title: string } | null;
  onClose: () => void;
}

function ExtendBookingBody({ booking, onClose }: { booking: { id: string; title: string }; onClose: () => void }) {
  const [options, setOptions] = useState<ExtensionOptions | null>(null);
  const [hours, setHours] = useState(1);
  const [paying, setPaying] = useState(false);
  const bookingId = booking.id;

  useEffect(() => {
    let cancelled = false;
    api.get(`/bookings/${bookingId}/extension-options`, { params: { hours } })
      .then((res) => { if (!cancelled) setOptions(res.data.data); })
      .catch((err) => { if (!cancelled) { toast.error(apiErrorMessage(err, 'Could not load extension options')); onClose(); } });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId, hours]);

  const pay = async () => {
    setPaying(true);
    try {
      const res = await api.post('/paymongo/bookings/extend-checkout', { bookingId: booking.id, hours });
      window.location.href = res.data.data.checkoutUrl;
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not start payment'));
      setPaying(false);
    }
  };

  const maxHours = options?.maxHours || 0;
  const quickHours = [1, 2, 3, 6, 12, 24].filter((h) => h <= maxHours);

  return (
    <>
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-xl font-bold">Add Hours</h2>
      <button onClick={onClose} aria-label="Close"><X className="w-5 h-5" /></button>
    </div>
    <p className="text-sm text-[var(--muted)] mb-4">{booking.title}</p>

    {!options ? (
      <div className="skeleton h-32 rounded-xl" />
    ) : !options.allowed && !options.hours ? (
      <p className="flex items-start gap-2 rounded-xl bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-400">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        {options.reason}
      </p>
    ) : (
      <>
        <p className="flex items-center gap-2 text-sm mb-4">
          <Clock className="h-4 w-4 text-[var(--primary)]" />
          Due back now: {formatDate(options.currentEndDate)} {formatTime(options.currentDropoffTime)}
        </p>

        <label className="text-sm font-medium mb-2 block">Hours to add (up to {maxHours})</label>
        <input
          type="number"
          className="input-field"
          min={1}
          max={maxHours}
          value={hours}
          onChange={(e) => setHours(Math.max(1, Math.floor(Number(e.target.value)) || 1))}
        />
        <div className="flex flex-wrap gap-2 mt-2 mb-4">
          {quickHours.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setHours(h)}
              className={`text-xs px-3 py-1 rounded-lg border hover:bg-[var(--primary)]/10 ${hours === h ? 'border-[var(--primary)]' : 'border-[var(--card-border)]'}`}
            >
              +{h}h
            </button>
          ))}
        </div>

        {options.allowed && options.amount !== undefined ? (
          <div className="bg-[var(--primary)]/10 rounded-xl p-4 mb-4 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--muted)]">{hours}h × {formatCurrency(options.hourlyRate)}</span>
              <span>{formatCurrency(options.amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--muted)]">New return time</span>
              <span>{formatDate(options.newEndDate!)} {formatTime(options.newDropoffTime)}</span>
            </div>
            {Number(options.cashAmount) > 0 && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--muted)]">Pay online now</span>
                  <span>{formatCurrency(options.onlineAmount || 0)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold text-amber-600 dark:text-amber-400">
                  <span>Cash to the owner at return</span>
                  <span>{formatCurrency(options.cashAmount || 0)}</span>
                </div>
              </>
            )}
          </div>
        ) : (
          <p className="flex items-start gap-2 rounded-xl bg-amber-500/10 p-3 mb-4 text-sm text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            {options.reason}
          </p>
        )}

        <p className="flex items-center gap-2 text-xs text-[var(--muted)] mb-4 p-3 rounded-lg bg-[var(--primary)]/5">
          <ShieldCheck className="w-4 h-4 shrink-0 text-[var(--primary)]" />
          Pay via GCash, card, or Maya on a secure PayMongo page. The owner is notified once it is paid.
        </p>

        <button onClick={pay} disabled={paying || !options.allowed || options.hours !== hours} className="btn-primary w-full disabled:opacity-50">
          {paying
            ? 'Redirecting to secure checkout...'
            : `Continue to Payment - ${formatCurrency(options.onlineAmount ?? options.amount ?? 0)}`}
        </button>
      </>
    )}
    </>
  );
}

export default function ExtendBookingModal({ booking, onClose }: ExtendBookingModalProps) {
  return (
    <AnimatePresence>
      {booking && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="glass-card p-6 w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <ExtendBookingBody key={booking.id} booking={booking} onClose={onClose} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
