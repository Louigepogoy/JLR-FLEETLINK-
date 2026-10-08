const { query } = require('../config/db');
const { PAYOUT_ELIGIBLE_SQL, sweepQuietly } = require('../services/inspectionService');
const { autoPayoutOwner, recordPayout } = require('../services/payoutService');

// Rows that count toward an owner's earnings: successful payments, plus refund rows (their negative
// owner_amount takes a partial refund back out). Fully refunded payments are marked 'refunded'.
const COUNTED_EARNINGS_SQL = `((t.type = 'payment' AND t.status IN ('partially_paid', 'fully_paid')) OR t.type = 'refund')`;

// Platform revenue: commission from payments that weren't fully refunded, minus partial refunds.
const COUNTED_REVENUE_SQL = `((type = 'payment' AND status <> 'refunded') OR type = 'refund')`;

// Transactions an admin may pay out now: unpaid, and the booking passed pickup inspection.
const PAYABLE_SQL = `t.payout_status = 'pending' AND ${COUNTED_EARNINGS_SQL}
  AND EXISTS (
    SELECT 1 FROM bookings b LEFT JOIN booking_disputes d ON d.booking_id = b.id
    WHERE b.id = t.booking_id AND ${PAYOUT_ELIGIBLE_SQL}
  )`;

const getMyTransactions = async (req, res, next) => {
  try {
    let sql;
    let params;

    if (req.user.role !== 'admin') {
      sql = `
        SELECT t.*, v.title as vehicle_title, b.start_date, b.end_date,
               c.full_name as customer_name, o.full_name as owner_name,
               CASE WHEN b.customer_id = $1 THEN 'renter' ELSE 'provider' END as perspective
        FROM transactions t
        JOIN bookings b ON t.booking_id = b.id
        JOIN vehicles v ON b.vehicle_id = v.id
        JOIN users c ON b.customer_id = c.id
        LEFT JOIN users o ON t.user_id = o.id
        WHERE b.customer_id = $1 OR t.user_id = $1
        ORDER BY t.created_at DESC`;
      params = [req.user.id];
    } else {
      sql = `
        SELECT t.*, v.title as vehicle_title, b.start_date, b.end_date,
               c.full_name as customer_name, o.full_name as owner_name
        FROM transactions t
        JOIN bookings b ON t.booking_id = b.id
        JOIN vehicles v ON b.vehicle_id = v.id
        JOIN users c ON b.customer_id = c.id
        JOIN users o ON t.user_id = o.id
        ORDER BY t.created_at DESC`;
      params = [];
    }

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

const getOwnerEarnings = async (req, res, next) => {
  try {
    await sweepQuietly();
    // pending_payout = eligible and waiting for the admin to send it; on_hold = still held by the
    // platform until the renter accepts the vehicle at pickup (or while a dispute is open).
    const result = await query(
      `SELECT
         COALESCE(SUM(t.owner_amount), 0) as total_earnings,
         COALESCE(SUM(CASE WHEN t.created_at >= NOW() - INTERVAL '30 days' THEN t.owner_amount ELSE 0 END), 0) as monthly_earnings,
         COALESCE(SUM(CASE WHEN t.payout_status = 'pending' AND ${PAYOUT_ELIGIBLE_SQL} THEN t.owner_amount ELSE 0 END), 0) as pending_payout,
         COALESCE(SUM(CASE WHEN t.payout_status = 'pending' AND NOT ${PAYOUT_ELIGIBLE_SQL} THEN t.owner_amount ELSE 0 END), 0) as on_hold,
         COALESCE(SUM(CASE WHEN t.payout_status = 'paid' THEN t.owner_amount ELSE 0 END), 0) as paid_out,
         COUNT(*) FILTER (WHERE t.type = 'payment') as total_transactions
       FROM transactions t
       LEFT JOIN bookings b ON t.booking_id = b.id
       LEFT JOIN booking_disputes d ON d.booking_id = b.id
       WHERE t.user_id = $1 AND ${COUNTED_EARNINGS_SQL}`,
      [req.user.id]
    );

    const monthly = await query(
      `SELECT DATE_TRUNC('month', t.created_at) as month,
              SUM(t.owner_amount) as earnings,
              COUNT(*) as count
       FROM transactions t
       WHERE t.user_id = $1 AND ${COUNTED_EARNINGS_SQL}
       GROUP BY DATE_TRUNC('month', t.created_at)
       ORDER BY month DESC LIMIT 12`,
      [req.user.id]
    );

    // Cash bookings: cash the owner received at pickup (or for late fees) never goes through payouts,
    // so it's reported separately, plus cash still to collect on confirmed bookings.
    const cash = await query(
      `SELECT
         COALESCE(SUM(b.cash_collected), 0) AS cash_collected,
         COALESCE(SUM(b.cash_collected) FILTER (WHERE b.cash_collected_at >= NOW() - INTERVAL '30 days'), 0) AS cash_collected_month,
         COALESCE(SUM(b.cash_due) FILTER (WHERE b.status IN ('approved', 'active') AND b.payment_status <> 'pending'), 0) AS cash_to_collect
       FROM bookings b JOIN vehicles v ON v.id = b.vehicle_id
       WHERE v.owner_id = $1`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: { summary: { ...result.rows[0], ...cash.rows[0] }, monthlyBreakdown: monthly.rows },
    });
  } catch (error) {
    next(error);
  }
};

const getMyPayoutAccount = async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM owner_payout_accounts WHERE owner_id = $1', [req.user.id]);
    res.json({ success: true, data: result.rows[0] || null });
  } catch (error) {
    next(error);
  }
};

