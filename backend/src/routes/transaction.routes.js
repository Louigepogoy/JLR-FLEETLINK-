const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getMyTransactions, getOwnerEarnings, getAdminAnalytics,
  getMyPayoutAccount, savePayoutAccount, getPendingPayouts, getPayoutHistory, markOwnerPayoutPaid,
} = require('../controllers/transactionController');

router.get('/', authenticate, getMyTransactions);
router.get('/earnings', authenticate, authorize('user', 'admin'), getOwnerEarnings);
router.get('/analytics', authenticate, authorize('admin'), getAdminAnalytics);
router.get('/payout-account', authenticate, authorize('user', 'admin'), getMyPayoutAccount);
router.put('/payout-account', authenticate, authorize('user', 'admin'), savePayoutAccount);
router.get('/payouts/pending', authenticate, authorize('admin'), getPendingPayouts);
router.get('/payouts/history', authenticate, authorize('admin'), getPayoutHistory);
router.post('/payouts/:ownerId/mark-paid', authenticate, authorize('admin'), markOwnerPayoutPaid);

module.exports = router;
