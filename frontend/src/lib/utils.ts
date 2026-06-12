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
  switch (role) {
    case 'admin': return '/dashboard/admin';
    case 'owner': return '/dashboard/owner';
    default: return '/dashboard/customer';
  }
}

export const vehicleTypes = ['Truck', 'Van', 'Motorcycle'];
export const paymentStatuses = ['pending', 'partially_paid', 'fully_paid', 'refunded', 'cancelled'];
export const bookingStatuses = ['pending', 'approved', 'rejected', 'active', 'completed', 'cancelled'];

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
