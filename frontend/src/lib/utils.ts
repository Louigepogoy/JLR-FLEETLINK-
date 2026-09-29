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
  | 'additionalProof';

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
  { key: 'additionalProof', field: 'proofExtra', label: 'Extra Proof', hint: 'Plate, OR/CR, or ownership doc' },
];

export const requiredProofCount = vehicleProofSlots.length;
export const paymentStatuses = ['pending', 'partially_paid', 'fully_paid', 'refunded', 'cancelled'];
export const bookingStatuses = ['pending', 'approved', 'rejected', 'active', 'completed', 'cancelled'];

export const bookingStatusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-500',
  approved: 'bg-green-500/20 text-green-500',
  rejected: 'bg-red-500/20 text-red-500',
  active: 'bg-blue-500/20 text-blue-500',
  completed: 'bg-gray-500/20 text-gray-500',
  cancelled: 'bg-red-500/20 text-red-500',
};
