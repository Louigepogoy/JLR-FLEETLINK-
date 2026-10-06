const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const { OAuth2Client } = require('google-auth-library');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/db');
const { sanitizeUser } = require('../utils/helpers');
const { recordLoginAttempt } = require('../utils/loginLog');
const validator = require('validator');
const { sendPasswordResetEmail, sendVerificationEmail } = require('../utils/mailer');
const { strongPassword } = require('../utils/passwordPolicy');
const { checkEmailDeliverable, EMAIL_PROBLEM_MESSAGES } = require('../utils/emailCheck');

const OTP_TTL_MINUTES = 10;
const generateOtpCode = () => String(Math.floor(100000 + Math.random() * 900000));
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const VERIFY_MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const registerValidation = [
  // Any username is fine as long as it isn't empty; "@" is reserved so sign-in can tell a username
  // from an email address.
  body('username').trim().notEmpty().withMessage('Enter a username')
    .not().contains('@').withMessage('Username can\'t contain "@"')
    .isLength({ max: 255 }).withMessage('Username is too long'),
  body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  body('password').custom(strongPassword),
  body('phone').trim().notEmpty().matches(/^09\d{9}$/).withMessage('Valid Philippine mobile number required (09XXXXXXXXX)'),
];

// `identifier` is a username or an email; `email` is still accepted from older clients.
const loginValidation = [
  body('identifier').optional().trim(),
  body('email').optional().trim(),
  body('password').notEmpty().withMessage('Enter your password'),
];

const verifyEmailValidation = [
  body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  body('code').trim().matches(/^\d{6}$/).withMessage('Enter the 6-digit code from your email'),
];

const resendVerificationValidation = [
  body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
];

const firstError = (errors) => errors.array()[0]?.msg;

// Creates a fresh 6-digit code for the user and emails it. Older unused codes stop working.
const issueVerificationCode = async (user) => {
  const code = generateOtpCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
  await query('UPDATE email_verification_codes SET used = true WHERE user_id = $1 AND used = false', [user.id]);
  await query(
    'INSERT INTO email_verification_codes (user_id, code_hash, expires_at) VALUES ($1, $2, $3)',
    [user.id, codeHash, expiresAt]
  );
  await sendVerificationEmail(user.email, user.username || user.full_name, code);
};

const forgotPasswordValidation = [
  body('email').isEmail().normalizeEmail(),
];

const resetPasswordValidation = [
  body('email').isEmail().normalizeEmail(),
  body('code').trim().isLength({ min: 6, max: 6 }).isNumeric(),
  body('newPassword').custom(strongPassword),
];

// Creates the account unverified and emails a code. The account can't sign in until the code is
// entered, so a made-up or mistyped email address never becomes a working account.
const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: firstError(errors), errors: errors.array() });
    }

    const { email, password, phone } = req.body;
    const username = req.body.username.trim();

    const existing = await query('SELECT id, email_verified FROM users WHERE email = $1', [email]);
    const pending = existing.rows[0];

    // Stop sign-ups to email addresses that can't receive mail (e.g. a Gmail account that doesn't exist).
    if (!pending) {
      const deliverable = await checkEmailDeliverable(email);
      if (EMAIL_PROBLEM_MESSAGES[deliverable]) {
        return res.status(400).json({ success: false, field: 'email', message: EMAIL_PROBLEM_MESSAGES[deliverable] });
      }
    }
    if (pending?.email_verified) {
      return res.status(409).json({ success: false, message: 'This email is already registered. Sign in instead.' });
    }

    const taken = await query(
      'SELECT 1 FROM users WHERE LOWER(username) = LOWER($1) AND id IS DISTINCT FROM $2',
      [username, pending?.id || null]
    );
    if (taken.rows.length) {
      return res.status(409).json({ success: false, message: 'That username is already taken. Try another one.' });
    }

    // Someone who signed up before but never verified can simply sign up again with the same email.
    const passwordHash = await bcrypt.hash(password, 12);
    const result = pending
      ? await query(
        `UPDATE users SET username = $1, full_name = $1, password_hash = $2, phone = $3, updated_at = NOW()
         WHERE id = $4 RETURNING *`,
        [username, passwordHash, phone, pending.id]
      )
      : await query(
        `INSERT INTO users (email, username, full_name, password_hash, phone, role, email_verified)
         VALUES ($1, $2, $2, $3, $4, 'user', false)
         RETURNING *`,
        [email, username, passwordHash, phone]
      );
    const user = result.rows[0];

    try {
      await issueVerificationCode(user);
    } catch (mailError) {
      console.error('Verification email failed:', mailError.message);
      return res.status(502).json({
        success: false,
        message: 'We could not send a verification email to that address. Check that the email is correct and try again.',
      });
    }

    res.status(201).json({
      success: true,
      message: `We sent a 6-digit code to ${email}. Enter it to activate your account.`,
      data: { requiresVerification: true, email },
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'That username or email is already taken.' });
    }
    next(error);
  }
};

