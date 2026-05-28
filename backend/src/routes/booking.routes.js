const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  createBooking, getMyBookings, getOwnerBookings, getAllBookings,
  updateBookingStatus, getBookingById, bookingValidation,
} = require('../controllers/bookingController');

router.post('/', authenticate, authorize('customer'), bookingValidation, createBooking);
router.get('/my', authenticate, authorize('customer'), getMyBookings);
router.get('/owner', authenticate, authorize('owner'), getOwnerBookings);
router.get('/all', authenticate, authorize('admin'), getAllBookings);
router.get('/:id', authenticate, getBookingById);
router.patch('/:id/status', authenticate, authorize('owner', 'admin'), updateBookingStatus);

module.exports = router;
