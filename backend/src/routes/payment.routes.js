const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  processPayment, getPaymentsByBooking, getInvoice, paymentValidation,
} = require('../controllers/paymentController');

router.post('/process', authenticate, paymentValidation, processPayment);
router.get('/booking/:bookingId', authenticate, getPaymentsByBooking);
router.get('/invoice/:invoiceNumber', authenticate, getInvoice);

module.exports = router;
