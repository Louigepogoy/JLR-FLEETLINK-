'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { formatCurrency, HALF_PAYMENT_PERCENT } from '@/lib/utils';

interface PaymentModalProps {
  booking: {
    id: string;
    total_amount: number;
    paid_amount: number;
    title?: string;
  };
  isOpen: boolean;
  onClose: () => void;
  // A new online booking can be started with half of the total instead of the whole amount.
  allowHalf?: boolean;
  // Online bookings can settle the rest in cash with the owner once this much has been paid online.
  restInCash?: { minOnline: number; onDone: () => void };
}

export default function PaymentModal({ booking, isOpen, onClose, restInCash, allowHalf }: PaymentModalProps) {
  const remaining = parseFloat(String(booking.total_amount)) - parseFloat(String(booking.paid_amount || 0));
  const [amount, setAmount] = useState(remaining);
  const half = Math.round(remaining * HALF_PAYMENT_PERCENT) / 100;
  const halfAvailable = !!allowHalf && parseFloat(String(booking.paid_amount || 0)) === 0 && remaining > 0;
  const [loading, setLoading] = useState(false);
  const [prev, setPrev] = useState({ isOpen, remaining });

  // Reset the amount when the modal opens or the balance changes (adjusting state during render).
  if (prev.isOpen !== isOpen || prev.remaining !== remaining) {
    setPrev({ isOpen, remaining });
    if (isOpen) setAmount(remaining);
  }

  const handleCheckout = async () => {
    if (!(remaining > 0)) {
      toast.error('There is nothing left to pay.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/paymongo/bookings/checkout', { bookingId: booking.id, amount });
      window.location.href = res.data.data.checkoutUrl;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Could not start payment');
      setLoading(false);
    }
  };

  const paidSoFar = parseFloat(String(booking.paid_amount || 0));
  const canPayRestInCash = !!restInCash && remaining > 0 && paidSoFar >= restInCash.minOnline;

  const handleRestInCash = async () => {
    if (!restInCash) return;
    if (!confirm(`Pay the remaining ${formatCurrency(remaining)} in cash to the owner at pickup?`)) return;
    setLoading(true);
    try {
      await api.post(`/bookings/${booking.id}/pay-rest-cash`, {});
      toast.success('Noted — pay the remaining balance in cash at pickup.');
      onClose();
      restInCash.onDone();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Could not switch to cash');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
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
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Make Payment</h2>
              <button onClick={onClose}><X className="w-5 h-5" /></button>
            </div>

            <div className="bg-[var(--primary)]/10 rounded-xl p-4 mb-6">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[var(--muted)]">Total</span>
                <span>{formatCurrency(booking.total_amount)}</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[var(--muted)]">Paid</span>
                <span className="text-green-500">{formatCurrency(booking.paid_amount || 0)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Remaining</span>
                <span className="text-[var(--primary)]">{formatCurrency(remaining)}</span>
              </div>
            </div>

            <div className="mb-6">
              <label className="text-sm font-medium mb-2 block">Payment Amount</label>
              {halfAvailable ? (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Full payment', value: remaining },
                    { label: `${HALF_PAYMENT_PERCENT}% now`, value: half },
                  ].map((o) => (
                    <button
                      key={o.label}
                      type="button"
                      onClick={() => setAmount(o.value)}
                      aria-pressed={Math.abs(amount - o.value) < 0.005}
                      className={`rounded-xl border p-3 text-left text-sm transition-colors ${Math.abs(amount - o.value) < 0.005
                        ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                        : 'border-[var(--card-border)] hover:border-[var(--primary)]/50'}`}
                    >
                      <span className="block font-semibold">{o.label}</span>
                      <span className="text-[var(--primary)]">{formatCurrency(o.value)}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <input type="text" readOnly className="input-field cursor-not-allowed opacity-80" value={formatCurrency(amount)} />
              )}
              <p className="mt-1 text-xs text-[var(--muted)]">
                {halfAvailable && amount < remaining - 0.005
                  ? `With ${HALF_PAYMENT_PERCENT}% now, the rest (${formatCurrency(remaining - amount)}) is paid later online or in cash to the owner at pickup. The platform commission is taken in full from this first payment.`
                  : 'The full amount is paid online.'}
              </p>
            </div>

            <p className="flex items-center gap-2 text-xs text-[var(--muted)] mb-4 p-3 rounded-lg bg-[var(--primary)]/5">
              <ShieldCheck className="w-4 h-4 shrink-0 text-[var(--primary)]" />
              You&apos;ll be taken to a secure PayMongo checkout page to pay via GCash, card, or Maya.
            </p>

            <button onClick={handleCheckout} disabled={loading} className="btn-primary w-full">
              {loading ? 'Redirecting to secure checkout...' : `Continue to Payment - ${formatCurrency(amount)}`}
            </button>

            {restInCash && remaining > 0 && (
              <div className="mt-4 border-t border-[var(--card-border)] pt-4">
                {canPayRestInCash ? (
                  <>
                    <button onClick={handleRestInCash} disabled={loading} className="btn-outline w-full">
                      Pay the remaining {formatCurrency(remaining)} in cash at pickup
                    </button>
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      You give the cash to the owner when you pick up the vehicle. Cash isn&apos;t covered by JLR Fleetlink refunds.
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-[var(--muted)]">
                    Want to pay the rest in cash? Pay at least {formatCurrency(restInCash.minOnline)} online first, then the
                    cash option appears here.
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
