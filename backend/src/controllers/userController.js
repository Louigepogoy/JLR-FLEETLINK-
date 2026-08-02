const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { createNotification } = require('../utils/notifications');

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
      `SELECT id, email, full_name, phone, role, license_number,
              license_image_url, selfie_image_url, approval_status, created_at
       FROM users
       WHERE approval_status = 'pending'
       ORDER BY created_at ASC`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

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

    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Current password and a new password with at least 8 characters are required',
      });
    }

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

module.exports = {
  getAllUsers,
  getPendingRegistrations,
  approveRegistration,
  rejectRegistration,
  updateProfile,
  changePassword,
  toggleUserStatus,
  updateUserRole,
};
