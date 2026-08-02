const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getPlans,
  getMySubscription,
  subscribe,
  subscriptionValidation,
} = require('../controllers/subscriptionController');

router.get('/plans', authenticate, authorize('user', 'admin'), getPlans);
router.get('/me', authenticate, authorize('user', 'admin'), getMySubscription);
router.post('/subscribe', authenticate, authorize('user', 'admin'), subscriptionValidation, subscribe);

module.exports = router;
