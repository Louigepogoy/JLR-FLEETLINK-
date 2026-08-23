const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getPaymentsByBooking, getInvoice, getBookingReceipt,
} = require('../controllers/paymentController');

router.get('/booking/:bookingId', authenticate, getPaymentsByBooking);
router.get('/booking/:bookingId/receipt', authenticate, getBookingReceipt);
router.get('/invoice/:invoiceNumber', authenticate, getInvoice);

module.exports = router;
