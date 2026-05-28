const { body, validationResult } = require('express-validator');
const { query } = require('../config/db');

const getCommission = async (req, res, next) => {
  try {
    const result = await query(
      'SELECT commission_percentage, updated_at FROM platform_settings ORDER BY id DESC LIMIT 1'
    );
    res.json({ success: true, data: result.rows[0] || { commission_percentage: 10 } });
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
      'SELECT commission_percentage, updated_at FROM platform_settings ORDER BY id DESC LIMIT 1'
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

const commissionValidation = [
  body('percentage').isFloat({ min: 0, max: 100 }),
];

module.exports = { getCommission, updateCommission, getCommissionHistory, commissionValidation };
