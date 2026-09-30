const { query } = require('../config/db');
const { createNotification } = require('../utils/notifications');
const { getCheckoutSession, expireCheckoutSession } = require('./paymongoService');

// Owners don't approve bookings — paying confirms them — so an unpaid booking would otherwise hold
// the vehicle's dates forever. It is cancelled if the renter hasn't paid within this many minutes.
const PAYMENT_WINDOW_MINUTES = 30;

// SQL (expects `b` = bookings) for the seconds an unpaid booking has left before it is cancelled.
const PAYMENT_SECONDS_LEFT_SQL = `CASE WHEN b.status = 'pending' AND b.payment_status = 'pending'
  THEN GREATEST(0, EXTRACT(EPOCH FROM (b.created_at + ${PAYMENT_WINDOW_MINUTES} * INTERVAL '1 minute' - NOW())))::int
  END`;

/**
 * Before cancelling, settles every checkout the renter opened for this booking: a session that was
 * actually paid is credited (which confirms the booking), and unpaid ones are expired at PayMongo so
 * their links can't be paid after the booking is gone. Returns false if PayMongo couldn't be
 * reached, so the booking is left alone and retried on the next sweep.
 */
const settleCheckouts = async (bookingId) => {
  // Required lazily: paymongoController -> paymentController -> ... would otherwise be a load cycle.
  const { finalizeCheckoutSession } = require('../controllers/paymongoController');
  const intents = await query(
    `SELECT id, gateway_session_id FROM payment_intents
     WHERE purpose = 'booking_payment' AND status = 'pending' AND payload->>'bookingId' = $1`,
    [bookingId]
  );
  if (!intents.rows.length) return true;
  if (!process.env.PAYMONGO_SECRET_KEY) return true; // No gateway configured, so nothing can be paid.

  try {
    for (const intent of intents.rows) {
      if (!intent.gateway_session_id) continue;
      const session = await getCheckoutSession(intent.gateway_session_id);
      const result = await finalizeCheckoutSession(session);
      if (result.handled) continue;
      if (session.attributes?.status === 'active') await expireCheckoutSession(intent.gateway_session_id);
      await query(
        `UPDATE payment_intents SET status = 'expired', updated_at = NOW() WHERE id = $1 AND status = 'pending'`,
        [intent.id]
      );
    }
    return true;
  } catch (err) {
    console.error(`Could not settle checkouts for booking ${bookingId}:`, err.message);
    return false;
  }
};

const cancelUnpaidBookings = async () => {
  const expired = await query(
    `SELECT b.id FROM bookings b
     WHERE b.status = 'pending' AND b.payment_status = 'pending'
       AND b.created_at <= NOW() - ${PAYMENT_WINDOW_MINUTES} * INTERVAL '1 minute'`
  );

  for (const { id } of expired.rows) {
    if (!(await settleCheckouts(id))) continue;

    // Re-checks it is still unpaid: settling may have just credited a payment.
    const cancelled = await query(
      `UPDATE bookings b SET status = 'cancelled', updated_at = NOW()
       FROM vehicles v
       WHERE b.vehicle_id = v.id AND b.id = $1 AND b.status = 'pending' AND b.payment_status = 'pending'
       RETURNING b.customer_id, v.owner_id, v.title`,
      [id]
    );
    const b = cancelled.rows[0];
    if (!b) continue;

    await createNotification(
      b.customer_id,
      'Booking cancelled — not paid',
      `Your booking for ${b.title} was cancelled because it wasn't paid within ${PAYMENT_WINDOW_MINUTES} minutes. You can book again if it's still available.`,
      'booking',
      '/dashboard/bookings'
    ).catch(() => {});
    await createNotification(
      b.owner_id,
      'Unpaid booking cancelled',
      `A booking for ${b.title} was cancelled because the renter didn't pay. Those dates are open again.`,
      'booking',
      '/dashboard/booking-requests'
    ).catch(() => {});
  }
};

module.exports = { PAYMENT_WINDOW_MINUTES, PAYMENT_SECONDS_LEFT_SQL, cancelUnpaidBookings };
