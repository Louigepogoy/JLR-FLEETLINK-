const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  createReport,
  getAllReports,
  updateReportStatus,
  reportValidation,
} = require('../controllers/reportController');

router.post('/', authenticate, authorize('user', 'admin'), reportValidation, createReport);
router.get('/', authenticate, authorize('admin'), getAllReports);
router.patch('/:id/status', authenticate, authorize('admin'), updateReportStatus);

module.exports = router;
