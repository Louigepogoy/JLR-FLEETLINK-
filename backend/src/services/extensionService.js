const { query } = require('../config/db');
const { cashReservationAmount } = require('../utils/helpers');

// A renter can add hours to a trip in use, but never so close to the next booking (or owner
// maintenance block) that the owner has less than this many hours to get the vehicle ready.
const EXTENSION_BUFFER_HOURS = 4;
const MAX_EXTENSION_HOURS = 24;
const HOUR_MS = 3600 * 1000;

// Rental dates/times are Philippine wall-clock values, so they're handled as timezone-free UTC stamps.
const toStamp = (date, time) => {
  const [y, mo, d] = String(date).slice(0, 10).split('-').map(Number);
  const [h, mi] = String(time).split(':').map(Number);
  return Date.UTC(y, mo - 1, d, h, mi);
};
const fromStamp = (ts) => {
  const iso = new Date(ts).toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
};

const round2 = (n) => Math.round(n * 100) / 100;

// Works out whether (and for how many hours) a booking can still be extended, and what it would cost.
// `hours` is optional: when given, the quote also validates it and returns the price and new end time.
const getExtensionQuote = async (bookingId, hours) => {
  const result = await query(
    `SELECT b.id, b.customer_id, b.vehicle_id, b.status, b.payment_status, b.with_driver, b.payment_option,
            b.end_date::text AS end_date, COALESCE(b.dropoff_time, '17:00'::time)::text AS dropoff_time,
            v.owner_id, v.title, v.price_per_day, v.driver_fee_per_day,
            ((NOW() AT TIME ZONE 'Asia/Manila') <= (b.end_date + COALESCE(b.dropoff_time, '17:00'::time))) AS not_overdue
     FROM bookings b JOIN vehicles v ON b.vehicle_id = v.id WHERE b.id = $1`,
    [bookingId]
  );
  const b = result.rows[0];
  if (!b) return null;

  const quote = { booking: b, allowed: false, reason: null, maxHours: 0, hourlyRate: 0, nextBlockAt: null };
  const dailyRate = parseFloat(b.price_per_day) + (b.with_driver ? parseFloat(b.driver_fee_per_day || 0) : 0);
  quote.hourlyRate = round2(dailyRate / 24);

  if (b.status === 'approved' ? b.payment_status === 'pending' : b.status !== 'active') {
    quote.reason = 'Hours can be added once your booking is confirmed (paid) and until you return the vehicle.';
    return quote;
  }
  if (!b.not_overdue) {
    quote.reason = 'The agreed return time has already passed, so this trip can no longer be extended.';
    return quote;
  }

  const currentEnd = toStamp(b.end_date, b.dropoff_time);

  // The next thing that takes the vehicle after this trip: another renter's pickup or a maintenance block.
  const [nextBooking, nextMaintenance] = await Promise.all([
    query(
      `SELECT start_date::text AS d, COALESCE(pickup_time, '09:00'::time)::text AS t FROM bookings
       WHERE vehicle_id = $1 AND id <> $2 AND status IN ('pending', 'approved', 'active')
         AND (start_date + COALESCE(pickup_time, '09:00'::time)) >= ($3::date + $4::time)
       ORDER BY start_date + COALESCE(pickup_time, '09:00'::time) ASC LIMIT 1`,
      [b.vehicle_id, b.id, b.end_date, b.dropoff_time]
    ),
    query(
      `SELECT start_date::text AS d FROM vehicle_maintenance_dates
       WHERE vehicle_id = $1 AND end_date >= $2::date ORDER BY start_date ASC LIMIT 1`,
      [b.vehicle_id, b.end_date]
    ),
  ]);
  const blockers = [];
  if (nextBooking.rows[0]) blockers.push(toStamp(nextBooking.rows[0].d, nextBooking.rows[0].t));
  if (nextMaintenance.rows[0]) blockers.push(toStamp(nextMaintenance.rows[0].d, '00:00'));

  let maxHours = MAX_EXTENSION_HOURS;
  if (blockers.length) {
    const nextBlock = Math.min(...blockers);
    quote.nextBlockAt = fromStamp(nextBlock);
    maxHours = Math.min(maxHours, Math.floor((nextBlock - currentEnd) / HOUR_MS) - EXTENSION_BUFFER_HOURS);
  }
  quote.maxHours = Math.max(0, maxHours);

  if (quote.maxHours < 1) {
    quote.reason = 'This vehicle is already booked right after your trip, so there is no room to add more hours.';
    return quote;
  }
  quote.allowed = true;

  if (hours !== undefined) {
    const n = Number(hours);
    if (!Number.isInteger(n) || n < 1) {
      quote.allowed = false;
      quote.reason = 'Choose a whole number of hours (1 or more).';
      return quote;
    }
    if (n > quote.maxHours) {
      quote.allowed = false;
      quote.reason = `You can add at most ${quote.maxHours} hour${quote.maxHours === 1 ? '' : 's'} — the vehicle is needed again after that.`;
      return quote;
    }
    const newEnd = fromStamp(currentEnd + n * HOUR_MS);
    const amount = round2(n * dailyRate / 24);
    quote.hours = n;
    quote.amount = amount;
    quote.newEndDate = newEnd.date;
    quote.newDropoffTime = newEnd.time;
  }
  return quote;
};

// What the renter pays online for an extension: everything, or for cash bookings the same reservation
// share as the original booking (the rest is paid in cash to the owner).
const extensionOnlineAmount = (booking, amount, commissionPct) =>
  booking.payment_option === 'cash'
    ? Math.min(amount, round2(cashReservationAmount(amount, commissionPct)))
    : amount;

module.exports = {
  EXTENSION_BUFFER_HOURS, MAX_EXTENSION_HOURS, getExtensionQuote, extensionOnlineAmount, round2,
};
