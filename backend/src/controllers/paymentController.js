const { query, pool } = require('../config/db');
const { generateInvoiceNumber, calculateCommission } = require('../utils/helpers');
const { createNotification } = require('../utils/notifications');

/**
 * Records a confirmed payment against a booking. Called by the Xendit webhook
 * once a payment has actually been received — never trust a client to call this directly.
 */
const finalizeBookingPayment = async ({ bookingId, amount, paymentMethod, referenceNumber, metadata = {} }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const bookingResult = await client.query(
      `SELECT b.*, v.owner_id, v.title FROM bookings b
       JOIN vehicles v ON b.vehicle_id = v.id
       WHERE b.id = $1 FOR UPDATE`,
      [bookingId]
    );

    if (!bookingResult.rows[0]) {
      await client.query('ROLLBACK');
      throw new Error(`Booking ${bookingId} not found while finalizing payment`);
    }

    const booking = bookingResult.rows[0];

    const settingsResult = await client.query(
      'SELECT commission_percentage FROM platform_settings ORDER BY id DESC LIMIT 1'
    );
    const commissionPct = parseFloat(settingsResult.rows[0]?.commission_percentage || 10);
    const { platformAmount, ownerAmount } = calculateCommission(amount, commissionPct);

    const newPaidAmount = parseFloat(booking.paid_amount) + amount;
    const paymentStatus =
      newPaidAmount >= parseFloat(booking.total_amount) ? 'fully_paid' : 'partially_paid';

    const paymentInsert = await client.query(
      `INSERT INTO payments (booking_id, amount, payment_method, status, reference_number, metadata)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [bookingId, amount, paymentMethod, paymentStatus, referenceNumber, JSON.stringify(metadata)]
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
      booking.customer_id,
      'Payment Successful',
      `₱${amount.toFixed(2)} paid. ${paymentStatus === 'fully_paid' ? 'Booking fully paid!' : `Remaining: ₱${(parseFloat(booking.total_amount) - newPaidAmount).toFixed(2)}`}`,
      'payment'
    );

    return {
      payment: paymentInsert.rows[0],
      invoiceNumber,
      referenceNumber,
      paidAmount: newPaidAmount,
      remainingBalance: parseFloat(booking.total_amount) - newPaidAmount,
      paymentStatus,
      receiptUrl: `/dashboard/receipt/${invoiceNumber}`,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
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
      `SELECT t.*, b.id as booking_id, b.customer_id, b.start_date, b.end_date,
              b.pickup_time, b.dropoff_time, b.total_amount as booking_total,
              b.paid_amount as booking_paid, b.payment_status as booking_payment_status,
              b.status as booking_status,
              v.title as vehicle_title, v.brand, v.model, v.plate_number,
              v.city, v.barangay, v.pickup_address, v.price_per_day,
              c.full_name as customer_name, c.email as customer_email, c.phone as customer_phone,
              o.full_name as owner_name,
              p.payment_method, p.reference_number, p.card_last_four, p.metadata as payment_metadata,
              p.amount as payment_amount, p.created_at as payment_date
       FROM transactions t
       JOIN bookings b ON t.booking_id = b.id
       JOIN vehicles v ON b.vehicle_id = v.id
       JOIN users c ON b.customer_id = c.id
       JOIN users o ON v.owner_id = o.id
       LEFT JOIN payments p ON t.payment_id = p.id
       WHERE t.invoice_number = $1`,
      [req.params.invoiceNumber]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const receipt = result.rows[0];
    const canView =
      req.user.role === 'admin' ||
      receipt.customer_id === req.user.id ||
      receipt.user_id === req.user.id;

    if (!canView) {
      const bookingCheck = await query(
        `SELECT b.customer_id, v.owner_id FROM bookings b
         JOIN vehicles v ON b.vehicle_id = v.id WHERE b.id = $1`,
        [receipt.booking_id]
      );
      const b = bookingCheck.rows[0];
      if (!b || (b.customer_id !== req.user.id && b.owner_id !== req.user.id)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    res.json({ success: true, data: receipt });
  } catch (error) {
    next(error);
  }
};

const getBookingReceipt = async (req, res, next) => {
  try {
    const bookingResult = await query(
      `SELECT b.*, v.title as vehicle_title, v.brand, v.model, v.plate_number,
              v.city, v.barangay, v.pickup_address, v.price_per_day, v.owner_id,
              c.full_name as customer_name, c.email as customer_email,
              o.full_name as owner_name
       FROM bookings b
       JOIN vehicles v ON b.vehicle_id = v.id
       JOIN users c ON b.customer_id = c.id
       JOIN users o ON v.owner_id = o.id
       WHERE b.id = $1`,
      [req.params.bookingId]
    );

    if (!bookingResult.rows[0]) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];
    const canView =
      req.user.role === 'admin' ||
      booking.customer_id === req.user.id ||
      booking.owner_id === req.user.id;

    if (!canView) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const payments = await query(
      `SELECT p.*, t.invoice_number, t.id as transaction_id
       FROM payments p
       LEFT JOIN transactions t ON t.payment_id = p.id
       WHERE p.booking_id = $1
       ORDER BY p.created_at DESC`,
      [req.params.bookingId]
    );

    res.json({
      success: true,
      data: { booking, payments: payments.rows },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  finalizeBookingPayment, getPaymentsByBooking, getInvoice, getBookingReceipt,
};
