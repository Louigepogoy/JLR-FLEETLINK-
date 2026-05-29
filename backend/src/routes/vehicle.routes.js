const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { uploadVehicleImages } = require('../middleware/upload');
const {
  getVehicles, getVehicleById, createVehicle, updateVehicle,
  deleteVehicle, getOwnerVehicles, vehicleValidation,
} = require('../controllers/vehicleController');

router.get('/', getVehicles);
router.get('/owner/my-vehicles', authenticate, authorize('owner', 'admin'), getOwnerVehicles);
router.get('/:id', getVehicleById);
router.post('/', authenticate, authorize('owner', 'admin'), uploadVehicleImages, vehicleValidation, createVehicle);
router.put('/:id', authenticate, authorize('owner', 'admin'), uploadVehicleImages, updateVehicle);
router.delete('/:id', authenticate, authorize('owner', 'admin'), deleteVehicle);

module.exports = router;
