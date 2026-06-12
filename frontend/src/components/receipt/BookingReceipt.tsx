'use client';

import { Printer, Download } from 'lucide-react';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';

export type ReceiptData = {
  invoice_number: string;
  created_at: string;
  payment_date?: string;
  total_amount: number;
  payment_amount?: number;
  commission_amount?: number;
  owner_amount?: number;
  platform_amount?: number;
  commission_percentage?: number;
  status: string;
  description?: string;
  payment_method?: string;
  reference_number?: string;
  card_last_four?: string;
  payment_metadata?: Record<string, unknown> | string;
  vehicle_title: string;
  brand?: string;
  model?: string;
  plate_number?: string;
  price_per_day?: number;
  start_date: string;
  end_date: string;
  pickup_time?: string;
  dropoff_time?: string;
  booking_total?: number;
  booking_paid?: number;
  booking_payment_status?: string;
  booking_status?: string;
  city?: string;
  barangay?: string;
  pickup_address?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  owner_name?: string;
};

function parseMeta(meta: ReceiptData['payment_metadata']) {
  if (!meta) return {};
  if (typeof meta === 'string') {
    try { return JSON.parse(meta); } catch { return {}; }
  }
  return meta;
}

export default function BookingReceipt({ data }: { data: ReceiptData }) {
  const meta = parseMeta(data.payment_metadata);
  const transactionId = String(meta.transactionId || '—');
  const channel = String(meta.channel || data.payment_method?.toUpperCase() || 'Payment');
  const amount = Number(data.payment_amount ?? data.total_amount);

  const handlePrint = () => window.print();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex flex-wrap gap-3 mb-6 print:hidden">
        <button onClick={handlePrint} className="btn-primary flex items-center gap-2 text-sm">
          <Printer className="w-4 h-4" /> Print Receipt
        </button>
        <button onClick={handlePrint} className="btn-outline flex items-center gap-2 text-sm">
          <Download className="w-4 h-4" /> Save as PDF
        </button>
      </div>

      <div id="receipt" className="bg-white text-gray-900 rounded-2xl shadow-xl overflow-hidden print:shadow-none print:rounded-none">
        <div className="bg-gradient-to-r from-sky-600 to-blue-700 px-8 py-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sky-200 text-sm font-medium tracking-wide uppercase">JLR FleetLink</p>
              <h1 className="text-2xl font-bold mt-1">Payment Receipt</h1>
            </div>
            <div className="text-right">
              <p className="text-sky-200 text-xs">Invoice No.</p>
              <p className="font-mono font-bold">{data.invoice_number}</p>
            </div>
          </div>
        </div>

        <div className="px-8 py-6 space-y-6">
          <div className="grid sm:grid-cols-2 gap-6 text-sm">
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Billed To</p>
              <p className="font-semibold">{data.customer_name}</p>
              {data.customer_email && <p className="text-gray-600">{data.customer_email}</p>}
              {data.customer_phone && <p className="text-gray-600">{data.customer_phone}</p>}
            </div>
            <div className="sm:text-right">
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Transaction Details</p>
              <p><span className="text-gray-500">Date:</span> {formatDate(data.payment_date || data.created_at)}</p>
              <p><span className="text-gray-500">Status:</span> <span className="capitalize font-medium text-green-600">{data.status?.replace('_', ' ')}</span></p>
              <p className="font-mono text-xs mt-1 text-gray-500">Txn ID: {transactionId}</p>
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <p className="font-semibold text-sm">Booking Summary</p>
            </div>
            <div className="p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Vehicle</span>
                <span className="font-medium">{data.vehicle_title}</span>
              </div>
              {(data.brand || data.model) && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Model</span>
                  <span>{[data.brand, data.model].filter(Boolean).join(' ')}</span>
                </div>
              )}
              {data.plate_number && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Plate</span>
                  <span>{data.plate_number}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Pickup</span>
                <span>{formatDate(data.start_date)} at {formatTime(data.pickup_time)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Drop-off</span>
                <span>{formatDate(data.end_date)} at {formatTime(data.dropoff_time)}</span>
              </div>
              {(data.pickup_address || data.city) && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Pickup Area</span>
                  <span className="text-right max-w-[60%]">
                    {[data.pickup_address, data.barangay, data.city].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
              {data.owner_name && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Owner</span>
                  <span>{data.owner_name}</span>
                </div>
              )}
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left p-4 font-semibold">Description</th>
                  <th className="text-right p-4 font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="p-4">
                    <p className="font-medium">Vehicle Rental Payment</p>
                    <p className="text-gray-500 text-xs mt-0.5">{data.description || `Payment via ${channel}`}</p>
                  </td>
                  <td className="p-4 text-right font-semibold">{formatCurrency(amount)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-sky-50">
                  <td className="p-4 font-bold">Amount Paid (This Transaction)</td>
                  <td className="p-4 text-right font-bold text-sky-700 text-lg">{formatCurrency(amount)}</td>
                </tr>
                {data.booking_total != null && (
                  <tr className="border-t border-gray-200">
                    <td className="p-4 text-gray-600">Booking Total / Paid So Far</td>
                    <td className="p-4 text-right text-gray-600">
                      {formatCurrency(data.booking_total)} / {formatCurrency(data.booking_paid ?? 0)}
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1">
            <p className="font-semibold mb-2">Payment Method</p>
            <p><span className="text-gray-500">Channel:</span> {channel}</p>
            {data.reference_number && (
              <p><span className="text-gray-500">Reference:</span> <span className="font-mono">{data.reference_number}</span></p>
            )}
            {data.card_last_four && (
              <p><span className="text-gray-500">Card:</span> •••• {data.card_last_four}</p>
            )}
          </div>

          <div className="text-center text-xs text-gray-400 pt-4 border-t border-gray-200">
            <p>Thank you for booking with JLR FleetLink.</p>
            <p className="mt-1">This is an official payment receipt. Keep this for your records.</p>
            <p className="mt-1">Questions? Contact support@jlrfleetlink.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