const savePayoutAccount = async (req, res, next) => {
  try {
    const { payoutMethod, accountName, accountNumber } = req.body;
    if (!['gcash', 'bank'].includes(payoutMethod) || !accountName || !accountNumber) {
      return res.status(400).json({ success: false, message: 'payoutMethod, accountName, and accountNumber are required' });
    }

    const result = await query(
      `INSERT INTO owner_payout_accounts (owner_id, payout_method, account_name, account_number, status)
       VALUES ($1, $2, $3, $4, 'unverified')
       ON CONFLICT (owner_id) DO UPDATE SET
         payout_method = EXCLUDED.payout_method,
         account_name = EXCLUDED.account_name,
         account_number = EXCLUDED.account_number,
         status = 'unverified',
         updated_at = NOW()
       RETURNING *`,
      [req.user.id, payoutMethod, accountName, accountNumber]
    );
    // Earnings that were waiting for an account are sent now.
    const payout = await autoPayoutOwner(req.user.id, 'account_added');

    res.json({ success: true, data: result.rows[0], paidOut: payout.paid });
  } catch (error) {
    next(error);
  }
};

/**
 * Aggregates unpaid owner earnings per owner. PayMongo's own disbursement/Platforms API needs a
 * separate approved business account we don't have, so this only tracks what's owed and to
 * where — the admin still sends the money manually (GCash/bank) before marking it paid below.
 */
/** Every owner payout (automatic and manual), newest first, with the bookings each one covered. */
const getPayoutHistory = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT p.*, u.full_name AS owner_name, u.email AS owner_email, a.full_name AS paid_by_name,
              COALESCE(ARRAY_AGG(DISTINCT t.booking_id) FILTER (WHERE t.booking_id IS NOT NULL), '{}') AS booking_ids
       FROM owner_payouts p
       LEFT JOIN users u ON u.id = p.owner_id
       LEFT JOIN users a ON a.id = p.paid_by
       LEFT JOIN transactions t ON t.payout_id = p.id
       GROUP BY p.id, u.full_name, u.email, a.full_name
       ORDER BY p.created_at DESC
       LIMIT 300`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

const getPendingPayouts = async (req, res, next) => {
  try {
    await sweepQuietly();
    const result = await query(
      `SELECT
         u.id as owner_id, u.full_name as owner_name, u.email as owner_email,
         opa.payout_method, opa.account_name, opa.account_number, opa.status as account_status,
         COALESCE(SUM(t.owner_amount), 0) as pending_amount,
         COUNT(t.id) FILTER (WHERE t.type = 'payment') as pending_transactions
       FROM transactions t
       JOIN users u ON t.user_id = u.id
       LEFT JOIN owner_payout_accounts opa ON opa.owner_id = u.id
       WHERE ${PAYABLE_SQL}
       GROUP BY u.id, u.full_name, u.email, opa.payout_method, opa.account_name, opa.account_number, opa.status
       HAVING COALESCE(SUM(t.owner_amount), 0) > 0
       ORDER BY pending_amount DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

const markOwnerPayoutPaid = async (req, res, next) => {
  try {
    const { ownerId } = req.params;
    // Only what passed pickup inspection — payments still held or under dispute stay pending. Recorded
    // in the payout history like the automatic payouts.
    const { paid, payout } = await recordPayout({ ownerId, source: 'manual', paidBy: req.user.id });
    res.json({ success: true, data: { totalPaid: paid, reference: payout?.reference || null } });
  } catch (error) {
    next(error);
  }
};

const getAdminAnalytics = async (req, res, next) => {
  try {
    const [revenue, users, bookings, vehicles] = await Promise.all([
      query(`
        SELECT
          COALESCE(SUM(platform_amount), 0) as total_revenue,
          COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN platform_amount ELSE 0 END), 0) as monthly_revenue,
          COUNT(*) as total_transactions
        FROM transactions WHERE ${COUNTED_REVENUE_SQL}`),
      query(`SELECT role, COUNT(*) as count FROM users GROUP BY role`),
      query(`SELECT status, COUNT(*) as count FROM bookings GROUP BY status`),
      query(`SELECT status, COUNT(*) as count FROM vehicles GROUP BY status`),
    ]);

    const monthlyRevenue = await query(
      `SELECT DATE_TRUNC('month', created_at) as month,
              SUM(platform_amount) as revenue
       FROM transactions WHERE ${COUNTED_REVENUE_SQL}
       GROUP BY DATE_TRUNC('month', created_at)
       ORDER BY month DESC LIMIT 12`
    );

    res.json({
      success: true,
      data: {
        revenue: revenue.rows[0],
        usersByRole: users.rows,
        bookingsByStatus: bookings.rows,
        vehiclesByStatus: vehicles.rows,
        monthlyRevenue: monthlyRevenue.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyTransactions, getOwnerEarnings, getAdminAnalytics,
  getMyPayoutAccount, savePayoutAccount, getPendingPayouts, getPayoutHistory, markOwnerPayoutPaid,
  PAYABLE_SQL,
};
