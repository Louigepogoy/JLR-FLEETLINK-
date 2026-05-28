const { body, validationResult } = require('express-validator');
const { query } = require('../config/db');
const { generateInvoiceNumber, calculateCommission } = require('../utils/helpers');
const { validateGCashPayment, validateCardPayment } = require('../services/paymentService');
const { createNotification } = require('../utils/notifications');

const processPayment = async (req, res, next) => {
  const client = await require('../config/db').pool.connect();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { bookingId, amount, paymentMethod, paymentDetails } = req.body;

    await client.query('BEGIN');

    const bookingResult = await client.query(
      `SELECT b.*, v.owner_id, v.title FROM bookings b
       JOIN vehicles v ON b.vehicle_id = v.id
       WHERE b.id = $1 FOR UPDATE`,
      [bookingId]
    );

    if (!bookingResult.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];

    if (booking.customer_id !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'Unauthorized payment' });
    }

    if (!['pending', 'approved', 'active'].includes(booking.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Booking not eligible for payment' });
    }

    const remaining = parseFloat(booking.total_amount) - parseFloat(booking.paid_amount);
    if (amount > remaining) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Payment exceeds remaining balance of ₱${remaining.toFixed(2)}`,
      });
    }

    if (amount <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Invalid payment amount' });
    }

    let paymentResult;
    if (paymentMethod === 'gcash') {
      paymentResult = await validateGCashPayment({
        amount,
        phoneNumber: paymentDetails.phoneNumber,
        pin: paymentDetails.pin,
      });
    } else if (paymentMethod === 'card') {
      paymentResult = await validateCardPayment({
        amount,
        cardNumber: paymentDetails.cardNumber,
        expiry: paymentDetails.expiry,
        cvv: paymentDetails.cvv,
        cardholderName: paymentDetails.cardholderName,
      });
    } else {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Invalid payment method' });
    }

    const settingsResult = await client.query(
      'SELECT commission_percentage FROM platform_settings ORDER BY id DESC LIMIT 1'
    );
    const commissionPct = parseFloat(settingsResult.rows[0]?.commission_percentage || 10);
    const { platformAmount, ownerAmount } = calculateCommission(amount, commissionPct);

    const newPaidAmount = parseFloat(booking.paid_amount) + amount;
    const paymentStatus =
      newPaidAmount >= parseFloat(booking.total_amount) ? 'fully_paid' : 'partially_paid';

    const paymentInsert = await client.query(
      `INSERT INTO payments (booking_id, amount, payment_method, status, reference_number, card_last_four)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        bookingId, amount, paymentMethod, paymentStatus,
        paymentResult.referenceNumber, paymentResult.cardLastFour || null,
      ]
    );

    const invoiceNumber = generateInvoiceNumber();

    await client.query(
      `INSERT INTO transactions (booking_id, payment_id, user_id, type, total_amount,
        commission_amount, owner_amount, platform_amount, commission_percentage, status, invoice_number, description)
       VALUES ($1, $2, $3, 'payment', $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        bookingId, paymentInsert.rows[0].id, booking.owner_id, amount,
        platformAmount, ownerAmount, platformAmount, commissionPct,
        paymentStatus, invoiceNumber,
        `Payment for ${booking.title} - ${paymentMethod.toUpperCase()}`,
      ]
    );

    await client.query(
      `UPDATE bookings SET paid_amount = $1, payment_status = $2, updated_at = NOW() WHERE id = $3`,
      [newPaidAmount, paymentStatus, bookingId]
    );

    await client.query('COMMIT');

    await createNotification(
      booking.owner_id,
      'Payment Received',
      `₱${ownerAmount.toFixed(2)} received for ${booking.title}`,
      'payment'
    );
    await createNotification(
      req.user.id,
      'Payment Successful',
      `₱${amount.toFixed(2)} paid. ${paymentStatus === 'fully_paid' ? 'Booking fully paid!' : `Remaining: ₱${(parseFloat(booking.total_amount) - newPaidAmount).toFixed(2)}`}`,
      'payment'
    );

    res.json({
      success: true,
      data: {
        payment: paymentInsert.rows[0],
        invoiceNumber,
        paidAmount: newPaidAmount,
        remainingBalance: parseFloat(booking.total_amount) - newPaidAmount,
        paymentStatus,
        commission: { percentage: commissionPct, platformAmount, ownerAmount },
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

const getPaymentsByBooking = async (req, res, next) => {
  try {
    const booking = await query('SELECT customer_id FROM bookings WHERE id = $1', [req.params.bookingId]);
    if (!booking.rows[0]) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    if (booking.rows[0].customer_id !== req.user.id && req.user.role !== 'admin') {
      const vehicle = await query(
        `SELECT v.owner_id FROM bookings b JOIN vehicles v ON b.vehicle_id = v.id WHERE b.id = $1`,
        [req.params.bookingId]
      );
      if (vehicle.rows[0]?.owner_id !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    const result = await query(
      'SELECT * FROM payments WHERE booking_id = $1 ORDER BY created_at DESC',
      [req.params.bookingId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

const getInvoice = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT t.*, b.start_date, b.end_date, b.total_amount,
              v.title as vehicle_title, c.full_name as customer_name,
              p.payment_method, p.reference_number
       FROM transactions t
       JOIN bookings b ON t.booking_id = b.id
       JOIN vehicles v ON b.vehicle_id = v.id
       JOIN users c ON b.customer_id = c.id
       LEFT JOIN payments p ON t.payment_id = p.id
       WHERE t.invoice_number = $1`,
      [req.params.invoiceNumber]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

const paymentValidation = [
  body('bookingId').isUUID(),
  body('amount').isFloat({ min: 1 }),
  body('paymentMethod').isIn(['gcash', 'card']),
];

module.exports = { processPayment, getPaymentsByBooking, getInvoice, paymentValidation };
