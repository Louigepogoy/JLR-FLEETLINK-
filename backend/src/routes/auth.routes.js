const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  register, login, verifyOtp, forgotPassword, resetPassword, getMe, getLoginLogs,
  registerValidation, loginValidation, otpValidation, forgotPasswordValidation, resetPasswordValidation,
} = require('../controllers/authController');

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/verify-otp', otpValidation, verifyOtp);
router.post('/forgot-password', forgotPasswordValidation, forgotPassword);
router.post('/reset-password', resetPasswordValidation, resetPassword);
router.get('/me', authenticate, getMe);
router.get('/login-logs', authenticate, authorize('admin'), getLoginLogs);

module.exports = router;
