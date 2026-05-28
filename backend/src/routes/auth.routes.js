const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { uploadRegistrationDocs } = require('../middleware/upload');
const {
  register, login, getMe, registerValidation, loginValidation,
} = require('../controllers/authController');

router.post('/register', uploadRegistrationDocs, registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/me', authenticate, getMe);

module.exports = router;
