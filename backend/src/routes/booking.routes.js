const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { uploadDisputeEvidence } = require('../middleware/upload');
const {
  createBooking, getMyBookings, getOwnerBookings, getAllBookings,
  updateBookingStatus, cancelMyBooking, getBookingById, bookingValidation,
  handOverVehicle, acceptVehicle, rejectVehicle, recordCashPayment, payRestInCash, getCancellationQuote, markReadyForPickup, getExtensionOptions,
} = require('../controllers/bookingController');
const { getBookingReport } = require('../controllers/bookingReportController');
const { getBookingDocuments } = require('../controllers/bookingDocumentsController');

router.post('/', authenticate, authorize('user'), bookingValidation, createBooking);
router.get('/my', authenticate, authorize('user', 'admin'), getMyBookings);
router.get('/owner', authenticate, authorize('user', 'admin'), getOwnerBookings);
router.get('/all', authenticate, authorize('admin'), getAllBookings);
router.get('/report', authenticate, authorize('user', 'admin'), getBookingReport);
router.get('/:id', authenticate, getBookingById);
router.get('/:id/extension-options', authenticate, authorize('user', 'admin'), getExtensionOptions);
router.get('/:id/documents',authenticate, getBookingDocuments);
router.patch('/:id/status', authenticate, authorize('user', 'admin'), updateBookingStatus);
router.get('/:id/cancel-quote', authenticate, authorize('user', 'admin'), getCancellationQuote);
router.patch('/:id/cancel', authenticate, authorize('user', 'admin'), cancelMyBooking);
router.post('/:id/handover', authenticate, authorize('user', 'admin'), handOverVehicle);
router.post('/:id/cash-payment', authenticate, authorize('user', 'admin'), recordCashPayment);
router.post('/:id/ready', authenticate, authorize('user'), markReadyForPickup);
router.post('/:id/pay-rest-cash', authenticate, authorize('user'), payRestInCash);
router.post('/:id/inspection/accept', authenticate, authorize('user', 'admin'), acceptVehicle);
router.post('/:id/inspection/reject', authenticate, authorize('user', 'admin'), uploadDisputeEvidence, rejectVehicle);

module.exports = router;
