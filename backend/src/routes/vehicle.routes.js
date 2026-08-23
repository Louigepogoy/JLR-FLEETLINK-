const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { uploadVehicleImages } = require('../middleware/upload');
const {
  getVehicles, getVehicleById, createVehicle, updateVehicle,
  deleteVehicle, getOwnerVehicles, getPublicStats, vehicleValidation,
  getMaintenanceDates, addMaintenanceDate, deleteMaintenanceDate,
  getPendingVehicleVerifications, recordVehicleVerification,
} = require('../controllers/vehicleController');

router.get('/', getVehicles);
router.get('/stats/summary', getPublicStats);
router.get('/owner/my-vehicles', authenticate, authorize('user', 'admin'), getOwnerVehicles);
router.get('/admin/pending-verifications', authenticate, authorize('admin'), getPendingVehicleVerifications);
router.patch('/:id/verification', authenticate, authorize('admin'), recordVehicleVerification);
router.get('/:id', getVehicleById);
router.post('/', authenticate, authorize('user', 'admin'), uploadVehicleImages, vehicleValidation, createVehicle);
router.put('/:id', authenticate, authorize('user', 'admin'), uploadVehicleImages, updateVehicle);
router.delete('/:id', authenticate, authorize('user', 'admin'), deleteVehicle);

router.get('/:id/maintenance-dates', getMaintenanceDates);
router.post('/:id/maintenance-dates', authenticate, authorize('user', 'admin'), addMaintenanceDate);
router.delete('/:id/maintenance-dates/:blockId', authenticate, authorize('user', 'admin'), deleteMaintenanceDate);

module.exports = router;
