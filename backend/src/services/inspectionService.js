const { query } = require('../config/db');
const { createNotification } = require('../utils/notifications');
const { cancelUnpaidBookings } = require('./bookingExpiryService');
const { autoPayoutOwner } = require('./payoutService');

const SWEEP_INTERVAL_MS = 60 * 1000;
const REMINDER_MINUTES_LEFT = 10;
const DEFAULT_WINDOW_MINUTES = 60;

/**
 * SQL condition (expects `b` = bookings, `d` = LEFT JOINed booking_disputes) for when an owner's share
 * of a booking payment may be paid out: the customer accepted the vehicle at pickup (or it was
 * auto-accepted), or an admin closed the dispute without a full refund. Bookings paid before the
 * inspection feature were backfilled as accepted by migration 023.
 */
const PAYOUT_ELIGIBLE_SQL = `(COALESCE(b.inspection_result IN ('accepted', 'auto_accepted'), false)
  OR COALESCE(d.status IN ('dismissed', 'partially_refunded'), false))`;

const getInspectionWindowMinutes = async () => {
  const result = await query('SELECT inspection_window_minutes FROM platform_settings ORDER BY id DESC LIMIT 1');
  return result.rows[0]?.inspection_window_minutes || DEFAULT_WINDOW_MINUTES;
};

/**
 * Auto-accepts every handed-over booking whose inspection window has run out, and sends the
 * "10 minutes left" reminder. Each UPDATE claims its rows atomically, so running this from the
 * interval and lazily from request handlers at the same time never notifies anyone twice.
 */
const runInspectionSweep = async () => {
  const accepted = await query(
    `UPDATE bookings b
     SET status = 'active', inspection_result = 'auto_accepted', inspected_at = NOW(), updated_at = NOW()
     FROM vehicles v
     WHERE b.vehicle_id = v.id
       AND b.status = 'approved' AND b.handed_over_at IS NOT NULL
       AND b.inspection_result IS NULL AND b.inspection_deadline <= NOW()
     RETURNING b.id, b.customer_id, v.owner_id, v.title`
  );
  for (const b of accepted.rows) {
    await createNotification(
      b.customer_id,
      'Vehicle automatically accepted',
      `The inspection time for ${b.title} ended with no issue reported, so the vehicle was accepted. Enjoy your trip!`,
      'booking',
      '/dashboard/bookings'
    ).catch(() => {});
    await createNotification(
      b.owner_id,
      'Vehicle accepted',
      `The renter's inspection time for ${b.title} ended with no issue reported. Your earnings are being sent to your payout account.`,
      'payment',
      '/dashboard/earnings'
    ).catch(() => {});
    await autoPayoutOwner(b.owner_id, 'auto_accepted');
  }

  const reminders = await query(
    `UPDATE bookings b
     SET inspection_reminder_sent = true
     FROM vehicles v
     WHERE b.vehicle_id = v.id
       AND b.status = 'approved' AND b.handed_over_at IS NOT NULL
       AND b.inspection_result IS NULL AND NOT b.inspection_reminder_sent
       AND b.inspection_deadline <= NOW() + $1::int * INTERVAL '1 minute'
     RETURNING b.customer_id, v.title`,
    [REMINDER_MINUTES_LEFT]
  );
  for (const b of reminders.rows) {
    await createNotification(
      b.customer_id,
      `${REMINDER_MINUTES_LEFT} minutes left to inspect your vehicle`,
      `Please accept ${b.title} or report a problem. If you don't respond, it will be accepted automatically.`,
      'alert',
      '/dashboard/bookings'
    ).catch(() => {});
  }
};

// Request handlers call this before reading bookings/payouts so results stay correct even if the
// interval didn't run on time (e.g. the server was asleep). Failures must never break the request.
const sweepQuietly = () => Promise.all([
  runInspectionSweep().catch((err) => console.error('Inspection sweep failed:', err.message)),
  cancelUnpaidBookings().catch((err) => console.error('Unpaid booking sweep failed:', err.message)),
]);

const startInspectionScheduler = () => {
  const timer = setInterval(sweepQuietly, SWEEP_INTERVAL_MS);
  timer.unref();
  sweepQuietly();
};

module.exports = {
  PAYOUT_ELIGIBLE_SQL, getInspectionWindowMinutes, runInspectionSweep, sweepQuietly, startInspectionScheduler,
};
