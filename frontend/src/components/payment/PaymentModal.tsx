'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import PaymentMethodForm from '@/components/payment/PaymentMethodForm';
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
  onSuccess: (result?: { invoiceNumber: string; receiptUrl: string }) => void;
}

type PaymentResult = {
  invoiceNumber: string;
  receiptUrl: string;
  referenceNumber: string;
  transactionId?: string;
  paymentStatus: string;
  paidAmount: number;
  remainingBalance: number;
};

export default function PaymentModal({ booking, isOpen, onClose, onSuccess }: PaymentModalProps) {
  const router = useRouter();
  const remaining = parseFloat(String(booking.total_amount)) - parseFloat(String(booking.paid_amount || 0));
  const [method, setMethod] = useState<'gcash' | 'card'>('gcash');
  const [amount, setAmount] = useState(remaining);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<PaymentResult | null>(null);
  const [gcash, setGcash] = useState({ phoneNumber: '', pin: '' });
  const [card, setCard] = useState({ cardNumber: '', expiry: '', cvv: '', cardholderName: '' });

  const resetForm = () => {
    setGcash({ phoneNumber: '', pin: '' });
    setCard({ cardNumber: '', expiry: '', cvv: '', cardholderName: '' });
    setSuccess(null);
    setAmount(remaining);
  };

  const resetAndClose = () => {
    resetForm();
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      setGcash({ phoneNumber: '', pin: '' });
      setCard({ cardNumber: '', expiry: '', cvv: '', cardholderName: '' });
      setSuccess(null);
      setAmount(remaining);
    }
  }, [isOpen, remaining]);

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
      const result: PaymentResult = {
        invoiceNumber: res.data.data.invoiceNumber,
        receiptUrl: res.data.data.receiptUrl,
        referenceNumber: res.data.data.referenceNumber,
        transactionId: res.data.data.transactionId,
        paymentStatus: res.data.data.paymentStatus,
        paidAmount: res.data.data.paidAmount,
        remainingBalance: res.data.data.remainingBalance,
      };
      setSuccess(result);
      onSuccess({ invoiceNumber: result.invoiceNumber, receiptUrl: result.receiptUrl });
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
          onClick={resetAndClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="glass-card p-6 w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {success ? (
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-xl font-bold mb-2">Payment Successful</h2>
                <p className="text-sm text-[var(--muted)] mb-1">
                  {success.paymentStatus === 'fully_paid' ? 'Your booking is fully paid!' : 'Partial payment received.'}
                </p>
                <p className="font-mono text-sm text-[var(--primary)] mb-1">{success.invoiceNumber}</p>
                <p className="text-xs text-[var(--muted)] mb-6">
                  Ref: {success.referenceNumber}
                  {success.transactionId && <> · Txn: {success.transactionId.slice(0, 8)}...</>}
                </p>

                <div className="bg-[var(--primary)]/10 rounded-xl p-4 mb-6 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Paid this transaction</span>
                    <span className="font-semibold">{formatCurrency(amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Total paid</span>
                    <span className="text-green-500">{formatCurrency(success.paidAmount)}</span>
                  </div>
                  {success.remainingBalance > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[var(--muted)]">Remaining</span>
                      <span>{formatCurrency(success.remainingBalance)}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => router.push(success.receiptUrl)}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    <FileText className="w-4 h-4" /> View Receipt
                  </button>
                  <button onClick={resetAndClose} className="btn-outline w-full">
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold">Make Payment</h2>
                  <button onClick={resetAndClose}><X className="w-5 h-5" /></button>
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

                <div className="mb-6">
                  <PaymentMethodForm
                    method={method}
                    onMethodChange={setMethod}
                    gcash={gcash}
                    onGcashChange={setGcash}
                    card={card}
                    onCardChange={setCard}
                  />
                </div>

                <button onClick={handlePay} disabled={loading} className="btn-primary w-full">
                  {loading ? 'Processing transaction...' : `Pay ${formatCurrency(amount)}`}
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
