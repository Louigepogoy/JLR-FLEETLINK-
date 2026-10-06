const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  register, login, googleLogin, forgotPassword, resetPassword, getMe, getLoginLogs,
  registerValidation, loginValidation, forgotPasswordValidation, resetPasswordValidation,
  verifyEmail, resendVerification, verifyEmailValidation, resendVerificationValidation,
  checkEmail,
} = require('../controllers/authController');

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/verify-email', verifyEmailValidation, verifyEmail);
router.post('/resend-verification', resendVerificationValidation, resendVerification);
router.post('/check-email', resendVerificationValidation, checkEmail);
router.post('/google', googleLogin);
router.post('/forgot-password', forgotPasswordValidation, forgotPassword);
router.post('/reset-password', resetPasswordValidation, resetPassword);
router.get('/me', authenticate, getMe);
router.get('/login-logs', authenticate, authorize('admin'), getLoginLogs);

module.exports = router;
