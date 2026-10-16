const fs = require('fs');
const { body, validationResult } = require('express-validator');
const { query, pool } = require('../config/db');
const {
  calculateRentalPeriod, canRent, cashReservationAmount, BOOKING_GAP_HOURS, generateInvoiceNumber,
} = require('../utils/helpers');
const { createNotification } = require('../utils/notifications');
const { CHAT_IMAGE_MAX_BYTES } = require('../middleware/upload');
const {
  AUTO_HANDOVER_AT_SQL, getInspectionWindowMinutes, runInspectionSweep, sweepQuietly,
} = require('../services/inspectionService');
const { autoPayoutOwner } = require('../services/payoutService');
const { sendPaymongoRefunds, autoResolveDispute, AUTO_REFUND_PERCENT } = require('./disputeController');
const { PAYMENT_SECONDS_LEFT_SQL, PAYMENT_WINDOW_MINUTES } = require('../services/bookingExpiryService');
const { getExtensionQuote, extensionOnlineAmount, round2 } = require('../services/extensionService');

// Renter and owner only see each other's phone (and the renter the owner's email) once the renter
// has paid and the booking is confirmed, so contact details aren't handed out on unpaid bookings.
const CONTACT_SHARED_SQL = `b.status IN ('approved', 'active', 'completed')`;

// True when today (Philippine time) is the booking's pickup date — the only day the owner may hand
// the vehicle over. Expects `b` = bookings.
// Bump when the agreement wording changes (the frontend shows the same version in lib/rentalAgreement.ts).
const RENTAL_AGREEMENT_VERSION = '2026-10';

const IS_PICKUP_DAY_SQL = `(b.start_date = (NOW() AT TIME ZONE 'Asia/Manila')::date)`;
// The renter's "I'm here" and the owner's handover open HANDOVER_OPENS_HOURS_BEFORE hours before the pickup time
// (Philippine time), on the pickup date only. It is decided on the server so a wrong phone clock can't change it.
const HANDOVER_OPENS_HOURS_BEFORE = 1;
const HANDOVER_OPENS_AT_SQL = `GREATEST(b.start_date::timestamp, b.start_date + COALESCE(b.pickup_time, '09:00'::time) - INTERVAL '${HANDOVER_OPENS_HOURS_BEFORE} hour')`;
const HANDOVER_OPEN_SQL = `(${IS_PICKUP_DAY_SQL} AND NOW() >= (${HANDOVER_OPENS_AT_SQL}) AT TIME ZONE 'Asia/Manila')`;
const HANDOVER_OPENS_LABEL_SQL = `TO_CHAR(${HANDOVER_OPENS_AT_SQL}, 'FMHH12:MI AM')`;
// Started hours between the agreed return (end date + drop-off time, Philippine time) and now; 0 if on time.
const LATE_HOURS_SQL = `GREATEST(0, CEIL(EXTRACT(EPOCH FROM (NOW() - ((b.end_date + COALESCE(b.dropoff_time, '17:00'::time)) AT TIME ZONE 'Asia/Manila'))) / 3600))::int`;
const PICKUP_LABEL_SQL = `TO_CHAR(b.start_date, 'FMMonth FMDD, YYYY')`;
const handoverNotOpenMessage = (label) =>
  `It's too early. You can hand over the vehicle from ${label} on the pickup date (${HANDOVER_OPENS_HOURS_BEFORE} hour before the pickup time).`;
const notPickupDayMessage = (label) =>
  `You can only hand over the vehicle on the pickup date the renter booked (${label}).`;

// Pickup-inspection fields added to every booking list, seen from the server clock so a wrong
// client clock can't break the countdown.
const INSPECTION_SELECT = `
  GREATEST(0, EXTRACT(EPOCH FROM (b.inspection_deadline - NOW())))::int AS inspection_seconds_left,
  ${PAYMENT_SECONDS_LEFT_SQL} AS payment_seconds_left,
  ${IS_PICKUP_DAY_SQL} AS is_pickup_day,
  ${HANDOVER_OPEN_SQL} AS handover_open,
  ${HANDOVER_OPENS_LABEL_SQL} AS handover_opens_label,
  ${AUTO_HANDOVER_AT_SQL} AS auto_handover_at,
  d.id AS dispute_id, d.status AS dispute_status, d.reason AS dispute_reason,
  d.refund_amount AS dispute_refund_amount, d.admin_notes AS dispute_admin_notes,
  d.evidence AS dispute_evidence, d.evidence_requested_at AS dispute_evidence_requested_at,
  d.evidence_request_note AS dispute_evidence_request_note`;

