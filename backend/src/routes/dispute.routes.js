const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { uploadDisputeEvidence } = require('../middleware/upload');
const {
  getDisputes, resolveDispute, resolveDisputeValidation, requestEvidence, addDisputeEvidence,
} = require('../controllers/disputeController');

router.get('/', authenticate, authorize('admin'), getDisputes);
router.post('/:id/resolve', authenticate, authorize('admin'), resolveDisputeValidation, resolveDispute);
router.post('/:id/request-evidence', authenticate, authorize('admin'), requestEvidence);
router.post('/:id/evidence', authenticate, authorize('user'), uploadDisputeEvidence, addDisputeEvidence);

module.exports = router;
