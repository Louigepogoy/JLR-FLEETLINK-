const { body, validationResult } = require('express-validator');
const { query } = require('../config/db');

const getCommission = async (req, res, next) => {
  try {
    const result = await query(
      'SELECT commission_percentage, inspection_window_minutes, updated_at FROM platform_settings ORDER BY id DESC LIMIT 1'
    );
    res.json({ success: true, data: result.rows[0] || { commission_percentage: 10, inspection_window_minutes: 60 } });
  } catch (error) {
    next(error);
  }
};

const updateCommission = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { percentage, notes } = req.body;

    await query(
      `UPDATE platform_settings SET commission_percentage = $1, updated_by = $2, updated_at = NOW()`,
      [percentage, req.user.id]
    );

    await query(
      `INSERT INTO commissions (percentage, set_by, notes) VALUES ($1, $2, $3)`,
      [percentage, req.user.id, notes || null]
    );

    const result = await query(
      'SELECT commission_percentage, inspection_window_minutes, updated_at FROM platform_settings ORDER BY id DESC LIMIT 1'
    );

    res.json({
      success: true,
      message: `Commission updated to ${percentage}%`,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

const getCommissionHistory = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT c.*, u.full_name as set_by_name
       FROM commissions c LEFT JOIN users u ON c.set_by = u.id
       ORDER BY c.created_at DESC LIMIT 50`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

// Commission the platform actually earned: one row per booking payment (stored on `transactions` when
// the payment is finalized), plus partial refunds, which take part of it back. Fully refunded payments
// are listed but don't count toward the totals.
const getCommissionEarnings = async (req, res, next) => {
  try {
    const counted = `((t.type = 'payment' AND t.status <> 'refunded') OR t.type = 'refund')`;
    const [rows, summary] = await Promise.all([
      query(
        `SELECT t.id, t.created_at, t.invoice_number, t.type, t.status, t.total_amount,
                t.commission_amount, t.commission_percentage,
                v.title AS vehicle_title, c.full_name AS customer_name, o.full_name AS owner_name
         FROM transactions t
         LEFT JOIN bookings b ON t.booking_id = b.id
         LEFT JOIN vehicles v ON b.vehicle_id = v.id
         LEFT JOIN users c ON b.customer_id = c.id
         LEFT JOIN users o ON t.user_id = o.id
         WHERE t.type = 'payment' OR (t.type = 'refund' AND t.commission_amount <> 0)
         ORDER BY t.created_at DESC
         LIMIT 200`
      ),
      query(
        `SELECT
           COALESCE(SUM(t.commission_amount) FILTER (WHERE ${counted}), 0) AS total_earned,
           COALESCE(SUM(t.commission_amount) FILTER (
             WHERE ${counted} AND t.created_at >= DATE_TRUNC('month', NOW())), 0) AS this_month,
           COUNT(*) FILTER (WHERE t.type = 'payment' AND t.status <> 'refunded') AS payments_count
         FROM transactions t`
      ),
    ]);
    res.json({ success: true, data: { summary: summary.rows[0], records: rows.rows } });
  } catch (error) {
    next(error);
  }
};

// How long a customer has to accept or reject a vehicle after the owner hands it over.
const updateInspectionWindow = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
    }

    const result = await query(
      `UPDATE platform_settings SET inspection_window_minutes = $1, updated_by = $2, updated_at = NOW()
       RETURNING commission_percentage, inspection_window_minutes, updated_at`,
      [req.body.minutes, req.user.id]
    );

    res.json({
      success: true,
      message: `Inspection time updated to ${req.body.minutes} minutes`,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

const commissionValidation = [
  body('percentage').isFloat({ min: 0, max: 100 }),
];

const inspectionWindowValidation = [
  body('minutes').isInt({ min: 5, max: 1440 }).withMessage('Inspection time must be 5 to 1440 minutes').toInt(),
];

module.exports = {
  getCommission, updateCommission, getCommissionHistory, commissionValidation,
  updateInspectionWindow, inspectionWindowValidation, getCommissionEarnings,
};
