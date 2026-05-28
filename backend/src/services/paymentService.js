const { generateReferenceNumber } = require('../utils/helpers');

const validateGCashPayment = async ({ amount, phoneNumber, pin }) => {
  if (!phoneNumber || !/^09\d{9}$/.test(phoneNumber.replace(/\s/g, ''))) {
    throw new Error('Invalid GCash phone number');
  }
  if (!pin || pin.length < 4) {
    throw new Error('Invalid GCash PIN');
  }
  if (amount <= 0) {
    throw new Error('Invalid payment amount');
  }

  // Simulated GCash API - replace with real PayMongo/Xendit integration
  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    success: true,
    referenceNumber: generateReferenceNumber('gcash'),
    method: 'gcash',
  };
};

const validateCardPayment = async ({ amount, cardNumber, expiry, cvv, cardholderName }) => {
  const cleaned = cardNumber?.replace(/\s/g, '') || '';
  if (!/^\d{16}$/.test(cleaned)) {
    throw new Error('Invalid card number');
  }
  if (!/^\d{2}\/\d{2}$/.test(expiry || '')) {
    throw new Error('Invalid expiry date (MM/YY)');
  }
  if (!/^\d{3,4}$/.test(cvv || '')) {
    throw new Error('Invalid CVV');
  }
  if (!cardholderName?.trim()) {
    throw new Error('Cardholder name required');
  }
  if (amount <= 0) {
    throw new Error('Invalid payment amount');
  }

  // Simulated card gateway - replace with Stripe/PayMongo
  await new Promise((resolve) => setTimeout(resolve, 800));

  return {
    success: true,
    referenceNumber: generateReferenceNumber('card'),
    method: 'card',
    cardLastFour: cleaned.slice(-4),
  };
};

module.exports = { validateGCashPayment, validateCardPayment };
