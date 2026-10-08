const { v4: uuidv4 } = require('uuid');

const generateInvoiceNumber = () => {
  const date = new Date();
  const y = date.getFullYear().toString().slice(-2);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `JLR-${y}${m}${d}-${rand}`;
};

const generateReferenceNumber = (method) => {
  const prefix = method === 'gcash' ? 'GC' : method === 'card' ? 'CC' : 'PY';
  return `${prefix}${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
};

const MINUTES_PER_RENTAL_DAY = 24 * 60;

// Parses "YYYY-MM-DD" + "HH:MM[:SS]" as a timezone-free timestamp (only differences are used).
const toRentalTimestamp = (date, time) => {
  const [y, mo, d] = String(date).slice(0, 10).split('-').map(Number);
  const [h, mi] = String(time).split(':').map(Number);
  return Date.UTC(y, mo - 1, d, h, mi);
};

// Rental length from pickup to return, billed in 24-hour days rounded up:
// 16 hours -> 1 day, 24 hours -> 1 day, 25 hours -> 2 days.
// The booking form always sends return = pickup + N x 24 hours (see addRentalDays in
// frontend/src/lib/utils.ts), so this bills exactly N days; rounding up only guards other callers.
const calculateRentalPeriod = (startDate, pickupTime, endDate, dropoffTime) => {
  const minutes = (toRentalTimestamp(endDate, dropoffTime) - toRentalTimestamp(startDate, pickupTime)) / 60000;
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  return { minutes, days: Math.ceil(minutes / MINUTES_PER_RENTAL_DAY) };
};

// Cash bookings pay this share of the total online to reserve (never less than the commission).
const CASH_RESERVATION_PERCENT = 15;
const cashReservationAmount = (total, commissionPct) =>
  Math.round(total * Math.max(CASH_RESERVATION_PERCENT, commissionPct)) / 100;

// Customer accounts book vehicles, owner accounts list them; accounts from before the split do both.
const canRent = (user) => ['customer', 'both'].includes(user?.account_type || 'both');
const canList = (user) => ['owner', 'both'].includes(user?.account_type || 'both');

const sanitizeUser = (user) => {
  const { password_hash, ...safe } = user;
  return safe;
};

const calculateCommission = (amount, percentage) => {
  const platformAmount = Math.round((amount * percentage / 100) * 100) / 100;
  const ownerAmount = Math.round((amount - platformAmount) * 100) / 100;
  return { platformAmount, ownerAmount, commissionPercentage: percentage };
};

module.exports = {
  generateInvoiceNumber,
  generateReferenceNumber,
  calculateRentalPeriod,
  sanitizeUser,
  calculateCommission,
  canRent,
  canList,
  CASH_RESERVATION_PERCENT,
  cashReservationAmount,
};
