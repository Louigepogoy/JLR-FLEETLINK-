const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getDisputes, resolveDispute, resolveDisputeValidation } = require('../controllers/disputeController');

router.get('/', authenticate, authorize('admin'), getDisputes);
router.post('/:id/resolve', authenticate, authorize('admin'), resolveDisputeValidation, resolveDispute);

module.exports = router;
