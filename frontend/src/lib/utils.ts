import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number | string) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(Number(amount));
}

export function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function getDashboardPath(role: string) {
  switch (role) {
    case 'admin': return '/dashboard/admin';
    case 'owner': return '/dashboard/owner';
    default: return '/dashboard/customer';
  }
}

export const vehicleTypes = ['Sedan', 'SUV', 'Van', 'Truck', 'Motorcycle', 'Luxury'];
export const paymentStatuses = ['pending', 'partially_paid', 'fully_paid', 'refunded', 'cancelled'];
export const bookingStatuses = ['pending', 'approved', 'rejected', 'active', 'completed', 'cancelled'];
