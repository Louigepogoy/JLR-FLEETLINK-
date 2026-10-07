const { query } = require('../config/db');
const { PAYMENT_WINDOW_MINUTES } = require('../services/bookingExpiryService');
const { PAYABLE_SQL } = require('./transactionController');

// When user $1 last opened `key` (a sidebar path, or 'notifications'); the epoch if never.
const seenSql = (key) =>
  `COALESCE((SELECT seen_at FROM user_seen_markers WHERE user_id = $1 AND marker_key = '${key}'), 'epoch'::timestamptz)`;

// Keys the frontend may mark as seen: the sidebar paths that have badges, plus the notification bell.
const SEEN_KEYS = new Set([
  'notifications',
  '/dashboard/admin/approvals', '/dashboard/admin/bookings', '/dashboard/admin/disputes',
  '/dashboard/admin/reports', '/dashboard/admin/support', '/dashboard/admin/payouts',
  '/dashboard/bookings', '/dashboard/booking-requests', '/dashboard/vehicles',
]);

/**
 * Counts shown as badges next to sidebar items. Each counts only what changed since the user last
 * opened that page (see markSeen), so a badge disappears once it has been seen and comes back only
 * for something new. Keys are the sidebar paths so the frontend can match them directly.
 */
const getSidebarBadges = async (req, res, next) => {
  try {
    if (req.user.role === 'admin') {
      const result = await query(
        `SELECT
           (SELECT COUNT(*) FROM users WHERE approval_status = 'pending' AND role <> 'admin'
              AND COALESCE(updated_at, created_at) > ${seenSql('/dashboard/admin/approvals')})
             + (SELECT COUNT(*) FROM vehicles WHERE verification_status = 'unreviewed'
              AND COALESCE(updated_at, created_at) > ${seenSql('/dashboard/admin/approvals')}) AS approvals,
           (SELECT COUNT(*) FROM bookings WHERE created_at > ${seenSql('/dashboard/admin/bookings')}) AS bookings,
           (SELECT COUNT(*) FROM booking_disputes
            WHERE status = 'open' AND created_at > ${seenSql('/dashboard/admin/disputes')}) AS disputes,
           (SELECT COUNT(*) FROM support_tickets
            WHERE status = 'open' AND created_at > ${seenSql('/dashboard/admin/support')}) AS support,
           (SELECT COUNT(DISTINCT t.user_id) FROM transactions t
            WHERE ${PAYABLE_SQL} AND t.created_at > ${seenSql('/dashboard/admin/payouts')}) AS payouts`,
        [req.user.id]
      );
      const c = result.rows[0];
      // Counted separately: a database set up before the reports feature has no reports table, and
      // that shouldn't hide every other badge.
      const reports = await query(
        `SELECT COUNT(*) AS n FROM reports WHERE status = 'pending' AND created_at > ${seenSql('/dashboard/admin/reports')}`,
        [req.user.id]
      ).then((r) => Number(r.rows[0].n)).catch(() => 0);
      return res.json({
        success: true,
        data: {
          '/dashboard/admin/approvals': Number(c.approvals),
          '/dashboard/admin/bookings': Number(c.bookings),
          '/dashboard/admin/disputes': Number(c.disputes),
          '/dashboard/admin/reports': reports,
          '/dashboard/admin/support': Number(c.support),
          '/dashboard/admin/payouts': Number(c.payouts),
        },
      });
    }

    const result = await query(
      `SELECT
         -- As renter: unpaid bookings still inside the payment window, vehicles to inspect now,
         -- and disputes where the admin asked for evidence — counted when they happened after the
         -- renter last opened My Bookings.
         (SELECT COUNT(*) FROM bookings b LEFT JOIN booking_disputes d ON d.booking_id = b.id
          WHERE b.customer_id = $1 AND (
            (b.status = 'pending' AND b.payment_status = 'pending'
              AND b.created_at > NOW() - ${PAYMENT_WINDOW_MINUTES} * INTERVAL '1 minute'
              AND b.created_at > ${seenSql('/dashboard/bookings')})
            OR (b.handed_over_at IS NOT NULL AND b.inspection_result IS NULL AND b.inspection_deadline > NOW()
              AND b.handed_over_at > ${seenSql('/dashboard/bookings')})
            OR (d.status = 'open' AND d.evidence_requested_at > ${seenSql('/dashboard/bookings')})
          )) AS my_bookings,
         -- As owner: paid, confirmed bookings still to hand over, new since Booking Requests was opened.
         (SELECT COUNT(*) FROM bookings b JOIN vehicles v ON b.vehicle_id = v.id
          WHERE v.owner_id = $1 AND b.status = 'approved' AND b.handed_over_at IS NULL
            AND COALESCE(b.updated_at, b.created_at) > ${seenSql('/dashboard/booking-requests')}) AS requests,
         -- Listings the admin sent back for more information.
         (SELECT COUNT(*) FROM vehicles WHERE owner_id = $1 AND verification_status = 'needs_more_info'
            AND COALESCE(updated_at, created_at) > ${seenSql('/dashboard/vehicles')}) AS vehicles`,
      [req.user.id]
    );
    const c = result.rows[0];
    res.json({
      success: true,
      data: {
        '/dashboard/bookings': Number(c.my_bookings),
        '/dashboard/booking-requests': Number(c.requests),
        '/dashboard/vehicles': Number(c.vehicles),
      },
    });
  } catch (error) {
    next(error);
  }
};

/** Records that the user just opened a badge's page (or the notification bell). */
const markSeen = async (req, res, next) => {
  try {
    const key = String(req.body.key || '');
    if (!SEEN_KEYS.has(key)) return res.status(400).json({ success: false, message: 'Unknown badge' });
    await query(
      `INSERT INTO user_seen_markers (user_id, marker_key, seen_at) VALUES ($1, $2, NOW())
       ON CONFLICT (user_id, marker_key) DO UPDATE SET seen_at = NOW()`,
      [req.user.id, key]
    );
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSidebarBadges, markSeen, seenSql };
