const { body, validationResult } = require('express-validator');
const { query } = require('../config/db');
const { createNotification } = require('../utils/notifications');

const getReportContext = async (bookingId) => {
  const result = await query(
    `SELECT b.id, b.customer_id, v.owner_id, v.title
     FROM bookings b
     JOIN vehicles v ON b.vehicle_id = v.id
     WHERE b.id = $1`,
    [bookingId]
  );
  return result.rows[0];
};

const createReport = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { bookingId, reportedUserId, reason, description } = req.body;
    const booking = await getReportContext(bookingId);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const reporterId = req.user.id;
    const isCustomerReportingOwner =
      reporterId === booking.customer_id && reportedUserId === booking.owner_id;
    const isOwnerReportingCustomer =
      reporterId === booking.owner_id && reportedUserId === booking.customer_id;

    if (!isCustomerReportingOwner && !isOwnerReportingCustomer) {
      return res.status(403).json({
        success: false,
        message: 'You can only report the customer or owner connected to this booking',
      });
    }

    const result = await query(
      `INSERT INTO reports (booking_id, reporter_id, reported_user_id, reason, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [bookingId, reporterId, reportedUserId, reason.trim(), description.trim()]
    );

    const admins = await query("SELECT id FROM users WHERE role = 'admin' AND is_active = true");
    await Promise.all(admins.rows.map((admin) =>
      createNotification(
        admin.id,
        'New User Report',
        `A new report was submitted for booking ${booking.title}.`,
        'alert',
        '/dashboard/admin/reports'
      )
    ));

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

const getAllReports = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT r.*,
              reporter.full_name AS reporter_name,
              reporter.email AS reporter_email,
              reporter.role AS reporter_role,
              reported.full_name AS reported_name,
              reported.email AS reported_email,
              reported.role AS reported_role,
              b.start_date,
              b.end_date,
              v.title AS vehicle_title
       FROM reports r
       JOIN users reporter ON r.reporter_id = reporter.id
       JOIN users reported ON r.reported_user_id = reported.id
       LEFT JOIN bookings b ON r.booking_id = b.id
       LEFT JOIN vehicles v ON b.vehicle_id = v.id
       ORDER BY r.created_at DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

const updateReportStatus = async (req, res, next) => {
  try {
    const { status, adminNotes } = req.body;
    const validStatuses = ['pending', 'reviewed', 'resolved', 'dismissed'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid report status' });
    }

    const result = await query(
      `UPDATE reports
       SET status = $1,
           admin_notes = COALESCE($2, admin_notes),
           reviewed_by = $3,
           reviewed_at = NOW(),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [status, adminNotes?.trim() || null, req.user.id, req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

const reportValidation = [
  body('bookingId').isUUID(),
  body('reportedUserId').isUUID(),
  body('reason').trim().isLength({ min: 3, max: 100 }),
  body('description').trim().isLength({ min: 10, max: 2000 }),
];

module.exports = {
  createReport,
  getAllReports,
  updateReportStatus,
  reportValidation,
};
