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

export const cebuLocations = [
  { label: 'Cebu City', value: 'Cebu City', group: 'Cebu City', lat: 10.3157, lng: 123.8854 },
  { label: 'Mandaue City', value: 'Mandaue City', group: 'Nearby Cebu areas', lat: 10.3403, lng: 123.9416 },
  { label: 'Lapu-Lapu City', value: 'Lapu-Lapu City', group: 'Nearby Cebu areas', lat: 10.3103, lng: 123.9494 },
  { label: 'Talisay City', value: 'Talisay City', group: 'Nearby Cebu areas', lat: 10.2447, lng: 123.8494 },
  { label: 'Toledo City', value: 'Toledo City', group: 'Cebu Province', lat: 10.3773, lng: 123.6386 },
  { label: 'Minglanilla', value: 'Minglanilla', group: 'Nearby Cebu areas', lat: 10.2447, lng: 123.7964 },
  { label: 'Consolacion', value: 'Consolacion', group: 'Nearby Cebu areas', lat: 10.3776, lng: 123.9570 },
  { label: 'Cordova', value: 'Cordova', group: 'Nearby Cebu areas', lat: 10.2538, lng: 123.9494 },
  { label: 'Carcar', value: 'Carcar', group: 'Cebu Province', lat: 10.1061, lng: 123.6402 },
  { label: 'Naga Cebu', value: 'Naga Cebu', group: 'Nearby Cebu areas', lat: 10.2088, lng: 123.7580 },
  { label: 'Other Cebu municipalities', value: 'Other Cebu municipalities', group: 'Cebu Province', lat: 10.3157, lng: 123.8854 },
];

export const cebuLocationOptions = cebuLocations.map((location) => location.value);

export function getCebuLocation(value?: string) {
  return cebuLocations.find((location) => location.value === value) || cebuLocations[0];
}
