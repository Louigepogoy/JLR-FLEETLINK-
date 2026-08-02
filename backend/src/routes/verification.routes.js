const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { uploadRegistrationDocs } = require('../middleware/upload');
const {
  getVerificationStatus, submitVerification, submitVerificationValidation,
} = require('../controllers/verificationController');

router.get('/', authenticate, getVerificationStatus);
router.post('/', authenticate, uploadRegistrationDocs, submitVerificationValidation, submitVerification);

module.exports = router;
