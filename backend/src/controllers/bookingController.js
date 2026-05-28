const { body, validationResult } = require('express-validator');
const { query } = require('../config/db');
const { calculateDays } = require('../utils/helpers');
const { createNotification } = require('../utils/notifications');

const createBooking = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { vehicleId, startDate, endDate, notes } = req.body;

    const vehicleResult = await query(
      "SELECT * FROM vehicles WHERE id = $1 AND status = 'available'",
      [vehicleId]
    );
    if (!vehicleResult.rows[0]) {
      return res.status(404).json({ success: false, message: 'Vehicle not available' });
    }

    const vehicle = vehicleResult.rows[0];
    const days = calculateDays(startDate, endDate);
    const totalAmount = days * parseFloat(vehicle.price_per_day);

    const result = await query(
      `INSERT INTO bookings (customer_id, vehicle_id, start_date, end_date, total_amount, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.id, vehicleId, startDate, endDate, totalAmount, notes || null]
    );

    const booking = result.rows[0];

    await createNotification(
      vehicle.owner_id,
      'New Booking Request',
      `A customer requested to book your ${vehicle.title}`,
      'booking',
      `/dashboard/owner/bookings`
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
    const result = await query(
      `SELECT b.*, v.title, v.brand, v.model, v.images, v.price_per_day,
              u.full_name as owner_name
       FROM bookings b
       JOIN vehicles v ON b.vehicle_id = v.id
       JOIN users u ON v.owner_id = u.id
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
    const result = await query(
      `SELECT b.*, v.title, v.brand, v.model,
              c.full_name as customer_name, c.email as customer_email, c.phone as customer_phone
       FROM bookings b
       JOIN vehicles v ON b.vehicle_id = v.id
       JOIN users c ON b.customer_id = c.id
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
    const result = await query(
      `SELECT b.*, v.title, v.brand, v.model,
              c.full_name as customer_name, o.full_name as owner_name
       FROM bookings b
       JOIN vehicles v ON b.vehicle_id = v.id
       JOIN users c ON b.customer_id = c.id
       JOIN users o ON v.owner_id = o.id
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
      `SELECT b.*, v.owner_id, v.title FROM bookings b
       JOIN vehicles v ON b.vehicle_id = v.id WHERE b.id = $1`,
      [req.params.id]
    );

    if (!booking.rows[0]) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const b = booking.rows[0];
    if (req.user.role === 'owner' && b.owner_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const result = await query(
      `UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );

    if (status === 'approved') {
      await query("UPDATE vehicles SET status = 'rented' WHERE id = $1", [b.vehicle_id]);
    }
    if (['rejected', 'cancelled', 'completed'].includes(status)) {
      await query("UPDATE vehicles SET status = 'available' WHERE id = $1", [b.vehicle_id]);
    }

    await createNotification(
      b.customer_id,
      `Booking ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      `Your booking for ${b.title} has been ${status}`,
      'booking'
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

const getBookingById = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT b.*, v.title, v.brand, v.model, v.images, v.owner_id,
              c.full_name as customer_name
       FROM bookings b
       JOIN vehicles v ON b.vehicle_id = v.id
       JOIN users c ON b.customer_id = c.id
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

const bookingValidation = [
  body('vehicleId').isUUID(),
  body('startDate').isISO8601(),
  body('endDate').isISO8601(),
];

module.exports = {
  createBooking, getMyBookings, getOwnerBookings, getAllBookings,
  updateBookingStatus, getBookingById, bookingValidation,
};
