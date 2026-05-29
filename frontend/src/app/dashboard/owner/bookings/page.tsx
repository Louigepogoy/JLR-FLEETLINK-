'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import ReportModal from '@/components/reports/ReportModal';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

type OwnerBooking = {
  id: string;
  title: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  paid_amount: number;
  status: string;
  payment_status: string;
};

export default function OwnerBookingsPage() {
  const [bookings, setBookings] = useState<OwnerBooking[]>([]);
  const [reportBooking, setReportBooking] = useState<OwnerBooking | null>(null);

  const fetchBookings = () => api.get('/bookings/owner').then((res) => setBookings(res.data.data)).catch(() => {});
  useEffect(() => { fetchBookings(); }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/bookings/${id}/status`, { status });
      toast.success(`Booking ${status}`);
      fetchBookings();
    } catch {
      toast.error('Failed to update booking');
    }
  };

  return (
    <DashboardLayout role="owner">
      <h2 className="text-2xl font-bold mb-6">Booking Requests</h2>
      <div className="space-y-4">
        {bookings.map((b) => (
          <div key={b.id} className="glass-card p-6">
            <div className="flex flex-wrap justify-between gap-4">
              <div>
                <h3 className="font-semibold">{b.title}</h3>
                <p className="text-sm text-[var(--muted)]">{b.customer_name} - {b.customer_email}</p>
                <p className="text-sm mt-1">{formatDate(b.start_date)} to {formatDate(b.end_date)}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">{formatCurrency(b.total_amount)}</p>
                <p className="text-sm text-green-500">Paid: {formatCurrency(b.paid_amount || 0)}</p>
                <span className="text-xs capitalize px-2 py-1 rounded-full bg-[var(--primary)]/20 mt-1 inline-block">{b.status}</span>
              </div>
            </div>
            {b.status === 'pending' && (
              <div className="flex gap-3 mt-4">
                <button onClick={() => updateStatus(b.id, 'approved')} className="btn-primary text-sm py-2">Approve</button>
                <button onClick={() => updateStatus(b.id, 'rejected')} className="btn-outline text-sm py-2 text-red-500">Reject</button>
              </div>
            )}
            <button
              onClick={() => setReportBooking(b)}
              className="btn-outline mt-4 text-sm py-2 text-red-500"
            >
              Report Customer
            </button>
          </div>
        ))}
      </div>
      {reportBooking && (
        <ReportModal
          isOpen={!!reportBooking}
          onClose={() => setReportBooking(null)}
          bookingId={reportBooking.id}
          reportedUserId={reportBooking.customer_id}
          reportedName={reportBooking.customer_name || 'Customer'}
        />
      )}
    </DashboardLayout>
  );
}
