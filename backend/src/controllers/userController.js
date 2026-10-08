const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { createNotification } = require('../utils/notifications');
const { passwordProblem } = require('../utils/passwordPolicy');

const getAllUsers = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, email, full_name, phone, role, is_active, approval_status,
              license_number, created_at, approved_at
       FROM users ORDER BY created_at DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

const getPendingRegistrations = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.id, u.email, u.full_name, u.phone, u.role, u.license_number,
              u.license_image_url, u.selfie_image_url, u.approval_status, u.created_at,
              u.account_type, u.business_name, u.business_proof_url, u.business_proof_type,
              u.owner_or_url, u.owner_cr_url,
              (SELECT row_to_json(r) FROM (
                 SELECT risk_score, verdict, reasons, summary, model, created_at
                 FROM ai_verification_results
                 WHERE subject_type = 'license' AND subject_id = u.id
                 ORDER BY created_at DESC LIMIT 1
               ) r) AS ai_result
       FROM users u
       WHERE u.approval_status = 'pending'
       ORDER BY u.created_at ASC`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

const recordVerificationAction = (subjectId, adminId, action, notes) =>
  query(
    `INSERT INTO verification_actions (subject_type, subject_id, admin_id, action, notes)
     VALUES ('license', $1, $2, $3, $4)`,
    [subjectId, adminId, action, notes || null]
  );

const approveRegistration = async (req, res, next) => {
  try {
    const { id } = req.params;

    const userResult = await query(
      'SELECT * FROM users WHERE id = $1 AND approval_status = $2',
      [id, 'pending']
    );

    if (!userResult.rows[0]) {
      return res.status(404).json({ success: false, message: 'Pending registration not found' });
    }

    const user = userResult.rows[0];

    const result = await query(
      `UPDATE users SET
         approval_status = 'approved',
         is_active = true,
         approved_by = $1,
         approved_at = NOW(),
         rejection_reason = NULL,
         updated_at = NOW()
       WHERE id = $2
       RETURNING id, email, full_name, role, approval_status`,
      [req.user.id, id]
    );

    await recordVerificationAction(id, req.user.id, 'approved', null);

    await createNotification(
      user.id,
      'Account Approved',
      'Welcome to JLR Fleetlink! Your account has been verified and approved.',
      'system',
      '/dashboard'
    );

    res.json({
      success: true,
      message: `${user.full_name}'s account has been approved`,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

