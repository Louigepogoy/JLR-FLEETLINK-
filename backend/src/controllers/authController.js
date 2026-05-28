const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/db');
const { sanitizeUser } = require('../utils/helpers');
const { createNotification } = require('../utils/notifications');

const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('fullName').trim().notEmpty(),
  body('phone').trim().notEmpty().matches(/^09\d{9}$/).withMessage('Valid Philippine mobile number required (09XXXXXXXXX)'),
  body('licenseNumber').trim().notEmpty().withMessage('Driver\'s license number is required'),
  body('role').isIn(['customer', 'owner']).withMessage('Invalid account type'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const licenseFile = req.files?.licenseImage?.[0];
    const selfieFile = req.files?.selfieImage?.[0];

    if (!licenseFile || !selfieFile) {
      return res.status(400).json({
        success: false,
        message: 'Valid driver\'s license photo and live selfie are required for verification',
      });
    }

    const { email, password, fullName, phone, role, licenseNumber } = req.body;

    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const licenseImageUrl = `${baseUrl}/uploads/${licenseFile.filename}`;
    const selfieImageUrl = `${baseUrl}/uploads/${selfieFile.filename}`;

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await query(
      `INSERT INTO users (
         email, password_hash, full_name, phone, role,
         license_number, license_image_url, selfie_image_url,
         approval_status, is_active
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', false)
       RETURNING id, email, full_name, phone, role, approval_status, created_at`,
      [email, passwordHash, fullName, phone, role, licenseNumber, licenseImageUrl, selfieImageUrl]
    );

    const user = result.rows[0];

    const admins = await query("SELECT id FROM users WHERE role = 'admin' AND is_active = true");
    await Promise.all(
      admins.rows.map((admin) =>
        createNotification(
          admin.id,
          'New Registration Pending Approval',
          `${fullName} registered as ${role}. License: ${licenseNumber}. Review documents and approve.`,
          'alert',
          '/dashboard/admin/approvals'
        )
      )
    );

    res.status(201).json({
      success: true,
      message: 'Registration submitted successfully. Your account is pending admin approval. You will be notified once verified.',
      data: { user: sanitizeUser(user) },
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);

    if (!result.rows[0]) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Admins and pre-approved demo accounts can always sign in when active
    if (user.role !== 'admin') {
      if (user.approval_status === 'pending') {
        return res.status(403).json({
          success: false,
          message: 'Your account is pending admin approval. Please wait for verification of your license and selfie.',
          code: 'PENDING_APPROVAL',
        });
      }

      if (user.approval_status === 'rejected') {
        return res.status(403).json({
          success: false,
          message: user.rejection_reason || 'Your registration was rejected. Please contact support or re-register.',
          code: 'REGISTRATION_REJECTED',
        });
      }
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Contact support.',
      });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.json({
      success: true,
      data: { user: sanitizeUser(user), token },
    });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res) => {
  res.json({ success: true, data: { user: req.user } });
};

module.exports = { register, login, getMe, registerValidation, loginValidation };
