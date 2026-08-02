const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { uploadVehicleImages } = require('../middleware/upload');
const {
  getVehicles, getVehicleById, createVehicle, updateVehicle,
  deleteVehicle, getOwnerVehicles, getPublicStats, vehicleValidation,
} = require('../controllers/vehicleController');

router.get('/', getVehicles);
router.get('/stats/summary', getPublicStats);
router.get('/owner/my-vehicles', authenticate, authorize('user', 'admin'), getOwnerVehicles);
router.get('/:id', getVehicleById);
router.post('/', authenticate, authorize('user', 'admin'), uploadVehicleImages, vehicleValidation, createVehicle);
router.put('/:id', authenticate, authorize('user', 'admin'), uploadVehicleImages, updateVehicle);
router.delete('/:id', authenticate, authorize('user', 'admin'), deleteVehicle);

module.exports = router;