// Checks the emailed code; on success the account is activated and the user is signed in.
const verifyEmail = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: firstError(errors) });
    }

    const { email, code } = req.body;
    const userResult = await query('SELECT * FROM users WHERE email = $1', [email]);
    const user = userResult.rows[0];
    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired code' });
    if (user.email_verified) {
      return res.status(400).json({ success: false, message: 'This email is already verified. Sign in instead.' });
    }

    const codeResult = await query(
      `SELECT * FROM email_verification_codes
       WHERE user_id = $1 AND used = false AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [user.id]
    );
    const record = codeResult.rows[0];
    if (!record || record.attempts >= VERIFY_MAX_ATTEMPTS) {
      return res.status(400).json({ success: false, message: 'This code has expired. Request a new one.' });
    }

    if (!(await bcrypt.compare(code, record.code_hash))) {
      await query('UPDATE email_verification_codes SET attempts = attempts + 1 WHERE id = $1', [record.id]);
      const left = VERIFY_MAX_ATTEMPTS - record.attempts - 1;
      return res.status(400).json({
        success: false,
        message: left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.` : 'Too many attempts. Request a new code.',
      });
    }

    await query('UPDATE email_verification_codes SET used = true WHERE id = $1', [record.id]);
    const verified = await query(
      'UPDATE users SET email_verified = true, updated_at = NOW() WHERE id = $1 RETURNING *',
      [user.id]
    );
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
    await recordLoginAttempt({ req, email, success: true, reason: 'success', userId: user.id });

    res.json({ success: true, message: 'Email verified!', data: { user: sanitizeUser(verified.rows[0]), token } });
  } catch (error) {
    next(error);
  }
};

const resendVerification = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: firstError(errors) });
    }

    const userResult = await query('SELECT * FROM users WHERE email = $1', [req.body.email]);
    const user = userResult.rows[0];
    // Same answer whether or not the account exists, so this can't be used to probe for emails.
    const ok = () => res.json({ success: true, message: 'If that account needs verifying, a new code is on its way.' });
    if (!user || user.email_verified) return ok();

    const recent = await query(
      `SELECT 1 FROM email_verification_codes
       WHERE user_id = $1 AND created_at > NOW() - $2::int * INTERVAL '1 second'`,
      [user.id, RESEND_COOLDOWN_SECONDS]
    );
    if (recent.rows.length) {
      return res.status(429).json({ success: false, message: 'Please wait a minute before requesting another code.' });
    }

    await issueVerificationCode(user);
    ok();
  } catch (error) {
    next(error);
  }
};

