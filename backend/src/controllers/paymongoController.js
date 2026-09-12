const { query } = require('../config/db');
const { createCheckoutSession, getCheckoutSession, verifyWebhookEvent } = require('../services/paymongoService');
const { finalizeBookingPayment } = require('./paymentController');
const { PLANS, activateSubscription } = require('./subscriptionController');
const { createNotification } = require('../utils/notifications');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const mapPaymentMethod = (paymentItem) => {
  const type = paymentItem?.attributes?.source?.type || paymentItem?.source?.type;
  return type === 'card' ? 'card' : 'gcash';
};

/**
 * Applies a paid PayMongo Checkout Session to its matching payment_intent, activating the
 * subscription or crediting the booking. Idempotent (skips intents already marked 'paid') and
 * shared by both the webhook handler and the reconcile-on-return fallback below, since either
 * one may be the first to observe a given payment as paid.
 */
const finalizeCheckoutSession = async (checkoutSession) => {
  const externalId = checkoutSession?.attributes?.reference_number;
  if (!externalId) return { handled: false, reason: 'missing reference_number' };

  const intentResult = await query('SELECT * FROM payment_intents WHERE external_id = $1', [externalId]);
  const intent = intentResult.rows[0];
  if (!intent) return { handled: false, reason: 'unknown reference_number' };
  if (intent.status === 'paid') return { handled: false, reason: 'already processed' };

  const paidPayment = (checkoutSession.attributes.payments || []).find((p) => p.attributes?.status === 'paid');
  if (!paidPayment) return { handled: false, reason: 'not paid yet' };

  const paymentMethod = mapPaymentMethod(paidPayment);
  const referenceNumber = paidPayment.id || checkoutSession.id;

  await query(`UPDATE payment_intents SET status = 'paid', updated_at = NOW() WHERE id = $1`, [intent.id]);

  if (intent.purpose === 'booking_payment') {
    await finalizeBookingPayment({
      bookingId: intent.payload.bookingId,
      amount: parseFloat(intent.amount),
      paymentMethod,
      referenceNumber,
      metadata: { paymongoCheckoutSessionId: checkoutSession.id },
    });
  } else if (intent.purpose === 'subscription') {
    const plan = PLANS[intent.payload.planId];
    if (plan) {
      await activateSubscription({
        userId: intent.user_id,
        plan,
        paymentMethod,
        paymentReference: referenceNumber,
      });
      await createNotification(
        intent.user_id,
        'Subscription Activated',
        `Your ${plan.name} subscription is now active.`,
        'system',
        '/dashboard/subscription'
      );
    }
  }

  return { handled: true };
};

