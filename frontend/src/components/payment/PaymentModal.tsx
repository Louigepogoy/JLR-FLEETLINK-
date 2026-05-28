'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, Smartphone } from 'lucide-react';
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
  onSuccess: () => void;
}

export default function PaymentModal({ booking, isOpen, onClose, onSuccess }: PaymentModalProps) {
  const remaining = parseFloat(String(booking.total_amount)) - parseFloat(String(booking.paid_amount || 0));
  const [method, setMethod] = useState<'gcash' | 'card'>('gcash');
  const [amount, setAmount] = useState(remaining);
  const [loading, setLoading] = useState(false);
  const [gcash, setGcash] = useState({ phoneNumber: '', pin: '' });
  const [card, setCard] = useState({ cardNumber: '', expiry: '', cvv: '', cardholderName: '' });

  const handlePay = async () => {
    if (amount <= 0 || amount > remaining) {
      toast.error(`Amount must be between ₱1 and ${formatCurrency(remaining)}`);
      return;
    }
    setLoading(true);
    try {
      const paymentDetails = method === 'gcash' ? gcash : card;
      const res = await api.post('/payments/process', {
        bookingId: booking.id,
        amount,
        paymentMethod: method,
        paymentDetails,
      });
      toast.success(`Payment successful! Invoice: ${res.data.data.invoiceNumber}`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Payment failed');
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

            <div className="mb-4">
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

            <div className="flex gap-3 mb-6">
              <button
                onClick={() => setMethod('gcash')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all ${
                  method === 'gcash' ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--card-border)]'
                }`}
              >
                <Smartphone className="w-5 h-5" /> GCash
              </button>
              <button
                onClick={() => setMethod('card')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all ${
                  method === 'card' ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--card-border)]'
                }`}
              >
                <CreditCard className="w-5 h-5" /> Card
              </button>
            </div>

            {method === 'gcash' ? (
              <div className="space-y-3 mb-6">
                <input className="input-field" placeholder="GCash Number (09XXXXXXXXX)"
                  value={gcash.phoneNumber} onChange={(e) => setGcash({ ...gcash, phoneNumber: e.target.value })} />
                <input className="input-field" type="password" placeholder="GCash PIN"
                  value={gcash.pin} onChange={(e) => setGcash({ ...gcash, pin: e.target.value })} />
              </div>
            ) : (
              <div className="space-y-3 mb-6">
                <input className="input-field" placeholder="Card Number (16 digits)"
                  value={card.cardNumber} onChange={(e) => setCard({ ...card, cardNumber: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <input className="input-field" placeholder="MM/YY"
                    value={card.expiry} onChange={(e) => setCard({ ...card, expiry: e.target.value })} />
                  <input className="input-field" placeholder="CVV" type="password"
                    value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value })} />
                </div>
                <input className="input-field" placeholder="Cardholder Name"
                  value={card.cardholderName} onChange={(e) => setCard({ ...card, cardholderName: e.target.value })} />
              </div>
            )}

            <button onClick={handlePay} disabled={loading} className="btn-primary w-full">
              {loading ? 'Processing...' : `Pay ${formatCurrency(amount)}`}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
