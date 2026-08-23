const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { createBookingPaymentInvoice, createSubscriptionInvoice, handleWebhook } = require('../controllers/xenditController');

router.post('/bookings/invoice', authenticate, authorize('user', 'admin'), createBookingPaymentInvoice);
router.post('/subscriptions/invoice', authenticate, authorize('user', 'admin'), createSubscriptionInvoice);
// Called by Xendit's servers directly — no user auth, verified via X-CALLBACK-TOKEN header instead.
router.post('/webhook', handleWebhook);

module.exports = router;