const createBookingPaymentCheckout = async (req, res, next) => {
  try {
    const { bookingId, amount } = req.body;
    if (!bookingId || !(amount > 0)) {
      return res.status(400).json({ success: false, message: 'bookingId and a positive amount are required' });
    }

    const bookingResult = await query(
      `SELECT b.*, v.title FROM bookings b JOIN vehicles v ON b.vehicle_id = v.id WHERE b.id = $1`,
      [bookingId]
    );
    const booking = bookingResult.rows[0];
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    if (booking.customer_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    if (!['pending', 'approved', 'active'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: 'Booking not eligible for payment' });
    }

    const remaining = parseFloat(booking.total_amount) - parseFloat(booking.paid_amount);
    if (amount > remaining) {
      return res.status(400).json({
        success: false,
        message: `Payment exceeds remaining balance of ₱${remaining.toFixed(2)}`,
      });
    }

    const externalId = `booking-${bookingId}-${Date.now()}`;

    const session = await createCheckoutSession({
      referenceNumber: externalId,
      amount,
      description: `Payment for ${booking.title}`,
      payerEmail: req.user.email,
      successUrl: `${FRONTEND_URL}/dashboard/bookings?payment=success`,
      cancelUrl: `${FRONTEND_URL}/dashboard/bookings?payment=failed`,
    });

    await query(
      `INSERT INTO payment_intents (external_id, gateway_session_id, purpose, user_id, amount, payload, checkout_url)
       VALUES ($1, $2, 'booking_payment', $3, $4, $5, $6)`,
      [externalId, session.id, req.user.id, amount, JSON.stringify({ bookingId }), session.checkoutUrl]
    );

    res.status(201).json({ success: true, data: { checkoutUrl: session.checkoutUrl } });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const createSubscriptionCheckout = async (req, res, next) => {
  try {
    const { planId } = req.body;
    const plan = PLANS[planId];
    if (!plan) {
      return res.status(400).json({ success: false, message: 'Invalid subscription plan' });
    }
    if (plan.price <= 0) {
      return res.status(400).json({ success: false, message: 'This plan does not require payment' });
    }

    const externalId = `subscription-${planId}-${req.user.id}-${Date.now()}`;

    const session = await createCheckoutSession({
      referenceNumber: externalId,
      amount: plan.price,
      description: `${plan.name} subscription - JLR Fleetlink`,
      payerEmail: req.user.email,
      successUrl: `${FRONTEND_URL}/dashboard/subscription?payment=success`,
      cancelUrl: `${FRONTEND_URL}/dashboard/subscription?payment=failed`,
    });

    await query(
      `INSERT INTO payment_intents (external_id, gateway_session_id, purpose, user_id, amount, payload, checkout_url)
       VALUES ($1, $2, 'subscription', $3, $4, $5, $6)`,
      [externalId, session.id, req.user.id, plan.price, JSON.stringify({ planId }), session.checkoutUrl]
    );

    res.status(201).json({ success: true, data: { checkoutUrl: session.checkoutUrl } });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const handleWebhook = async (req, res) => {
  try {
    const rawBody = req.body.toString('utf8');
    const event = verifyWebhookEvent({
      rawBody,
      signatureHeader: req.headers['paymongo-signature'],
    });

    const eventType = event.data.attributes.type;
    const checkoutSession = event.data.attributes.data;

    if (eventType !== 'checkout_session.payment.paid') {
      return res.status(200).json({ success: true, message: 'Ignored event' });
    }

    await finalizeCheckoutSession(checkoutSession);

    res.status(200).json({ success: true });
  } catch (error) {
    // PayMongo retries on non-2xx; log and ack rather than risk an infinite retry loop on a bug.
    // eslint-disable-next-line no-console
    console.error('PayMongo webhook error:', error);
    res.status(200).json({ success: false, message: 'Webhook processing failed, logged for investigation' });
  }
};

/**
 * Called by the frontend right after PayMongo redirects back to a success_url. Webhooks are the
 * primary confirmation path, but they depend on PayMongo being able to reach this server (e.g. a
 * local dev tunnel can drop); this re-checks the user's own pending checkouts directly against
 * PayMongo as a fallback so activation doesn't stall on a missed webhook delivery.
 */
const reconcilePendingPayments = async (req, res, next) => {
  try {
    const pendingResult = await query(
      `SELECT * FROM payment_intents WHERE user_id = $1 AND status = 'pending' ORDER BY created_at ASC`,
      [req.user.id]
    );

    let activated = false;
    for (const intent of pendingResult.rows) {
      if (!intent.gateway_session_id) continue;
      try {
        const checkoutSession = await getCheckoutSession(intent.gateway_session_id);
        const result = await finalizeCheckoutSession(checkoutSession);
        if (result.handled) activated = true;
      } catch (error) {
        // A stale/expired/malformed session shouldn't block reconciling the user's other pending intents.
        // eslint-disable-next-line no-console
        console.error(`Reconcile: failed to check intent ${intent.id}:`, error.message);
      }
    }

    res.json({ success: true, data: { activated } });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBookingPaymentCheckout,
  createSubscriptionCheckout,
  handleWebhook,
  reconcilePendingPayments,
};