// Live check for the sign-up form: is this email already registered, or unable to receive mail?
const checkEmail = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.json({ success: true, data: { status: 'invalid', message: firstError(errors) } });

    const { email } = req.body;
    const existing = await query('SELECT email_verified FROM users WHERE email = $1', [email]);
    if (existing.rows[0]?.email_verified) {
      return res.json({ success: true, data: { status: 'registered', message: 'This email is already registered. Sign in instead.' } });
    }
    const status = await checkEmailDeliverable(email);
    res.json({ success: true, data: { status, message: EMAIL_PROBLEM_MESSAGES[status] || null } });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: firstError(errors), errors: errors.array() });
    }

    const identifier = String(req.body.identifier || req.body.email || '').trim();
    const { password } = req.body;
    if (!identifier) return res.status(400).json({ success: false, message: 'Enter your username or email' });

    // An email is matched in the same normalized form it was saved in at registration.
    const email = identifier.includes('@') ? (validator.normalizeEmail(identifier) || identifier.toLowerCase()) : null;
    const result = email
      ? await query('SELECT * FROM users WHERE email = $1', [email])
      : await query('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [identifier]);
    const logEmail = email || identifier;

    if (!result.rows[0]) {
      await recordLoginAttempt({ req, email: logEmail, success: false, reason: 'invalid_email' });
      return res.status(401).json({ success: false, message: 'Invalid username/email or password' });
    }

    const user = result.rows[0];
    const valid = user.password_hash ? await bcrypt.compare(password, user.password_hash) : false;
    if (!valid) {
      await recordLoginAttempt({ req, email: logEmail, success: false, reason: 'invalid_password', userId: user.id });
      return res.status(401).json({ success: false, message: 'Invalid username/email or password' });
    }

    if (!user.email_verified) {
      return res.status(403).json({
        success: false,
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email first. Enter the code we sent you.',
        data: { email: user.email },
      });
    }

    if (!user.is_active) {
      await recordLoginAttempt({ req, email: user.email, success: false, reason: 'inactive', userId: user.id });
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Contact support.',
      });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
    await recordLoginAttempt({ req, email: user.email, success: true, reason: 'success', userId: user.id });

    res.json({
      success: true,
      data: { user: sanitizeUser(user), token },
    });
  } catch (error) {
    next(error);
  }
};

const googleLogin = async (req, res, next) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ success: false, message: 'Missing Google credential' });
    }
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({ success: false, message: 'Google Sign-In is not configured.' });
    }

    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
    } catch (err) {
      const clockIssue = /Token used too (early|late)/.test(err.message);
      console.error('Google token verification failed:', err.message.split(':')[0]);
      return res.status(401).json({
        success: false,
        message: clockIssue
          ? "Google Sign-In failed: the server's clock is out of sync. Please sync the system date/time and try again."
          : 'Invalid Google credential. Please try again.',
      });
    }
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    let result = await query('SELECT * FROM users WHERE google_id = $1 OR email = $2', [googleId, email]);
    let user = result.rows[0];

    if (!user) {
      const insertResult = await query(
        `INSERT INTO users (email, full_name, role, google_id, avatar_url, approval_status, is_active)
         VALUES ($1, $2, 'user', $3, $4, 'unverified', true)
         RETURNING *`,
        [email, name, googleId, picture || null]
      );
      user = insertResult.rows[0];
    } else if (!user.google_id || !user.email_verified) {
      // Google has verified this email, so an unverified sign-up with the same address is now verified too.
      const updateResult = await query(
        'UPDATE users SET google_id = COALESCE(google_id, $1), email_verified = true, updated_at = NOW() WHERE id = $2 RETURNING *',
        [googleId, user.id]
      );
      user = updateResult.rows[0];
    }

    if (!user.is_active) {
      await recordLoginAttempt({ req, email, success: false, reason: 'inactive', userId: user.id });
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Contact support.',
      });
    }

    // Google already verified this email address, so there's no need for our own OTP step too.
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    await recordLoginAttempt({ req, email, success: true, reason: 'success_google', userId: user.id });

    res.json({
      success: true,
      data: { user: sanitizeUser(user), token },
    });
  } catch (error) {
    if (error.message?.includes('Token used too late') || error.message?.includes('Wrong recipient')) {
      return res.status(401).json({ success: false, message: 'Invalid or expired Google sign-in. Please try again.' });
    }
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
      return res.status(400).json({ success: false, message: firstError(errors), errors: errors.array() });
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
  register, login, googleLogin, forgotPassword, resetPassword, getMe, getLoginLogs, verifyEmail, resendVerification,
  checkEmail,
  registerValidation, loginValidation, forgotPasswordValidation, resetPasswordValidation,
  verifyEmailValidation, resendVerificationValidation,
};
