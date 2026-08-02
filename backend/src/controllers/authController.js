const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/db');
const { sanitizeUser } = require('../utils/helpers');
const { recordLoginAttempt } = require('../utils/loginLog');
const { sendOtpEmail, sendPasswordResetEmail } = require('../utils/mailer');

const OTP_TTL_MINUTES = 10;
const generateOtpCode = () => String(Math.floor(100000 + Math.random() * 900000));

const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('fullName').trim().notEmpty(),
  body('phone').trim().notEmpty().matches(/^09\d{9}$/).withMessage('Valid Philippine mobile number required (09XXXXXXXXX)'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

const otpValidation = [
  body('email').isEmail().normalizeEmail(),
  body('code').trim().isLength({ min: 6, max: 6 }).isNumeric(),
];

const forgotPasswordValidation = [
  body('email').isEmail().normalizeEmail(),
];

const resetPasswordValidation = [
  body('email').isEmail().normalizeEmail(),
  body('code').trim().isLength({ min: 6, max: 6 }).isNumeric(),
  body('newPassword').isLength({ min: 8 }),
];

const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password, fullName, phone } = req.body;

    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await query(
      `INSERT INTO users (email, password_hash, full_name, phone, role)
       VALUES ($1, $2, $3, $4, 'user')
       RETURNING id, email, full_name, phone, role, approval_status, created_at`,
      [email, passwordHash, fullName, phone]
    );

    const user = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'Account created! You can now log in.',
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
      await recordLoginAttempt({ req, email, success: false, reason: 'invalid_email' });
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      await recordLoginAttempt({ req, email, success: false, reason: 'invalid_password', userId: user.id });
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!user.is_active) {
      await recordLoginAttempt({ req, email, success: false, reason: 'inactive', userId: user.id });
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Contact support.',
      });
    }

    const code = generateOtpCode();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await query(
      `INSERT INTO login_otps (user_id, code_hash, expires_at) VALUES ($1, $2, $3)`,
      [user.id, codeHash, expiresAt]
    );

    await sendOtpEmail(user.email, code);
    await recordLoginAttempt({ req, email, success: false, reason: 'otp_sent', userId: user.id });

    res.json({
      success: true,
      requiresOtp: true,
      message: `Verification code sent to ${user.email}. Enter it to finish signing in.`,
      data: { email: user.email },
    });
  } catch (error) {
    next(error);
  }
};

const verifyOtp = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, code } = req.body;
    const userResult = await query('SELECT * FROM users WHERE email = $1', [email]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or code' });
    }

    const otpResult = await query(
      `SELECT * FROM login_otps
       WHERE user_id = $1 AND used = false AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [user.id]
    );
    const otp = otpResult.rows[0];

    if (!otp) {
      await recordLoginAttempt({ req, email, success: false, reason: 'otp_expired', userId: user.id });
      return res.status(400).json({ success: false, message: 'Code expired or not found. Please log in again.' });
    }

    const validCode = await bcrypt.compare(code, otp.code_hash);
    if (!validCode) {
      await recordLoginAttempt({ req, email, success: false, reason: 'invalid_otp', userId: user.id });
      return res.status(401).json({ success: false, message: 'Invalid code' });
    }

    await query('UPDATE login_otps SET used = true WHERE id = $1', [otp.id]);

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    await recordLoginAttempt({ req, email, success: true, reason: 'success', userId: user.id });

    res.json({
      success: true,
      data: { user: sanitizeUser(user), token },
    });
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email } = req.body;
    const userResult = await query('SELECT id, email FROM users WHERE email = $1', [email]);
    const user = userResult.rows[0];

    if (user) {
      const code = generateOtpCode();
      const codeHash = await bcrypt.hash(code, 10);
      const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

      await query(
        `INSERT INTO password_reset_codes (user_id, code_hash, expires_at) VALUES ($1, $2, $3)`,
        [user.id, codeHash, expiresAt]
      );

      await sendPasswordResetEmail(user.email, code);
    }

    res.json({
      success: true,
      message: 'If an account exists with that email, a password reset code has been sent to it.',
    });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, code, newPassword } = req.body;
    const userResult = await query('SELECT id FROM users WHERE email = $1', [email]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid code' });
    }

    const codeResult = await query(
      `SELECT * FROM password_reset_codes
       WHERE user_id = $1 AND used = false AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [user.id]
    );
    const resetCode = codeResult.rows[0];

    if (!resetCode) {
      return res.status(400).json({ success: false, message: 'Code expired or not found. Please request a new one.' });
    }

    const validCode = await bcrypt.compare(code, resetCode.code_hash);
    if (!validCode) {
      return res.status(400).json({ success: false, message: 'Invalid code' });
    }

    await query('UPDATE password_reset_codes SET used = true WHERE id = $1', [resetCode.id]);

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [passwordHash, user.id]);

    res.json({ success: true, message: 'Password reset successful. You can now log in.' });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res) => {
  res.json({ success: true, data: { user: req.user } });
};

const getLoginLogs = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, user_id, email, success, reason, ip_address, user_agent, created_at
       FROM login_logs
       ORDER BY created_at DESC
       LIMIT 200`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register, login, verifyOtp, forgotPassword, resetPassword, getMe, getLoginLogs,
  registerValidation, loginValidation, otpValidation, forgotPasswordValidation, resetPasswordValidation,
};
