const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  createBookingPaymentCheckout,
  createSubscriptionCheckout,
  createExtraSlotsCheckout,
  reconcilePendingPayments,
} = require('../controllers/paymongoController');

router.post('/bookings/checkout', authenticate, authorize('user'), createBookingPaymentCheckout);
router.post('/subscriptions/checkout', authenticate, authorize('user', 'admin'), createSubscriptionCheckout);
router.post('/subscriptions/extra-slots/checkout', authenticate, authorize('user', 'admin'), createExtraSlotsCheckout);
router.post('/reconcile', authenticate, authorize('user', 'admin'), reconcilePendingPayments);

module.exports = router;