const rejectRegistration = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason?.trim()) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    }

    const userResult = await query(
      'SELECT * FROM users WHERE id = $1 AND approval_status = $2',
      [id, 'pending']
    );

    if (!userResult.rows[0]) {
      return res.status(404).json({ success: false, message: 'Pending registration not found' });
    }

    const user = userResult.rows[0];

    const result = await query(
      `UPDATE users SET
         approval_status = 'rejected',
         is_active = false,
         rejection_reason = $1,
         approved_by = $2,
         approved_at = NOW(),
         updated_at = NOW()
       WHERE id = $3
       RETURNING id, email, full_name, approval_status, rejection_reason`,
      [reason.trim(), req.user.id, id]
    );

    await recordVerificationAction(id, req.user.id, 'rejected', reason.trim());

    await createNotification(
      user.id,
      'Registration Rejected',
      `Your registration was not approved. Reason: ${reason.trim()}`,
      'alert'
    );

    res.json({
      success: true,
      message: 'Registration rejected',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

const requestMoreInfo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    if (!notes?.trim()) {
      return res.status(400).json({ success: false, message: 'Please describe what additional info is needed' });
    }

    const userResult = await query(
      'SELECT * FROM users WHERE id = $1 AND approval_status = $2',
      [id, 'pending']
    );

    if (!userResult.rows[0]) {
      return res.status(404).json({ success: false, message: 'Pending registration not found' });
    }

    const user = userResult.rows[0];

    const result = await query(
      `UPDATE users SET
         approval_status = 'unverified',
         rejection_reason = $1,
         updated_at = NOW()
       WHERE id = $2
       RETURNING id, email, full_name, approval_status, rejection_reason`,
      [notes.trim(), id]
    );

    await recordVerificationAction(id, req.user.id, 'needs_more_info', notes.trim());

    await createNotification(
      user.id,
      'Additional Verification Needed',
      `We need more information to verify your account: ${notes.trim()}`,
      'alert',
      '/verify-identity'
    );

    res.json({
      success: true,
      message: 'Requested additional information from the applicant',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const avatarFile = req.files?.avatar?.[0];
    const avatarUrl = avatarFile
      ? `${req.protocol}://${req.get('host')}/uploads/${avatarFile.filename}`
      : req.body.avatarUrl;
    const { fullName, phone } = req.body;
    const result = await query(
      `UPDATE users SET
         full_name = COALESCE($1, full_name),
         phone = COALESCE($2, phone),
         avatar_url = COALESCE($3, avatar_url),
         updated_at = NOW()
       WHERE id = $4
       RETURNING id, email, full_name, phone, role, avatar_url, approval_status`,
      [fullName, phone, avatarUrl, req.user.id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current password and a new password are required' });
    }
    const problem = passwordProblem(newPassword);
    if (problem) return res.status(400).json({ success: false, message: problem });

    const userResult = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const valid = await bcrypt.compare(currentPassword, userResult.rows[0]?.password_hash || '');

    if (!valid) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [passwordHash, req.user.id]);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

const toggleUserStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const result = await query(
      'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, is_active',
      [isActive, req.params.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    const result = await query(
      'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, role',
      [role, req.params.id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Public profile anyone can view: only non-sensitive fields (no email, license or selfie), plus activity
// stats and the user's active vehicle listings. The contact number is included only for signed-in viewers
// (req.user set by optionalAuthenticate) so guests and scrapers can't harvest everyone's number.
const getPublicProfile = async (req, res, next) => {
  try {
    if (!UUID_PATTERN.test(req.params.id)) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const userResult = await query(
      `SELECT u.id, u.full_name, u.avatar_url, u.role, u.created_at, u.phone,
              (u.approval_status = 'approved') AS is_verified,
              (SELECT COUNT(*)::int FROM vehicles v WHERE v.owner_id = u.id AND v.status <> 'inactive') AS vehicles_listed,
              (SELECT COUNT(*)::int FROM bookings b JOIN vehicles v ON v.id = b.vehicle_id
                WHERE v.owner_id = u.id AND b.status = 'completed') AS rentals_hosted,
              (SELECT COUNT(*)::int FROM bookings b
                WHERE b.customer_id = u.id AND b.status = 'completed') AS trips_completed,
              (SELECT ROUND(AVG(r.user_rating)::numeric, 1) FROM booking_reviews r WHERE r.reviewee_id = u.id) AS avg_rating,
              (SELECT COUNT(*)::int FROM booking_reviews r WHERE r.reviewee_id = u.id) AS rating_count
       FROM users u
       WHERE u.id = $1 AND u.is_active = true`,
      [req.params.id]
    );
    if (!userResult.rows[0]) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const vehicles = await query(
      `SELECT v.id, v.title, v.brand, v.model, v.year, v.vehicle_type, v.price_per_day, v.location, v.city,
              v.barangay, v.seats, v.fuel_type, v.transmission, v.images, v.status,
              EXISTS (
                SELECT 1 FROM vehicle_maintenance_dates vmd
                WHERE vmd.vehicle_id = v.id AND CURRENT_DATE BETWEEN vmd.start_date AND vmd.end_date
              ) AS on_maintenance,
              (SELECT ROUND(AVG(r.vehicle_rating)::numeric, 1) FROM booking_reviews r WHERE r.vehicle_id = v.id) AS avg_rating,
              (SELECT COUNT(*)::int FROM booking_reviews r WHERE r.vehicle_id = v.id) AS rating_count
       FROM vehicles v
       WHERE v.owner_id = $1 AND v.status <> 'inactive'
       ORDER BY v.created_at DESC`,
      [req.params.id]
    );

    const { phone, ...profile } = userResult.rows[0];
    const contact = req.user ? { phone: phone || null } : { phone_hidden: true };
    res.json({ success: true, data: { ...profile, ...contact, vehicles: vehicles.rows } });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  getPendingRegistrations,
  approveRegistration,
  rejectRegistration,
  requestMoreInfo,
  updateProfile,
  changePassword,
  toggleUserStatus,
  updateUserRole,
  getPublicProfile,
};
