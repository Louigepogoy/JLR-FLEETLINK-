const { query } = require('../config/db');

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
    const result = await query(
      `SELECT
         COALESCE(SUM(owner_amount), 0) as total_earnings,
         COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN owner_amount ELSE 0 END), 0) as monthly_earnings,
         COALESCE(SUM(CASE WHEN payout_status = 'pending' THEN owner_amount ELSE 0 END), 0) as pending_payout,
         COALESCE(SUM(CASE WHEN payout_status = 'paid' THEN owner_amount ELSE 0 END), 0) as paid_out,
         COUNT(*) as total_transactions
       FROM transactions
       WHERE user_id = $1 AND type = 'payment' AND status IN ('partially_paid', 'fully_paid')`,
      [req.user.id]
    );

    const monthly = await query(
      `SELECT DATE_TRUNC('month', created_at) as month,
              SUM(owner_amount) as earnings,
              COUNT(*) as count
       FROM transactions
       WHERE user_id = $1 AND type = 'payment'
       GROUP BY DATE_TRUNC('month', created_at)
       ORDER BY month DESC LIMIT 12`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: { summary: result.rows[0], monthlyBreakdown: monthly.rows },
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

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * Aggregates unpaid owner earnings per owner. PayMongo's own disbursement/Platforms API needs a
 * separate approved business account we don't have, so this only tracks what's owed and to
 * where — the admin still sends the money manually (GCash/bank) before marking it paid below.
 */
const getPendingPayouts = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT
         u.id as owner_id, u.full_name as owner_name, u.email as owner_email,
         opa.payout_method, opa.account_name, opa.account_number, opa.status as account_status,
         COALESCE(SUM(t.owner_amount), 0) as pending_amount,
         COUNT(t.id) as pending_transactions
       FROM transactions t
       JOIN users u ON t.user_id = u.id
       LEFT JOIN owner_payout_accounts opa ON opa.owner_id = u.id
       WHERE t.type = 'payment' AND t.payout_status = 'pending'
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
    const result = await query(
      `UPDATE transactions SET payout_status = 'paid', paid_out_at = NOW()
       WHERE user_id = $1 AND type = 'payment' AND payout_status = 'pending'
       RETURNING id, owner_amount`,
      [ownerId]
    );

    const totalPaid = result.rows.reduce((sum, row) => sum + parseFloat(row.owner_amount), 0);
    res.json({ success: true, data: { transactionsMarked: result.rows.length, totalPaid } });
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
        FROM transactions WHERE type = 'payment'`),
      query(`SELECT role, COUNT(*) as count FROM users GROUP BY role`),
      query(`SELECT status, COUNT(*) as count FROM bookings GROUP BY status`),
      query(`SELECT status, COUNT(*) as count FROM vehicles GROUP BY status`),
    ]);

    const monthlyRevenue = await query(
      `SELECT DATE_TRUNC('month', created_at) as month,
              SUM(platform_amount) as revenue
       FROM transactions WHERE type = 'payment'
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
  getMyPayoutAccount, savePayoutAccount, getPendingPayouts, markOwnerPayoutPaid,
};
