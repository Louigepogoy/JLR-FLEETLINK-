const fs = require('fs');
const { body, validationResult } = require('express-validator');
const { query, pool } = require('../config/db');
const { calculateRentalPeriod } = require('../utils/helpers');
const { createNotification } = require('../utils/notifications');
const { CHAT_IMAGE_MAX_BYTES } = require('../middleware/upload');
const { getInspectionWindowMinutes, runInspectionSweep, sweepQuietly } = require('../services/inspectionService');
const { autoPayoutOwner } = require('../services/payoutService');
const { PAYMENT_SECONDS_LEFT_SQL, PAYMENT_WINDOW_MINUTES } = require('../services/bookingExpiryService');

// Renter and owner only see each other's phone (and the renter the owner's email) once the renter
// has paid and the booking is confirmed, so contact details aren't handed out on unpaid bookings.
const CONTACT_SHARED_SQL = `b.status IN ('approved', 'active', 'completed')`;

// True when today (Philippine time) is the booking's pickup date — the only day the owner may hand
// the vehicle over. Expects `b` = bookings.
const IS_PICKUP_DAY_SQL = `(b.start_date = (NOW() AT TIME ZONE 'Asia/Manila')::date)`;
const PICKUP_LABEL_SQL = `TO_CHAR(b.start_date, 'FMMonth FMDD, YYYY')`;
const notPickupDayMessage = (label) =>
  `You can only hand over the vehicle on the pickup date the renter booked (${label}).`;

// Pickup-inspection fields added to every booking list, seen from the server clock so a wrong
// client clock can't break the countdown.
const INSPECTION_SELECT = `
  GREATEST(0, EXTRACT(EPOCH FROM (b.inspection_deadline - NOW())))::int AS inspection_seconds_left,
  ${PAYMENT_SECONDS_LEFT_SQL} AS payment_seconds_left,
  ${IS_PICKUP_DAY_SQL} AS is_pickup_day,
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
       AND start_date <= $3 AND end_date >= $2`,
      [vehicleId, startDate, endDate]
    );
    if (bookingConflict.rows.length) {
      return res.status(409).json({
        success: false,
        message: 'This vehicle is already booked for the selected dates.',
      });
    }

    const { days } = period;
    const wantsDriver = (withDriver === true || withDriver === 'true') && vehicle.driver_available;
    const driverFee = wantsDriver ? days * parseFloat(vehicle.driver_fee_per_day) : 0;
    const totalAmount = days * parseFloat(vehicle.price_per_day) + driverFee;

    // The owner never approves bookings: a booking stays 'pending' (awaiting payment) until the renter
    // pays, and the payment itself confirms it (see finalizeBookingPayment). The renter's protection is
    // the pickup inspection — they accept or reject the vehicle when the owner hands it over.
    const result = await query(
      `INSERT INTO bookings (customer_id, vehicle_id, start_date, end_date, pickup_time, dropoff_time, total_amount, with_driver, driver_fee, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [req.user.id, vehicleId, startDate, endDate, pickup, dropoff, totalAmount, wantsDriver, driverFee, notes || null]
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
      `SELECT b.*, v.owner_id, v.title, ${IS_PICKUP_DAY_SQL} AS is_pickup_day, ${PICKUP_LABEL_SQL} AS pickup_label
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

    // Unpaid bookings (and admin overrides) skip the inspection, so treat them as accepted so any
    // later payment stays eligible for payout.
    const result = await query(
      `UPDATE bookings SET status = $1::booking_status, updated_at = NOW(),
         completed_at = CASE WHEN $1::booking_status = 'completed' THEN NOW() ELSE completed_at END,
         inspection_result = CASE WHEN $1::booking_status IN ('active', 'completed')
           THEN COALESCE(inspection_result, 'accepted') ELSE inspection_result END,
         inspected_at = CASE WHEN $1::booking_status IN ('active', 'completed') AND inspection_result IS NULL
           THEN NOW() ELSE inspected_at END
       WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );

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

const cancelMyBooking = async (req, res, next) => {
  try {
    const booking = await query(
      `SELECT b.*, v.owner_id, v.title FROM bookings b
       JOIN vehicles v ON b.vehicle_id = v.id WHERE b.id = $1`,
      [req.params.id]
    );

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
    if (b.payment_status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'This booking already has a payment on file, so it can no longer be self-cancelled. Please contact the owner or support.',
      });
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
const handOverVehicle = async (req, res, next) => {
  try {
    const booking = await query(
      `SELECT b.*, v.owner_id, v.title, ${IS_PICKUP_DAY_SQL} AS is_pickup_day, ${PICKUP_LABEL_SQL} AS pickup_label
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

    const windowMinutes = await getInspectionWindowMinutes();
    const result = await query(
      `UPDATE bookings SET handed_over_at = NOW(),
         inspection_deadline = NOW() + $2::int * INTERVAL '1 minute',
         inspection_reminder_sent = false, updated_at = NOW()
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
        `A renter rejected ${b.title} at pickup. Review the evidence and resolve it.`,
        'alert',
        '/dashboard/admin/disputes'
      ).catch(() => {});
    }

    res.status(201).json({ success: true, data: { booking: b, dispute: dispute.rows[0] } });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    await removeUploads();
    next(error);
  } finally {
    client.release();
  }
};

const bookingValidation = [
  body('vehicleId').isUUID(),
  body('startDate').isISO8601(),
  body('endDate').isISO8601(),
  body('pickupTime').optional().matches(/^\d{2}:\d{2}(:\d{2})?$/),
  body('dropoffTime').optional().matches(/^\d{2}:\d{2}(:\d{2})?$/),
];

module.exports = {
  createBooking, getMyBookings, getOwnerBookings, getAllBookings,
  updateBookingStatus, cancelMyBooking, getBookingById, bookingValidation,
  handOverVehicle, acceptVehicle, rejectVehicle,
};
