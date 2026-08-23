const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { runLicenseAnalysis, runVehicleAnalysis } = require('../controllers/aiVerificationController');

router.post('/license/:userId', authenticate, authorize('admin'), runLicenseAnalysis);
router.post('/vehicle/:vehicleId', authenticate, authorize('admin'), runVehicleAnalysis);

module.exports = router;
