const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getMyTransactions, getOwnerEarnings, getAdminAnalytics,
} = require('../controllers/transactionController');

router.get('/', authenticate, getMyTransactions);
router.get('/earnings', authenticate, authorize('owner'), getOwnerEarnings);
router.get('/analytics', authenticate, authorize('admin'), getAdminAnalytics);

module.exports = router;
