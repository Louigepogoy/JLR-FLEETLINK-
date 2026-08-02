const { v4: uuidv4 } = require('uuid');
const { generateReferenceNumber } = require('../utils/helpers');

const maskPhone = (phone) => {
  const cleaned = phone.replace(/\s/g, '');
  return cleaned.length >= 4 ? `09XX XXX ${cleaned.slice(-4)}` : '09XX XXX XXXX';
};

const buildTransactionMeta = (method, amount, extra = {}) => ({
  gateway: 'JLR Pay Gateway',
  transactionId: uuidv4(),
  processedAt: new Date().toISOString(),
  currency: 'PHP',
  amount,
  method,
  status: 'completed',
  ...extra,
});

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

  const referenceNumber = generateReferenceNumber('gcash');
  return {
    success: true,
    referenceNumber,
    method: 'gcash',
    metadata: buildTransactionMeta('gcash', amount, {
      referenceNumber,
      maskedAccount: maskPhone(phoneNumber),
      channel: 'GCash Wallet',
    }),
  };
};

const validateGcashQrPayment = async ({ amount }) => {
  if (amount <= 0) {
    throw new Error('Invalid payment amount');
  }

  const referenceNumber = generateReferenceNumber('gcash');
  return {
    success: true,
    referenceNumber,
    method: 'gcash',
    metadata: buildTransactionMeta('gcash', amount, {
      referenceNumber,
      channel: 'GCash QR (manual)',
    }),
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

  const referenceNumber = generateReferenceNumber('card');
  const cardLastFour = cleaned.slice(-4);
  return {
    success: true,
    referenceNumber,
    method: 'card',
    cardLastFour,
    metadata: buildTransactionMeta('card', amount, {
      referenceNumber,
      cardBrand: cleaned.startsWith('4') ? 'Visa' : cleaned.startsWith('5') ? 'Mastercard' : 'Card',
      cardLastFour,
      channel: 'Card Payment',
    }),
  };
};

module.exports = { validateGCashPayment, validateGcashQrPayment, validateCardPayment };
