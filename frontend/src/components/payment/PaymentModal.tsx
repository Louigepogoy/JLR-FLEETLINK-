'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface PaymentModalProps {
  booking: {
    id: string;
    total_amount: number;
    paid_amount: number;
    title?: string;
  };
  isOpen: boolean;
  onClose: () => void;
}

export default function PaymentModal({ booking, isOpen, onClose }: PaymentModalProps) {
  const remaining = parseFloat(String(booking.total_amount)) - parseFloat(String(booking.paid_amount || 0));
  const [amount, setAmount] = useState(remaining);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) setAmount(remaining);
  }, [isOpen, remaining]);

  const handleCheckout = async () => {
    if (amount <= 0 || amount > remaining) {
      toast.error(`Amount must be between ₱1 and ${formatCurrency(remaining)}`);
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
              <input
                type="number"
                className="input-field"
                value={amount}
                min={1}
                max={remaining}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
              <div className="flex gap-2 mt-2">
                {[0.3, 0.5, 1].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setAmount(Math.round(remaining * pct * 100) / 100)}
                    className="text-xs px-3 py-1 rounded-lg border border-[var(--card-border)] hover:bg-[var(--primary)]/10"
                  >
                    {pct === 1 ? 'Full' : `${pct * 100}%`}
                  </button>
                ))}
              </div>
            </div>

            <p className="flex items-center gap-2 text-xs text-[var(--muted)] mb-4 p-3 rounded-lg bg-[var(--primary)]/5">
              <ShieldCheck className="w-4 h-4 shrink-0 text-[var(--primary)]" />
              You&apos;ll be taken to a secure PayMongo checkout page to pay via GCash, card, or Maya.
            </p>

            <button onClick={handleCheckout} disabled={loading} className="btn-primary w-full">
              {loading ? 'Redirecting to secure checkout...' : `Continue to Payment - ${formatCurrency(amount)}`}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