const createBooking = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    if (!canRent(req.user)) {
      return res.status(403).json({
        success: false,
        code: 'CUSTOMER_ACCOUNT_REQUIRED',
        message: 'Owner accounts can\'t book vehicles. Sign up for a separate Customer account to rent.',
      });
    }

    if (req.user.approval_status !== 'approved') {
      return res.status(403).json({
        success: false,
        code: 'VERIFICATION_REQUIRED',
        message: 'Please verify your driver\'s license before booking a vehicle.',
      });
    }

    const { vehicleId, startDate, endDate, pickupTime, dropoffTime, notes, withDriver } = req.body;
    const pickup = pickupTime || '09:00';
    const dropoff = dropoffTime || '17:00';

    // Dates are calendar days in the Philippines; a rental can't start before today there.
    const todayPH = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());
    if (String(startDate).slice(0, 10) < todayPH) {
      return res.status(400).json({ success: false, message: 'The pickup date can\'t be in the past' });
    }

    const period = calculateRentalPeriod(startDate, pickup, endDate, dropoff);
    if (!period) {
      return res.status(400).json({ success: false, message: 'Return date and time must be after the pickup date and time' });
    }

    const vehicleResult = await query(
      "SELECT * FROM vehicles WHERE id = $1 AND status = 'available' AND verification_status <> 'rejected'",
      [vehicleId]
    );
    if (!vehicleResult.rows[0]) {
      return res.status(404).json({ success: false, message: 'Vehicle not available' });
    }

    const vehicle = vehicleResult.rows[0];

    if (vehicle.owner_id === req.user.id) {
      return res.status(403).json({ success: false, message: 'You cannot book your own vehicle' });
    }

    const maintenanceConflict = await query(
      `SELECT id FROM vehicle_maintenance_dates
       WHERE vehicle_id = $1 AND start_date <= $3 AND end_date >= $2`,
      [vehicleId, startDate, endDate]
    );
    if (maintenanceConflict.rows.length) {
      return res.status(409).json({
        success: false,
        message: 'This vehicle is unavailable during the selected dates (owner maintenance).',
      });
    }

    const bookingConflict = await query(
      `SELECT id FROM bookings
       WHERE vehicle_id = $1 AND status IN ('pending', 'approved', 'active')
       AND (start_date + COALESCE(pickup_time, '09:00'::time)) < ($3::date + $5::time) + $6 * INTERVAL '1 hour'
       AND (end_date + COALESCE(dropoff_time, '17:00'::time)) + $6 * INTERVAL '1 hour' > ($2::date + $4::time)`,
      [vehicleId, startDate, endDate, pickup, dropoff, BOOKING_GAP_HOURS]
    );
    if (bookingConflict.rows.length) {
      return res.status(409).json({
        success: false,
        message: `This vehicle is already booked around those dates. Another rental needs a ${BOOKING_GAP_HOURS}-hour gap before and after, so please pick a later pickup or an earlier return.`,
      });
    }

    const { days } = period;
    const wantsDriver = (withDriver === true || withDriver === 'true') && vehicle.driver_available;
    const driverFee = wantsDriver ? days * parseFloat(vehicle.driver_fee_per_day) : 0;
    const totalAmount = days * parseFloat(vehicle.price_per_day) + driverFee;

    // The renter accepts the rental agreement by typing their full name; it's stored with the booking.
    const signatureName = String(req.body.signatureName || '').trim().slice(0, 255);
    if (req.body.agreeToTerms !== true || signatureName.length < 2) {
      return res.status(400).json({
        success: false,
        code: 'AGREEMENT_REQUIRED',
        message: 'Please read and accept the Rental Agreement, and type your full name to sign it.',
      });
    }

    // Cash: the renter pays a reservation fee online now (it covers the platform commission) and the
    // rest in cash to the owner at pickup.
    const paymentOption = req.body.paymentOption === 'cash' ? 'cash' : 'online';
    let cashDue = 0;
    if (paymentOption === 'cash') {
      const settings = await query('SELECT commission_percentage FROM platform_settings ORDER BY id DESC LIMIT 1');
      const commissionPct = parseFloat(settings.rows[0]?.commission_percentage || 10);
      cashDue = Math.round((totalAmount - cashReservationAmount(totalAmount, commissionPct)) * 100) / 100;
    }

    // The owner never approves bookings: a booking stays 'pending' (awaiting payment) until the renter
    // pays, and the payment itself confirms it (see finalizeBookingPayment). The renter's protection is
    // the pickup inspection — they accept or reject the vehicle when the owner hands it over.
    const result = await query(
      `INSERT INTO bookings (customer_id, vehicle_id, start_date, end_date, pickup_time, dropoff_time, total_amount, with_driver, driver_fee, notes,
         payment_option, cash_due, agreement_signed_name, agreement_signed_at, agreement_version, agreement_ip)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), $14, $15) RETURNING *`,
      [req.user.id, vehicleId, startDate, endDate, pickup, dropoff, totalAmount, wantsDriver, driverFee, notes || null,
        paymentOption, cashDue, signatureName, RENTAL_AGREEMENT_VERSION, String(req.ip || '').slice(0, 64)]
    );

    const booking = result.rows[0];

    await createNotification(
      vehicle.owner_id,
      'New Booking (awaiting payment)',
      `${req.user.full_name} booked your ${vehicle.title}. It is confirmed automatically once they pay (unpaid bookings are cancelled after ${PAYMENT_WINDOW_MINUTES} minutes).`,
      'booking',
      `/dashboard/booking-requests`
    );

    res.status(201).json({ success: true, data: booking });
  } catch (error) {
    if (error.message?.includes('already booked')) {
      return res.status(409).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const getMyBookings = async (req, res, next) => {
  try {
    await sweepQuietly();
    const result = await query(
      `SELECT b.*, v.owner_id, v.title, v.brand, v.model, v.images, v.price_per_day, v.plate_number,
              v.city, v.barangay, v.pickup_address, v.latitude, v.longitude,
              u.full_name as owner_name, u.avatar_url as owner_avatar_url,
              u.approval_status = 'approved' as owner_verified,
              CASE WHEN ${CONTACT_SHARED_SQL} THEN u.email END as owner_email,
              CASE WHEN ${CONTACT_SHARED_SQL} THEN u.phone END as owner_phone,
              ${INSPECTION_SELECT}
       FROM bookings b
       JOIN vehicles v ON b.vehicle_id = v.id
       JOIN users u ON v.owner_id = u.id
       LEFT JOIN booking_disputes d ON d.booking_id = b.id
       WHERE b.customer_id = $1
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

const getOwnerBookings = async (req, res, next) => {
  try {
    await sweepQuietly();
    const result = await query(
      `SELECT b.*, v.owner_id, v.title, v.brand, v.model, v.images, v.plate_number,
              v.city, v.barangay, v.pickup_address,
              c.full_name as customer_name, c.email as customer_email, c.avatar_url as customer_avatar_url,
              c.approval_status = 'approved' as customer_verified,
              CASE WHEN ${CONTACT_SHARED_SQL} THEN c.phone END as customer_phone,
              ${INSPECTION_SELECT}
       FROM bookings b
       JOIN vehicles v ON b.vehicle_id = v.id
       JOIN users c ON b.customer_id = c.id
       LEFT JOIN booking_disputes d ON d.booking_id = b.id
       WHERE v.owner_id = $1
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

const getAllBookings = async (req, res, next) => {
  try {
    await sweepQuietly();
    const result = await query(
      `SELECT b.*, v.title, v.brand, v.model, v.images,
              v.city, v.barangay, v.pickup_address,
              c.id as customer_id, c.full_name as customer_name, c.email as customer_email, c.phone as customer_phone,
              o.id as owner_id, o.full_name as owner_name, o.email as owner_email, ${INSPECTION_SELECT}
       FROM bookings b
       JOIN vehicles v ON b.vehicle_id = v.id
       JOIN users c ON b.customer_id = c.id
       JOIN users o ON v.owner_id = o.id
       LEFT JOIN booking_disputes d ON d.booking_id = b.id
       ORDER BY b.created_at DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

const updateBookingStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['approved', 'rejected', 'active', 'completed', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const booking = await query(
      `SELECT b.*, v.owner_id, v.title, v.price_per_day, ${IS_PICKUP_DAY_SQL} AS is_pickup_day, ${PICKUP_LABEL_SQL} AS pickup_label,
              ${LATE_HOURS_SQL} AS late_hours_now
       FROM bookings b JOIN vehicles v ON b.vehicle_id = v.id WHERE b.id = $1`,
      [req.params.id]
    );

    if (!booking.rows[0]) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const b = booking.rows[0];
    if (req.user.role !== 'admin' && b.owner_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Keeps the lifecycle sensible — in particular a booking can only be completed (which unlocks
    // ratings) after it was approved, never straight from pending.
    const allowedTransitions = {
      pending: ['approved', 'rejected', 'cancelled'],
      approved: ['active', 'completed', 'cancelled'],
      active: ['completed'],
    };
    if (b.status === 'pending' && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'This booking is confirmed automatically once the renter pays — there is nothing to approve.',
      });
    }
    if (!(allowedTransitions[b.status] || []).includes(status)) {
      return res.status(400).json({ success: false, message: `A ${b.status} booking cannot be changed to ${status}` });
    }

    if (b.status === 'approved' && status === 'active' && !b.is_pickup_day && req.user.role !== 'admin') {
      return res.status(400).json({ success: false, code: 'NOT_PICKUP_DAY', message: notPickupDayMessage(b.pickup_label) });
    }

    // Once the vehicle is handed over, only the customer's inspection (or an admin resolving the
    // dispute) moves the booking on — otherwise the payout hold could be skipped.
    if (b.status === 'approved' && b.handed_over_at) {
      return res.status(400).json({
        success: false,
        message: b.inspection_result === 'rejected'
          ? 'The customer reported a problem with this vehicle. An admin must resolve the dispute first.'
          : "The vehicle was handed over. Waiting for the customer's inspection (it is accepted automatically when the time runs out).",
      });
    }
    // A paid booking must go through the pickup handover so the customer can inspect the vehicle.
    if (b.status === 'approved' && ['active', 'completed'].includes(status)
        && b.payment_status !== 'pending' && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'This booking is paid. Use "Hand Over Vehicle" so the customer can inspect and accept it first.',
      });
    }

    // Returned after the agreed drop-off time: the renter owes (daily price / 24) per started hour late.
    // Only when the vehicle was actually out with the renter (active), not for unpaid/skipped bookings.
    const lateHours = status === 'completed' && b.status === 'active' ? Number(b.late_hours_now) || 0 : 0;
    const lateFee = Math.round(lateHours * (Number(b.price_per_day) / 24) * 100) / 100;

    // Unpaid bookings (and admin overrides) skip the inspection, so treat them as accepted so any
    // later payment stays eligible for payout.
    const result = await query(
      `UPDATE bookings SET status = $1::booking_status, updated_at = NOW(),
         late_hours = late_hours + $3,
         late_fee = late_fee + $4,
         total_amount = total_amount + $4,
         payment_status = CASE WHEN $4 > 0 AND paid_amount > 0 THEN 'partially_paid'::payment_status ELSE payment_status END,
         completed_at = CASE WHEN $1::booking_status = 'completed' THEN NOW() ELSE completed_at END,
         inspection_result = CASE WHEN $1::booking_status IN ('active', 'completed')
           THEN COALESCE(inspection_result, 'accepted') ELSE inspection_result END,
         inspected_at = CASE WHEN $1::booking_status IN ('active', 'completed') AND inspection_result IS NULL
           THEN NOW() ELSE inspected_at END
       WHERE id = $2 RETURNING *`,
      [status, req.params.id, lateHours, lateFee]
    );

    if (lateFee > 0) {
      const hoursText = `${lateHours} hour${lateHours === 1 ? '' : 's'}`;
      await createNotification(
        b.customer_id,
        'Late return fee',
        `${b.title} was returned ${hoursText} after the agreed time. A late fee of ₱${lateFee.toFixed(2)} (₱${(Number(b.price_per_day) / 24).toFixed(2)}/hour) was added. Please pay it in My Bookings.`,
        'payment',
        '/dashboard/bookings'
      );
    }

    if (status === 'completed') {
      await createNotification(
        b.customer_id,
        'Trip completed — rate your experience',
        `Thanks for renting ${b.title}! Tap to rate the vehicle and the owner.`,
        'booking',
        '/dashboard/bookings'
      );
    } else {
      await createNotification(
        b.customer_id,
        `Booking ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        `Your booking for ${b.title} has been ${status === 'active' ? 'marked as picked up' : status}`,
        'booking'
      );
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

// Cancelling a paid booking before pickup. At least FREE_CANCEL_HOURS before the pickup time the renter gets
// the online payment back less only the platform commission (nothing goes to the owner); closer than that,
// LATE_CANCEL_REFUND_PERCENT of it comes back and the rest is split between the owner (for holding the
// vehicle) and the platform commission. Once pickup time has passed, there's no cancel.
const FREE_CANCEL_HOURS = 24;
const LATE_CANCEL_REFUND_PERCENT = 50;
const HOURS_TO_PICKUP_SQL = `EXTRACT(EPOCH FROM (((b.start_date + COALESCE(b.pickup_time, '09:00'::time)) AT TIME ZONE 'Asia/Manila') - NOW())) / 3600`;

const cancellationQuote = (b, commissionPct) => {
  const hoursToPickup = parseFloat(b.hours_to_pickup);
  const onlinePaid = round2(parseFloat(b.paid_amount) - parseFloat(b.cash_collected || 0));
  const early = hoursToPickup >= FREE_CANCEL_HOURS;
  // Early: only the platform's commission is kept. Late: half is kept.
  const platformFee = early ? round2(onlinePaid * commissionPct / 100) : 0;
  const refundAmount = early ? round2(onlinePaid - platformFee) : round2(onlinePaid * LATE_CANCEL_REFUND_PERCENT / 100);
  return {
    canCancel: b.status === 'approved' && !b.handed_over_at && hoursToPickup > 0 && onlinePaid > 0,
    freeCancelHours: FREE_CANCEL_HOURS,
    hoursToPickup,
    early,
    onlinePaid,
    percent: onlinePaid > 0 ? Math.round(refundAmount / onlinePaid * 100) : 0,
    platformFee,
    refundAmount,
    retainedAmount: round2(onlinePaid - refundAmount),
  };
};

const BOOKING_FOR_CANCEL_SQL = `SELECT b.*, v.owner_id, v.title, ${HOURS_TO_PICKUP_SQL} AS hours_to_pickup
  FROM bookings b JOIN vehicles v ON b.vehicle_id = v.id WHERE b.id = $1`;

const getCommissionPct = async (run) => {
  const settings = await run('SELECT commission_percentage FROM platform_settings ORDER BY id DESC LIMIT 1');
  return parseFloat(settings.rows[0]?.commission_percentage || 10);
};

const getCancellationQuote = async (req, res, next) => {
  try {
    const found = await query(BOOKING_FOR_CANCEL_SQL, [req.params.id]);
    const b = found.rows[0];
    if (!b) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (b.customer_id !== req.user.id) return res.status(403).json({ success: false, message: 'Access denied' });
    res.json({ success: true, data: cancellationQuote(b, await getCommissionPct(query)) });
  } catch (error) {
    next(error);
  }
};

const cancelPaidBooking = async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query(`${BOOKING_FOR_CANCEL_SQL} FOR UPDATE OF b`, [req.params.id]);
    const b = found.rows[0];
    const commissionPct = await getCommissionPct((text) => client.query(text));
    const quote = b && cancellationQuote(b, commissionPct);
    if (!b || b.customer_id !== req.user.id || !quote.canCancel) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'This booking can no longer be cancelled. Once the pickup time has passed or the vehicle was handed over, '
          + 'please contact the owner or support.',
      });
    }

    const fullRefund = quote.retainedAmount <= 0;

    // Send the money back before recording anything. If PayMongo can't, the cancellation still goes
    // through and the admins are asked to send the refund by hand.
    const refund = await sendPaymongoRefunds(client, b.id, quote.refundAmount, `Cancelled before pickup: ${b.title}`);
    const manualRemaining = refund.remaining;

    if (fullRefund) {
      await client.query(`UPDATE payments SET status = 'refunded' WHERE booking_id = $1`, [b.id]);
      await client.query(`UPDATE transactions SET status = 'refunded' WHERE booking_id = $1 AND type = 'payment'`, [b.id]);
      await client.query(
        `INSERT INTO transactions (booking_id, user_id, type, total_amount, commission_amount, owner_amount,
           platform_amount, status, invoice_number, description)
         VALUES ($1, $2, 'refund', $3, 0, 0, 0, 'refunded', $4, $5)`,
        [b.id, b.owner_id, quote.refundAmount, generateInvoiceNumber(), `Full refund for ${b.title} (cancelled before pickup)`]
      );
    } else {
      // What's kept: early, all of it is the platform's commission; late, it is split owner/platform by the
      // commission rate. The refund row takes the rest out of the shares recorded when the renter paid.
      const shares = await client.query(
        `SELECT COALESCE(SUM(platform_amount), 0) AS platform, COALESCE(SUM(owner_amount), 0) AS owner
         FROM transactions WHERE booking_id = $1 AND type = 'payment'`,
        [b.id]
      );
      const platformKept = quote.early ? quote.retainedAmount : round2(quote.retainedAmount * commissionPct / 100);
      const ownerKept = round2(quote.retainedAmount - platformKept);
      await client.query(
        `INSERT INTO transactions (booking_id, user_id, type, total_amount, commission_amount, owner_amount,
           platform_amount, commission_percentage, status, invoice_number, description)
         VALUES ($1, $2, 'refund', $3, $4, $5, $4, $6, 'refunded', $7, $8)`,
        [
          b.id, b.owner_id, quote.refundAmount,
          -round2(parseFloat(shares.rows[0].platform) - platformKept),
          -round2(parseFloat(shares.rows[0].owner) - ownerKept),
          commissionPct, generateInvoiceNumber(),
          quote.early ? `Refund less platform fee for ${b.title} (cancelled before pickup)` : `Partial refund for ${b.title} (late cancellation)`,
        ]
      );
    }

    // The owner's kept share becomes payable (there is no pickup inspection for a cancelled booking). It isn't
    // paid out automatically: it waits in the admin's Owner Payouts for a manual "Mark as Paid".
    const updated = await client.query(
      `UPDATE bookings SET status = 'cancelled', cash_due = 0, updated_at = NOW(),
         payment_status = CASE WHEN $2 THEN 'refunded'::payment_status ELSE payment_status END,
         inspection_result = CASE WHEN $2 THEN inspection_result ELSE 'accepted' END,
         inspected_at = CASE WHEN $2 THEN inspected_at ELSE NOW() END
       WHERE id = $1 RETURNING *`,
      [b.id, fullRefund]
    );
    await client.query('COMMIT');

    const timing = 'It goes back to the account you paid with: GCash/Maya within 24 hours, cards within 30 days.';
    await createNotification(
      b.customer_id,
      'Booking cancelled',
      `Your booking for ${b.title} was cancelled. ₱${quote.refundAmount.toFixed(2)} ${manualRemaining > 0 ? 'will be sent back to you.' : `has been refunded. ${timing}`}`
        + (quote.early && quote.platformFee > 0 ? ` The platform keeps a ₱${quote.platformFee.toFixed(2)} service fee (its commission).` : ''),
      'payment',
      '/dashboard/bookings'
    ).catch(() => {});
    const ownerKeeps = quote.early ? 0 : round2(quote.retainedAmount - round2(quote.retainedAmount * commissionPct / 100));
    await createNotification(
      b.owner_id,
      'Booking Cancelled',
      ownerKeeps > 0
        ? `The customer cancelled their booking for ${b.title} close to pickup. You keep ₱${ownerKeeps.toFixed(2)} for holding the vehicle.`
        : `The customer cancelled their booking for ${b.title} before pickup. The dates are free again.`,
      'booking',
      '/dashboard/booking-requests'
    ).catch(() => {});
    if (manualRemaining > 0) {
      const admins = await query(`SELECT id FROM users WHERE role = 'admin'`);
      for (const admin of admins.rows) {
        await createNotification(
          admin.id,
          'Manual refund needed',
          `Send ₱${manualRemaining.toFixed(2)} back to the renter of ${b.title} (cancelled before pickup). It wasn't refunded automatically${refund.error ? `: ${refund.error}` : '.'}`,
          'alert',
          '/dashboard/admin/payments'
        ).catch(() => {});
      }
    }

    res.json({ success: true, data: { ...updated.rows[0], refundAmount: quote.refundAmount, manualRefund: manualRemaining > 0 } });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally {
    client.release();
  }
};

const cancelMyBooking = async (req, res, next) => {
  try {
    const booking = await query(BOOKING_FOR_CANCEL_SQL, [req.params.id]);

    if (!booking.rows[0]) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const b = booking.rows[0];
    if (b.customer_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (['cancelled', 'completed', 'rejected'].includes(b.status)) {
      return res.status(400).json({ success: false, message: `This booking is already ${b.status}` });
    }
    // A booking with a payment on file is cancelled (and refunded) by its own flow.
    if (b.payment_status !== 'pending') {
      return cancelPaidBooking(req, res, next);
    }

    const result = await query(
      `UPDATE bookings SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    await createNotification(
      b.owner_id,
      'Booking Cancelled',
      `The customer cancelled their booking for ${b.title}`,
      'booking'
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

const getBookingById = async (req, res, next) => {
  try {
    await sweepQuietly();
    const result = await query(
      `SELECT b.*, v.title, v.brand, v.model, v.images, v.owner_id,
              v.city, v.barangay, v.pickup_address, v.latitude, v.longitude,
              c.full_name as customer_name, ${INSPECTION_SELECT}
       FROM bookings b
       JOIN vehicles v ON b.vehicle_id = v.id
       JOIN users c ON b.customer_id = c.id
       LEFT JOIN booking_disputes d ON d.booking_id = b.id
       WHERE b.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const booking = result.rows[0];
    const canView =
      req.user.role === 'admin' ||
      booking.customer_id === req.user.id ||
      booking.owner_id === req.user.id;

    if (!canView) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
};

// Owner hands the keys over in person. Starts the customer's inspection window; the payment stays
// held by the platform until the customer accepts (or the window runs out).
// Cash bookings: the owner records a balance still owed after the trip (a late fee) as paid in cash.
const recordCashPayment = async (req, res, next) => {
  try {
    const booking = await query(
      `SELECT b.*, v.owner_id, v.title FROM bookings b JOIN vehicles v ON b.vehicle_id = v.id WHERE b.id = $1`,
      [req.params.id]
    );
    const b = booking.rows[0];
    if (!b) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (b.owner_id !== req.user.id) return res.status(403).json({ success: false, message: 'Access denied' });
    const balance = Math.round((parseFloat(b.total_amount) - parseFloat(b.paid_amount)) * 100) / 100;
    if (b.payment_option !== 'cash' || b.status !== 'completed' || balance <= 0) {
      return res.status(400).json({ success: false, message: 'There is no cash balance to record for this booking' });
    }
    const result = await query(
      `UPDATE bookings SET paid_amount = total_amount, cash_collected = cash_collected + $2,
         cash_collected_at = NOW(), payment_status = 'fully_paid', cash_due = 0, updated_at = NOW()
       WHERE id = $1 AND paid_amount < total_amount RETURNING *`,
      [b.id, balance]
    );
    await createNotification(
      b.customer_id,
      'Cash payment recorded',
      `The owner recorded your ₱${balance.toFixed(2)} cash payment for ${b.title}. Your booking is fully paid.`,
      'payment',
      '/dashboard/bookings'
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

// Turns what's still unpaid online (`rest`) into cash due at pickup. The platform's commission on the whole
// booking is taken out of the online payments made so far, as in a regular cash booking.
const convertRestToCash = async (client, b, rest, commissionPct) => {
  let commissionLeft = Math.min(parseFloat(b.paid_amount), round2(parseFloat(b.total_amount) * commissionPct / 100));
  const payments = await client.query(
    `SELECT id, total_amount FROM transactions WHERE booking_id = $1 AND type = 'payment' ORDER BY created_at, id`,
    [b.id]
  );
  for (const t of payments.rows) {
    const amount = parseFloat(t.total_amount);
    const platform = round2(Math.min(amount, commissionLeft));
    commissionLeft = round2(commissionLeft - platform);
    await client.query(
      `UPDATE transactions SET commission_amount = $2, platform_amount = $2, owner_amount = $3 WHERE id = $1`,
      [t.id, platform, round2(amount - platform)]
    );
  }
  const updated = await client.query(
    `UPDATE bookings SET payment_option = 'cash', cash_due = cash_due + $2, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [b.id, rest]
  );
  return updated.rows[0];
};

// An online booking that already has its online share paid: the renter settles the rest in cash with the
// owner at pickup. It becomes a cash booking (the owner confirms the cash at handover), and the platform's
// commission on the whole booking is taken out of what was paid online, as in a regular cash booking.
const payRestInCash = async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query(
      `SELECT b.*, v.owner_id, v.title FROM bookings b JOIN vehicles v ON b.vehicle_id = v.id
       WHERE b.id = $1 FOR UPDATE OF b`,
      [req.params.id]
    );
    const b = found.rows[0];
    if (!b) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    if (b.customer_id !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const total = parseFloat(b.total_amount);
    const paid = parseFloat(b.paid_amount);
    const rest = round2(total - paid - parseFloat(b.cash_due || 0));
    if (b.payment_option !== 'online' || b.status !== 'approved' || b.handed_over_at || rest <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'The rest of this booking cannot be paid in cash' });
    }
    const settings = await client.query('SELECT commission_percentage FROM platform_settings ORDER BY id DESC LIMIT 1');
    const commissionPct = parseFloat(settings.rows[0]?.commission_percentage || 10);
    const minOnline = cashReservationAmount(total, commissionPct);
    if (paid < minOnline) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Pay at least ₱${minOnline.toFixed(2)} online first to pay the rest in cash.`,
      });
    }

    const converted = await convertRestToCash(client, b, rest, commissionPct);
    await client.query('COMMIT');

    await createNotification(
      b.owner_id,
      'Renter will pay the rest in cash',
      `The renter of ${b.title} paid ₱${paid.toFixed(2)} online and will pay the remaining ₱${rest.toFixed(2)} in cash at pickup. Collect it at the handover.`,
      'booking',
      '/dashboard/booking-requests'
    );
    res.json({ success: true, data: converted });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally {
    client.release();
  }
};

// The renter confirms they're with the owner at pickup. Only then can the owner hand the vehicle over (if the
// renter never does, the handover happens automatically a few hours after the pickup time).
const markReadyForPickup = async (req, res, next) => {
  try {
    const found = await query(
      `SELECT b.*, v.owner_id, v.title, ${IS_PICKUP_DAY_SQL} AS is_pickup_day, ${HANDOVER_OPEN_SQL} AS handover_open,
              ${HANDOVER_OPENS_LABEL_SQL} AS handover_opens_label, ${PICKUP_LABEL_SQL} AS pickup_label
       FROM bookings b JOIN vehicles v ON b.vehicle_id = v.id WHERE b.id = $1`,
      [req.params.id]
    );
    const b = found.rows[0];
    if (!b) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (b.customer_id !== req.user.id) return res.status(403).json({ success: false, message: 'Access denied' });
    if (b.status !== 'approved' || b.handed_over_at || b.payment_status === 'pending') {
      return res.status(400).json({ success: false, message: 'This booking is not waiting for pickup' });
    }
    if (!b.is_pickup_day) {
      return res.status(400).json({
        success: false,
        code: 'NOT_PICKUP_DAY',
        message: `You can confirm you're ready on your pickup date (${b.pickup_label}).`,
      });
    }
    if (!b.handover_open) {
      return res.status(400).json({ success: false, code: 'TOO_EARLY', message: handoverNotOpenMessage(b.handover_opens_label) });
    }
    const result = await query(
      `UPDATE bookings SET customer_ready_at = COALESCE(customer_ready_at, NOW()), updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [b.id]
    );
    if (!b.customer_ready_at) {
      await createNotification(
        b.owner_id,
        'Renter is ready for pickup',
        `The renter of ${b.title} confirmed they're here. You can hand over the vehicle now.`,
        'booking',
        '/dashboard/booking-requests'
      ).catch(() => {});
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

const handOverVehicle = async (req, res, next) => {
  try {
    const booking = await query(
      `SELECT b.*, v.owner_id, v.title, ${IS_PICKUP_DAY_SQL} AS is_pickup_day, ${HANDOVER_OPEN_SQL} AS handover_open,
              ${HANDOVER_OPENS_LABEL_SQL} AS handover_opens_label, ${PICKUP_LABEL_SQL} AS pickup_label
       FROM bookings b JOIN vehicles v ON b.vehicle_id = v.id WHERE b.id = $1`,
      [req.params.id]
    );
    const b = booking.rows[0];
    if (!b) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (b.owner_id !== req.user.id) return res.status(403).json({ success: false, message: 'Access denied' });
    if (b.status !== 'approved' || b.handed_over_at) {
      return res.status(400).json({ success: false, message: 'Only an approved booking that has not been handed over yet can be handed over' });
    }
    if (b.payment_status === 'pending') {
      return res.status(400).json({
        success: false,
        message: 'The customer has not paid yet. Use "Mark as Picked Up" for unpaid bookings.',
      });
    }
    if (!b.is_pickup_day) {
      return res.status(400).json({ success: false, code: 'NOT_PICKUP_DAY', message: notPickupDayMessage(b.pickup_label) });
    }
    if (!b.handover_open) {
      return res.status(400).json({ success: false, code: 'TOO_EARLY', message: handoverNotOpenMessage(b.handover_opens_label) });
    }
    if (!b.customer_ready_at && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        code: 'RENTER_NOT_READY',
        message: "The renter hasn't confirmed they're here yet. Ask them to tap \"I'm here — ready for pickup\" in My Bookings.",
      });
    }
    let cashDue = parseFloat(b.cash_due) || 0;
    // Part of the booking is still unpaid and isn't set to be paid in cash: the owner collects it in cash at
    // the handover, as long as the renter paid enough online to cover the platform's commission.
    const unpaidOnline = round2(parseFloat(b.total_amount) - parseFloat(b.paid_amount) - cashDue);
    if (unpaidOnline > 0) {
      const settings = await query('SELECT commission_percentage FROM platform_settings ORDER BY id DESC LIMIT 1');
      const commissionPct = parseFloat(settings.rows[0]?.commission_percentage || 10);
      const minOnline = cashReservationAmount(parseFloat(b.total_amount), commissionPct);
      if (parseFloat(b.paid_amount) < minOnline) {
        return res.status(400).json({
          success: false,
          code: 'BALANCE_UNPAID',
          message: `The renter has paid less than the ₱${minOnline.toFixed(2)} minimum online share. They need to pay at least that online first.`,
        });
      }
      if (req.body?.cashReceived !== true) {
        return res.status(400).json({
          success: false,
          code: 'CASH_NOT_CONFIRMED',
          message: `Collect the ₱${(cashDue + unpaidOnline).toFixed(2)} cash from the renter, then confirm it when handing over.`,
        });
      }
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await convertRestToCash(client, b, unpaidOnline, commissionPct);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
      cashDue = round2(cashDue + unpaidOnline);
    }
    if (cashDue > 0 && req.body?.cashReceived !== true) {
      return res.status(400).json({
        success: false,
        code: 'CASH_NOT_CONFIRMED',
        message: `Collect the ₱${cashDue.toFixed(2)} cash from the renter, then confirm it when handing over.`,
      });
    }

    const windowMinutes = await getInspectionWindowMinutes();
    const result = await query(
      `UPDATE bookings SET handed_over_at = NOW(),
         inspection_deadline = NOW() + $2::int * INTERVAL '1 minute',
         inspection_reminder_sent = false, updated_at = NOW(),
         -- Cash bookings: the owner confirmed receiving the cash, so it now counts as paid.
         paid_amount = paid_amount + cash_due,
         cash_collected = cash_collected + cash_due,
         cash_collected_at = CASE WHEN cash_due > 0 THEN NOW() ELSE cash_collected_at END,
         payment_status = CASE WHEN cash_due > 0 AND paid_amount + cash_due >= total_amount
           THEN 'fully_paid'::payment_status ELSE payment_status END,
         cash_due = 0
       WHERE id = $1 AND status = 'approved' AND handed_over_at IS NULL
         AND start_date = (NOW() AT TIME ZONE 'Asia/Manila')::date
       RETURNING *`,
      [b.id, windowMinutes]
    );
    if (!result.rows[0]) {
      return res.status(409).json({ success: false, message: 'This booking was already handed over' });
    }

    await createNotification(
      b.customer_id,
      'Inspect your vehicle now',
      `The owner handed over ${b.title}. You have ${windowMinutes} minutes to accept it or report a problem — after that it is accepted automatically.`,
      'alert',
      '/dashboard/bookings'
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

// Explains why an accept/reject didn't apply, after catching up on any overdue auto-accepts.
const inspectionClosedResponse = async (res, bookingId, customerId) => {
  await runInspectionSweep();
  const current = await query('SELECT * FROM bookings WHERE id = $1', [bookingId]);
  const b = current.rows[0];
  if (!b) return res.status(404).json({ success: false, message: 'Booking not found' });
  if (b.customer_id !== customerId) return res.status(403).json({ success: false, message: 'Access denied' });
  if (!b.handed_over_at) {
    return res.status(400).json({ success: false, message: 'The owner has not handed over the vehicle yet' });
  }
  if (b.inspection_result === 'auto_accepted') {
    return res.status(400).json({
      success: false,
      message: 'The inspection time has ended and the vehicle was accepted automatically. To report a problem now, use "Report Owner".',
    });
  }
  return res.status(400).json({ success: false, message: 'This vehicle has already been inspected' });
};

const acceptVehicle = async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE bookings b SET status = 'active', inspection_result = 'accepted', inspected_at = NOW(), updated_at = NOW()
       FROM vehicles v
       WHERE b.vehicle_id = v.id AND b.id = $1 AND b.customer_id = $2
         AND b.status = 'approved' AND b.handed_over_at IS NOT NULL
         AND b.inspection_result IS NULL AND b.inspection_deadline > NOW()
       RETURNING b.*, v.owner_id, v.title`,
      [req.params.id, req.user.id]
    );
    const b = result.rows[0];
    if (!b) return await inspectionClosedResponse(res, req.params.id, req.user.id);

    await createNotification(
      b.owner_id,
      'Vehicle accepted',
      `The renter accepted ${b.title}. Your earnings are being sent to your payout account.`,
      'payment',
      '/dashboard/earnings'
    );
    // Accepting releases the held payment: send the owner's share right away.
    await autoPayoutOwner(b.owner_id, 'accepted');

    res.json({ success: true, data: b });
  } catch (error) {
    next(error);
  }
};

// Customer rejects the vehicle at pickup (multipart: "reason" + 0-5 optional "evidence" photos/videos).
// Cancels the booking right away so its dates can be booked by someone else, freezes the owner's
// payout, and opens a dispute for an admin to decide how much (if any) of the payment to refund.
const rejectVehicle = async (req, res, next) => {
  const files = req.files || [];
  const removeUploads = () => Promise.all(files.map((f) => fs.promises.unlink(f.path).catch(() => {})));
  const client = await pool.connect();
  try {
    const reason = String(req.body.reason || '').trim();
    if (reason.length < 5 || reason.length > 2000) {
      await removeUploads();
      return res.status(400).json({ success: false, message: 'Please describe the problem (5-2000 characters)' });
    }
    // A refund needs proof, so at least one photo or video of the problem is required.
    if (!files.length) {
      return res.status(400).json({ success: false, message: 'Attach at least one photo or video of the problem as proof' });
    }
    if (files.some((f) => !f.mimetype.startsWith('video/') && f.size > CHAT_IMAGE_MAX_BYTES)) {
      await removeUploads();
      return res.status(400).json({ success: false, message: 'Each photo must be 5 MB or smaller' });
    }

    const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const evidence = files.map((f) => ({
      url: `${baseUrl}/uploads/${f.filename}`,
      type: f.mimetype.startsWith('video/') ? 'video' : 'image',
    }));

    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE bookings b SET status = 'cancelled', inspection_result = 'rejected', inspected_at = NOW(), updated_at = NOW()
       FROM vehicles v
       WHERE b.vehicle_id = v.id AND b.id = $1 AND b.customer_id = $2
         AND b.status = 'approved' AND b.handed_over_at IS NOT NULL
         AND b.inspection_result IS NULL AND b.inspection_deadline > NOW()
       RETURNING b.*, v.owner_id, v.title`,
      [req.params.id, req.user.id]
    );
    const b = result.rows[0];
    if (!b) {
      await client.query('ROLLBACK');
      await removeUploads();
      return await inspectionClosedResponse(res, req.params.id, req.user.id);
    }
    const dispute = await client.query(
      `INSERT INTO booking_disputes (booking_id, customer_id, reason, evidence)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [b.id, req.user.id, reason, JSON.stringify(evidence)]
    );
    await client.query('COMMIT');

    // The renter is refunded a fixed share right away. Only if that can't be sent does the dispute stay open
    // for an admin to decide (and the owner's payout stays on hold until then).
    const auto = await autoResolveDispute(dispute.rows[0].id);
    if (auto.resolved) {
      const admins = await query("SELECT id FROM users WHERE role = 'admin' AND is_active = true");
      for (const admin of admins.rows) {
        await createNotification(
          admin.id,
          'Renter rejected a vehicle',
          `A renter rejected ${b.title} at pickup and was refunded ${AUTO_REFUND_PERCENT}% automatically. See Pickup Disputes for the evidence.`,
          'alert',
          '/dashboard/admin/disputes'
        ).catch(() => {});
      }
    } else {
      await createNotification(
        b.owner_id,
        'Renter reported a problem with your vehicle',
        `The renter rejected ${b.title} at pickup: "${reason.slice(0, 120)}". The booking was cancelled and your payout is on hold while an admin reviews it.`,
        'alert',
        '/dashboard/booking-requests'
      ).catch(() => {});
      const admins = await query("SELECT id FROM users WHERE role = 'admin' AND is_active = true");
      for (const admin of admins.rows) {
        await createNotification(
          admin.id,
          'New pickup dispute',
          `A renter rejected ${b.title} at pickup, and the automatic ${AUTO_REFUND_PERCENT}% refund could not be sent${auto.error ? ` (${auto.error})` : ''}. Review the evidence and resolve it.`,
          'alert',
          '/dashboard/admin/disputes'
        ).catch(() => {});
      }
    }

    res.status(201).json({
      success: true,
      data: {
        booking: b,
        dispute: dispute.rows[0],
        autoRefund: auto.resolved ? { amount: auto.refundAmount, percent: AUTO_REFUND_PERCENT } : null,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    await removeUploads();
    next(error);
  } finally {
    client.release();
  }
};

// What the renter can still extend: allowed or not (with the reason), the most hours they can add and
// the hourly price. Used by the "Add Hours" dialog.
const getExtensionOptions = async (req, res, next) => {
  try {
    const quote = await getExtensionQuote(req.params.id, req.query.hours);
    if (!quote) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (quote.booking.customer_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const settings = await query('SELECT commission_percentage FROM platform_settings ORDER BY id DESC LIMIT 1');
    const commissionPct = parseFloat(settings.rows[0]?.commission_percentage || 10);
    const onlineAmount = quote.amount !== undefined
      ? extensionOnlineAmount(quote.booking, quote.amount, commissionPct) : undefined;
    res.json({
      success: true,
      data: {
        allowed: quote.allowed,
        reason: quote.reason,
        maxHours: quote.maxHours,
        hourlyRate: quote.hourlyRate,
        paymentOption: quote.booking.payment_option,
        currentEndDate: quote.booking.end_date,
        currentDropoffTime: quote.booking.dropoff_time,
        nextBlockAt: quote.nextBlockAt,
        hours: quote.hours,
        amount: quote.amount,
        onlineAmount,
        cashAmount: onlineAmount !== undefined ? round2(quote.amount - onlineAmount) : undefined,
        newEndDate: quote.newEndDate,
        newDropoffTime: quote.newDropoffTime,
      },
    });
  } catch (error) {
    next(error);
  }
};

const bookingValidation = [
  body('vehicleId').isUUID(),
  body('startDate').isISO8601(),
  body('endDate').isISO8601(),
  body('pickupTime').optional().matches(/^\d{2}:\d{2}(:\d{2})?$/),
  body('dropoffTime').optional().matches(/^\d{2}:\d{2}(:\d{2})?$/),
  body('paymentOption').optional().isIn(['online', 'cash']),
  body('agreeToTerms').optional().isBoolean(),
  body('signatureName').optional().isString().isLength({ max: 255 }),
];

module.exports = {
  createBooking, getMyBookings, getOwnerBookings, getAllBookings,
  updateBookingStatus, cancelMyBooking, getBookingById, bookingValidation,
  handOverVehicle, acceptVehicle, rejectVehicle, recordCashPayment, payRestInCash, getCancellationQuote, markReadyForPickup, getExtensionOptions,
};
