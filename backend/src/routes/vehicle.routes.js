const express = require('express');
const router = express.Router();
const { authenticate, optionalAuthenticate, authorize } = require('../middleware/auth');
const { uploadVehicleImages, uploadWalkInProof } = require('../middleware/upload');
const {
  getVehicles, getVehicleById, createVehicle, updateVehicle,
  deleteVehicle, getOwnerVehicles, getPublicStats, vehicleValidation,
  getMaintenanceDates, addMaintenanceDate, deleteMaintenanceDate, getBookedDates, getWalkInBlocks, getBrandOptions,
  getPendingVehicleVerifications, recordVehicleVerification, getDeletedVehicles,
} = require('../controllers/vehicleController');

router.get('/', getVehicles);
router.get('/stats/summary', getPublicStats);
router.get('/brands', getBrandOptions);
router.get('/owner/my-vehicles', authenticate, authorize('user', 'admin'), getOwnerVehicles);
router.get('/admin/deleted', authenticate, authorize('admin'), getDeletedVehicles);
router.get('/admin/pending-verifications', authenticate, authorize('admin'), getPendingVehicleVerifications);
router.patch('/:id/verification', authenticate, authorize('admin'), recordVehicleVerification);
router.get('/:id', optionalAuthenticate, getVehicleById);
router.post('/', authenticate, authorize('user', 'admin'), uploadVehicleImages, vehicleValidation, createVehicle);
router.put('/:id', authenticate, authorize('user', 'admin'), uploadVehicleImages, updateVehicle);
router.delete('/:id', authenticate, authorize('user', 'admin'), deleteVehicle);

router.get('/:id/booked-dates', optionalAuthenticate, getBookedDates);
router.get('/admin/walk-ins', authenticate, authorize('admin'), getWalkInBlocks);
router.get('/:id/maintenance-dates', optionalAuthenticate, getMaintenanceDates);
router.post('/:id/maintenance-dates', authenticate, authorize('user', 'admin'), uploadWalkInProof, addMaintenanceDate);
router.delete('/:id/maintenance-dates/:blockId', authenticate, authorize('user', 'admin'), deleteMaintenanceDate);

module.exports = router;
