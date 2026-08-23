const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  createBooking, getMyBookings, getOwnerBookings, getAllBookings,
  updateBookingStatus, cancelMyBooking, getBookingById, bookingValidation,
} = require('../controllers/bookingController');

router.post('/', authenticate, authorize('user', 'admin'), bookingValidation, createBooking);
router.get('/my', authenticate, authorize('user', 'admin'), getMyBookings);
router.get('/owner', authenticate, authorize('user', 'admin'), getOwnerBookings);
router.get('/all', authenticate, authorize('admin'), getAllBookings);
router.get('/:id', authenticate, getBookingById);
router.patch('/:id/status', authenticate, authorize('user', 'admin'), updateBookingStatus);
router.patch('/:id/cancel', authenticate, authorize('user', 'admin'), cancelMyBooking);

module.exports = router;
