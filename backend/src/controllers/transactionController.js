const { query } = require('../config/db');

const getMyTransactions = async (req, res, next) => {
  try {
    let sql;
    let params;

    if (req.user.role === 'customer') {
      sql = `
        SELECT t.*, v.title as vehicle_title, b.start_date, b.end_date
        FROM transactions t
        JOIN bookings b ON t.booking_id = b.id
        JOIN vehicles v ON b.vehicle_id = v.id
        WHERE b.customer_id = $1
        ORDER BY t.created_at DESC`;
      params = [req.user.id];
    } else if (req.user.role === 'owner') {
      sql = `
        SELECT t.*, v.title as vehicle_title, b.start_date, b.end_date,
               c.full_name as customer_name
        FROM transactions t
        JOIN bookings b ON t.booking_id = b.id
        JOIN vehicles v ON b.vehicle_id = v.id
        JOIN users c ON b.customer_id = c.id
        WHERE t.user_id = $1
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

module.exports = { getMyTransactions, getOwnerEarnings, getAdminAnalytics };
