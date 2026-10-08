const { body, validationResult } = require('express-validator');
const { query } = require('../config/db');
const { generateReferenceNumber, canList } = require('../utils/helpers');

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
    price: 5000,
    billingCycle: 'month',
    vehicleLimit: 10,
    photoLimit: 5,
    features: ['Publish 10 vehicles', 'Priority listing', 'Up to 5 photos'],
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 8000,
    billingCycle: 'month',
    vehicleLimit: 20,
    photoLimit: 5,
    features: ['Publish 20 vehicles', 'Featured placement', 'Up to 5 photos'],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 15000,
    // One payment covers 3 months (see `duration`).
    billingCycle: '3 months',
    duration: '3 months',
    vehicleLimit: 50,
    photoLimit: 5,
    features: ['Publish 50 vehicles', 'Valid for 3 months', 'Featured placement', 'Up to 5 photos'],
  },
};

// How long one payment (or the trial) lasts, as a Postgres interval. Plans without `duration` last 30 days.
const DEFAULT_DURATION = '30 days';

// A subscription counts only while its status is active and its period (ends_at) hasn't run out.
const ACTIVE_SUBSCRIPTION_SQL = "status = 'active' AND (ends_at IS NULL OR ends_at > NOW())";

// Owners on any paid plan (Pro, Premium, Enterprise) who hit their vehicle limit can buy more slots at
// this price each. Slots are added to the active subscription and last for that subscription period.
const EXTRA_VEHICLE_SLOT_PRICE = 500;
const EXTRA_SLOT_PLAN_IDS = Object.values(PLANS).filter((plan) => plan.price > 0).map((plan) => plan.id);
const MAX_EXTRA_SLOTS_PER_PURCHASE = 50;

// First-time offer: a user who has never had a paid plan (Pro or Premium) gets this much off their
// first paid subscription. Resubscribing or switching plans later is full price.
const FIRST_SUBSCRIPTION_DISCOUNT_PERCENT = 20;

const isFirstPaidSubscription = async (userId) => {
  const result = await query(
    `SELECT 1 FROM owner_subscriptions WHERE owner_id = $1 AND price > 0 LIMIT 1`,
    [userId]
  );
  return !result.rows[0];
};

/** What this user would pay for a plan right now, with the first-time discount when it applies. */
const priceForUser = (plan, firstTime) => {
  if (plan.price <= 0 || !firstTime) return { price: plan.price, discountPercent: 0 };
  const price = Math.round(plan.price * (100 - FIRST_SUBSCRIPTION_DISCOUNT_PERCENT)) / 100;
  return { price, discountPercent: FIRST_SUBSCRIPTION_DISCOUNT_PERCENT };
};

const getPlans = async (req, res, next) => {
  try {
    const firstTime = await isFirstPaidSubscription(req.user.id);
    const data = Object.values(PLANS).map((plan) => {
      const { price, discountPercent } = priceForUser(plan, firstTime);
      // `price` stays the regular price; `finalPrice` is what this user pays.
      return { ...plan, finalPrice: price, discountPercent };
    });
    res.json({
      success: true,
      data,
      firstTimeOffer: firstTime,
      discountPercent: FIRST_SUBSCRIPTION_DISCOUNT_PERCENT,
      extraVehicleSlotPrice: EXTRA_VEHICLE_SLOT_PRICE,
    });
  } catch (error) {
    next(error);
  }
};

const getMySubscription = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM owner_subscriptions
       WHERE owner_id = $1 AND ${ACTIVE_SUBSCRIPTION_SQL}
       ORDER BY created_at DESC LIMIT 1`,
      [req.user.id]
    );

    res.json({ success: true, data: result.rows[0] || null });
  } catch (error) {
    next(error);
  }
};

// `price` is what was actually paid (e.g. after the first-time discount); defaults to the plan price.
const activateSubscription = async ({ userId, plan, paymentMethod, paymentReference, cardLastFour = null, price = plan.price }) => {
  await query(
    `UPDATE owner_subscriptions
     SET status = 'cancelled', updated_at = NOW()
     WHERE owner_id = $1 AND status = 'active'`,
    [userId]
  );

  const result = await query(
    `INSERT INTO owner_subscriptions (
      owner_id, plan_id, plan_name, price, billing_cycle, vehicle_limit,
      photo_limit, payment_method, payment_reference, card_last_four,
      starts_at, ends_at, status
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW() + $11::interval,'active')
    RETURNING *`,
    [
      userId, plan.id, plan.name, price, plan.billingCycle, plan.vehicleLimit,
      plan.photoLimit, paymentMethod, paymentReference, cardLastFour, plan.duration || DEFAULT_DURATION,
    ]
  );

  return result.rows[0];
};

/** The user's active paid subscription; only paid plans can buy extra vehicle slots. */
const getActivePaidSubscription = async (userId) => {
  const result = await query(
    `SELECT * FROM owner_subscriptions
     WHERE owner_id = $1 AND ${ACTIVE_SUBSCRIPTION_SQL} AND plan_id = ANY($2)
     ORDER BY created_at DESC LIMIT 1`,
    [userId, EXTRA_SLOT_PLAN_IDS]
  );
  return result.rows[0] || null;
};

/** Adds paid extra slots to the user's active paid subscription. Returns the updated row, or null. */
const addExtraVehicleSlots = async ({ userId, quantity }) => {
  const result = await query(
    `UPDATE owner_subscriptions
     SET vehicle_limit = vehicle_limit + $3,
         extra_vehicle_slots = extra_vehicle_slots + $3,
         updated_at = NOW()
     WHERE id = (
       SELECT id FROM owner_subscriptions
       WHERE owner_id = $1 AND ${ACTIVE_SUBSCRIPTION_SQL} AND plan_id = ANY($2)
       ORDER BY created_at DESC LIMIT 1
     )
     RETURNING *`,
    [userId, EXTRA_SLOT_PLAN_IDS, quantity]
  );
  return result.rows[0] || null;
};

// Plans and extra slots are for listing vehicles, so customer accounts can't buy them. Returns true if rejected.
const rejectNonOwner = (req, res) => {
  if (canList(req.user)) return false;
  res.status(403).json({
    success: false,
    code: 'OWNER_ACCOUNT_REQUIRED',
    message: 'Subscriptions are for Owner accounts. Sign up for a separate Owner account to list vehicles.',
  });
  return true;
};

const subscribe = async (req, res, next) => {
  try {
    if (rejectNonOwner(req, res)) return;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { planId } = req.body;
    const plan = PLANS[planId];

    if (!plan) {
      return res.status(400).json({ success: false, message: 'Invalid subscription plan' });
    }

    if (plan.price > 0) {
      return res.status(400).json({
        success: false,
        message: 'This plan requires payment. Please checkout via the payment page.',
      });
    }

    const subscription = await activateSubscription({
      userId: req.user.id,
      plan,
      paymentMethod: 'trial',
      paymentReference: generateReferenceNumber('trial'),
    });

    res.status(201).json({ success: true, data: subscription });
  } catch (error) {
    next(error);
  }
};

const subscriptionValidation = [
  body('planId').isIn(Object.keys(PLANS)),
];

module.exports = {
  PLANS,
  rejectNonOwner,
  EXTRA_VEHICLE_SLOT_PRICE,
  MAX_EXTRA_SLOTS_PER_PURCHASE,
  getActivePaidSubscription,
  addExtraVehicleSlots,
  ACTIVE_SUBSCRIPTION_SQL,
  isFirstPaidSubscription,
  priceForUser,
  getPlans,
  getMySubscription,
  subscribe,
  activateSubscription,
  subscriptionValidation,
};
