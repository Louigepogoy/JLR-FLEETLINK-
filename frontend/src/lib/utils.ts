import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number | string) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    currencyDisplay: 'code',
  }).format(Number(amount));
}

export function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(time: string | null | undefined) {
  if (!time) return '—';
  const [hours, minutes] = time.split(':');
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0);
  return date.toLocaleTimeString('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// A full timestamp (e.g. when a booking was made) in Philippine time, whatever the viewer's timezone:
// "Sep 30, 2026, 9:08 PM".
export function formatTimestamp(timestamp: string) {
  return new Date(timestamp).toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDateTime(date: string, time?: string | null) {
  if (!time) return formatDate(date);
  return `${formatDate(date)} at ${formatTime(time)}`;
}

// A rental day is 24 hours from pickup, so a booking always returns at the pickup time, N days later
// (pickup 9:00 PM today for 1 day -> return 9:00 PM tomorrow). Returns "YYYY-MM-DD".
export function addRentalDays(startDate: string, days: number) {
  const [y, m, d] = startDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// Today's date in the user's own timezone as "YYYY-MM-DD" (toISOString() would give the UTC date,
// which is still "yesterday" before 8 AM in the Philippines).
export function localDateString(date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Passwords, usernames, emails, and phone numbers can't contain spaces, so typed spaces are dropped.
export const noSpaces = (value: string) => value.replace(/\s/g, '');

export function getDashboardPath(role: string) {
  return role === 'admin' ? '/dashboard/admin' : '/dashboard';
}

export const vehicleTypes = [
  'Sedan',
  'SUV',
  'Hatchback',
  'Pickup',
  'Van',
  'Truck',
  'Motorcycle',
  'Coupe',
  'Convertible',
  'MPV',
  'Electric',
  'Other',
];

export type VehicleProofKey =
  | 'front'
  | 'back'
  | 'side'
  | 'interior'
  | 'ownerWithVehicle'
  | 'additionalProof'
  | 'officialReceipt'
  | 'certificateOfRegistration';

export const vehicleProofSlots: {
  key: VehicleProofKey;
  field: string;
  label: string;
  hint: string;
}[] = [
  { key: 'front', field: 'proofFront', label: 'Front View', hint: 'Full front of the vehicle' },
  { key: 'back', field: 'proofBack', label: 'Rear View', hint: 'Full back of the vehicle' },
  { key: 'side', field: 'proofSide', label: 'Side View', hint: 'Left or right side profile' },
  { key: 'interior', field: 'proofInterior', label: 'Interior', hint: 'Dashboard, seats, or cabin' },
  { key: 'ownerWithVehicle', field: 'proofOwner', label: 'You + Vehicle', hint: 'Your face visible with the car' },
  { key: 'additionalProof', field: 'proofExtra', label: 'Extra Proof', hint: 'Plate number or other ownership doc' },
  // Registration documents: only you and the admins can see these, never renters.
  { key: 'officialReceipt', field: 'proofOr', label: 'OR (Official Receipt)', hint: 'LTO Official Receipt · private' },
  { key: 'certificateOfRegistration', field: 'proofCr', label: 'CR (Certificate of Registration)', hint: 'LTO Certificate of Registration · private' },
];

export const requiredProofCount = vehicleProofSlots.length;

// Cash bookings pay this share online to reserve (the backend never charges less than the commission).
export const CASH_RESERVATION_PERCENT = 15;

// What's still owed online for a booking: cash to be paid at pickup isn't paid online.
export const onlineDue = (b: { total_amount: number | string; paid_amount?: number | string | null; cash_due?: number | string | null }) =>
  Math.max(0, Math.round((Number(b.total_amount) - Number(b.paid_amount || 0) - Number(b.cash_due || 0)) * 100) / 100);
export const paymentStatuses = ['pending', 'partially_paid', 'fully_paid', 'refunded', 'cancelled'];
export const bookingStatuses = ['pending', 'approved', 'rejected', 'active', 'completed', 'cancelled'];

// Short, readable booking ID shown to renters, owners, and admins (e.g. BK-1A2B3C4D): the first
// 8 characters of the booking UUID. Admins can search bookings by it.
export const bookingCode = (id: string) => `BK-${id.slice(0, 8).toUpperCase()}`;

// Bookings are confirmed by the renter's payment, not by the owner, so show that instead of the raw status.
export const bookingStatusLabel = (status: string) =>
  ({ pending: 'Awaiting payment', approved: 'Confirmed' } as Record<string, string>)[status] || status;

export const bookingStatusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-500',
  approved: 'bg-green-500/20 text-green-500',
  rejected: 'bg-red-500/20 text-red-500',
  active: 'bg-blue-500/20 text-blue-500',
  completed: 'bg-gray-500/20 text-gray-500',
  cancelled: 'bg-red-500/20 text-red-500',
};
