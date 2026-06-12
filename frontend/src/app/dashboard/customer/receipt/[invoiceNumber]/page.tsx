'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import BookingReceipt, { type ReceiptData } from '@/components/receipt/BookingReceipt';
import api from '@/lib/api';

export default function ReceiptPage() {
  const { invoiceNumber } = useParams();
  const router = useRouter();
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!invoiceNumber) return;
    api.get(`/payments/invoice/${invoiceNumber}`)
      .then((res) => setReceipt(res.data.data))
      .catch(() => setError('Receipt not found or access denied'))
      .finally(() => setLoading(false));
  }, [invoiceNumber]);

  return (
    <DashboardLayout role="customer">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--primary)] mb-6 print:hidden"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {loading && (
        <div className="flex justify-center py-20">
          <div className="skeleton w-full max-w-2xl h-96 rounded-2xl" />
        </div>
      )}

      {error && (
        <div className="glass-card p-12 text-center text-[var(--muted)]">{error}</div>
      )}

      {receipt && <BookingReceipt data={receipt} />}
    </DashboardLayout>
  );
}
