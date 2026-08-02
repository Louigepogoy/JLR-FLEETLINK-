const { body, validationResult } = require('express-validator');
const { query } = require('../config/db');
const { validateGcashQrPayment, validateCardPayment } = require('../services/paymentService');
const { generateReferenceNumber } = require('../utils/helpers');

const PLANS = {
  basic: {
    id: 'basic',
    name: 'Basic',
    price: 0,
    billingCycle: 'trial',
    vehicleLimit: 5,
    photoLimit: 5,
    features: ['Publish 5 vehicles', 'Basic listing', 'Up to 5 photos'],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 10000,
    billingCycle: 'month',
    vehicleLimit: 10,
    photoLimit: 5,
    features: ['Publish 10 vehicles', 'Priority listing', 'Up to 5 photos'],
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 20000,
    billingCycle: 'month',
    vehicleLimit: 20,
    photoLimit: 5,
    features: ['Publish 20 vehicles', 'Featured placement', 'Up to 5 photos'],
  },
};

const getPlans = async (req, res) => {
  res.json({ success: true, data: Object.values(PLANS) });
};

const getMySubscription = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM owner_subscriptions
       WHERE owner_id = $1 AND status = 'active'
       ORDER BY created_at DESC LIMIT 1`,
      [req.user.id]
    );

    res.json({ success: true, data: result.rows[0] || null });
  } catch (error) {
    next(error);
  }
};

const subscribe = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { planId, paymentMethod, paymentDetails = {} } = req.body;
    const plan = PLANS[planId];

    if (!plan) {
      return res.status(400).json({ success: false, message: 'Invalid subscription plan' });
    }

    let paymentReference = null;
    let cardLastFour = null;

    if (plan.price > 0) {
      const paymentResult = paymentMethod === 'gcash'
        ? await validateGcashQrPayment({ amount: plan.price })
        : await validateCardPayment({
          amount: plan.price,
          cardNumber: paymentDetails.cardNumber,
          expiry: paymentDetails.expiry,
          cvv: paymentDetails.cvv,
          cardholderName: paymentDetails.cardholderName,
        });

      paymentReference = paymentResult.referenceNumber;
      cardLastFour = paymentResult.cardLastFour || null;
    } else {
      paymentReference = generateReferenceNumber('trial');
    }

    await query(
      `UPDATE owner_subscriptions
       SET status = 'cancelled', updated_at = NOW()
       WHERE owner_id = $1 AND status = 'active'`,
      [req.user.id]
    );

    const result = await query(
      `INSERT INTO owner_subscriptions (
        owner_id, plan_id, plan_name, price, billing_cycle, vehicle_limit,
        photo_limit, payment_method, payment_reference, card_last_four,
        starts_at, ends_at, status
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW() + INTERVAL '30 days','active')
      RETURNING *`,
      [
        req.user.id,
        plan.id,
        plan.name,
        plan.price,
        plan.billingCycle,
        plan.vehicleLimit,
        plan.photoLimit,
        plan.price > 0 ? paymentMethod : 'trial',
        paymentReference,
        cardLastFour,
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

const subscriptionValidation = [
  body('planId').isIn(Object.keys(PLANS)),
  body('paymentMethod').custom((value, { req }) => {
    if (req.body.planId === 'basic') return true;
    if (!['gcash', 'card'].includes(value)) {
      throw new Error('Payment method must be GCash or card');
    }
    return true;
  }),
];

module.exports = {
  getPlans,
  getMySubscription,
  subscribe,
  subscriptionValidation,
};
