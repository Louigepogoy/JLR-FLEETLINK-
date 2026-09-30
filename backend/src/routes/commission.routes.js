const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getCommission, updateCommission, getCommissionHistory, commissionValidation,
  updateInspectionWindow, inspectionWindowValidation,
} = require('../controllers/commissionController');

router.get('/', getCommission);
router.get('/history', authenticate, authorize('admin'), getCommissionHistory);
router.put('/', authenticate, authorize('admin'), commissionValidation, updateCommission);
router.put('/inspection-window', authenticate, authorize('admin'), inspectionWindowValidation, updateInspectionWindow);

module.exports = router;
