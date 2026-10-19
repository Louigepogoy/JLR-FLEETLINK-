const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { query } = require('../config/db');

router.get('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, admin_id, admin_name, action, target_type, target_id, target_label, details, ip_address, created_at
       FROM audit_logs ORDER BY created_at DESC LIMIT 1000`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
