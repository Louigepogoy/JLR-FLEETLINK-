const { query } = require('../config/db');

/**
 * Records an admin action in the audit trail. Never throws: a failed audit write must not undo or block the
 * action itself. `admin` is req.user; `target` is { type, id, label }; `details` holds before/after values.
 */
const recordAudit = async (req, action, { target = {}, details = null } = {}) => {
  try {
    await query(
      `INSERT INTO audit_logs (admin_id, admin_name, action, target_type, target_id, target_label, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        req.user?.id || null, req.user?.full_name || null, action,
        target.type || null, target.id || null, target.label || null,
        details ? JSON.stringify(details) : null, req.ip || null,
      ]
    );
  } catch (error) {
    console.error('Failed to record audit log:', error.message);
  }
};

module.exports = { recordAudit };
