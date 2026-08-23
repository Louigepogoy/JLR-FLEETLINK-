const { query } = require('../config/db');
const { createInvoice } = require('../services/xenditService');
const { finalizeBookingPayment } = require('./paymentController');
const { PLANS, activateSubscription } = require('./subscriptionController');
const { createNotification } = require('../utils/notifications');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const mapXenditChannelToPaymentMethod = (callback) => {
  if (callback.payment_channel === 'GCASH' || callback.ewallet_type === 'GCASH') return 'gcash';
  if (callback.payment_method === 'CREDIT_CARD') return 'card';
  return 'gcash';
};

const createBookingPaymentInvoice = async (req, res, next) => {
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

    const invoice = await createInvoice({
      externalId,
      amount,
      description: `Payment for ${booking.title}`,
      payerEmail: req.user.email,
      successRedirectUrl: `${FRONTEND_URL}/dashboard/bookings?payment=success`,
      failureRedirectUrl: `${FRONTEND_URL}/dashboard/bookings?payment=failed`,
    });

    await query(
      `INSERT INTO payment_intents (external_id, xendit_invoice_id, purpose, user_id, amount, payload, invoice_url)
       VALUES ($1, $2, 'booking_payment', $3, $4, $5, $6)`,
      [externalId, invoice.id, req.user.id, amount, JSON.stringify({ bookingId }), invoice.invoiceUrl]
    );

    res.status(201).json({ success: true, data: { invoiceUrl: invoice.invoiceUrl } });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const createSubscriptionInvoice = async (req, res, next) => {
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

    const invoice = await createInvoice({
      externalId,
      amount: plan.price,
      description: `${plan.name} subscription - JLR Fleetlink`,
      payerEmail: req.user.email,
      successRedirectUrl: `${FRONTEND_URL}/dashboard/subscription?payment=success`,
      failureRedirectUrl: `${FRONTEND_URL}/dashboard/subscription?payment=failed`,
    });

    await query(
      `INSERT INTO payment_intents (external_id, xendit_invoice_id, purpose, user_id, amount, payload, invoice_url)
       VALUES ($1, $2, 'subscription', $3, $4, $5, $6)`,
      [externalId, invoice.id, req.user.id, plan.price, JSON.stringify({ planId }), invoice.invoiceUrl]
    );

    res.status(201).json({ success: true, data: { invoiceUrl: invoice.invoiceUrl } });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const handleWebhook = async (req, res) => {
  try {
    const token = req.headers['x-callback-token'];
    if (!process.env.XENDIT_WEBHOOK_TOKEN || token !== process.env.XENDIT_WEBHOOK_TOKEN) {
      return res.status(401).json({ success: false, message: 'Invalid webhook token' });
    }

    const callback = req.body;
    const externalId = callback.external_id;
    const status = callback.status;

    const intentResult = await query(
      'SELECT * FROM payment_intents WHERE external_id = $1',
      [externalId]
    );
    const intent = intentResult.rows[0];

    if (!intent) {
      // Not one of ours (or already deleted) — acknowledge so Xendit stops retrying.
      return res.status(200).json({ success: true, message: 'Ignored: unknown external_id' });
    }
    if (intent.status === 'paid') {
      // Already processed (Xendit may resend webhooks) — acknowledge without reprocessing.
      return res.status(200).json({ success: true, message: 'Already processed' });
    }

    if (status === 'PAID' || status === 'SETTLED') {
      await query(`UPDATE payment_intents SET status = 'paid', updated_at = NOW() WHERE id = $1`, [intent.id]);

      const paymentMethod = mapXenditChannelToPaymentMethod(callback);
      const referenceNumber = callback.payment_id || callback.id;

      if (intent.purpose === 'booking_payment') {
        await finalizeBookingPayment({
          bookingId: intent.payload.bookingId,
          amount: parseFloat(intent.amount),
          paymentMethod,
          referenceNumber,
          metadata: { xenditInvoiceId: callback.id, channel: callback.payment_channel },
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
    } else if (status === 'EXPIRED') {
      await query(`UPDATE payment_intents SET status = 'expired', updated_at = NOW() WHERE id = $1`, [intent.id]);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    // Xendit retries on non-2xx, but we don't want infinite retries on a bug — log and ack.
    // eslint-disable-next-line no-console
    console.error('Xendit webhook error:', error);
    res.status(200).json({ success: false, message: 'Webhook processing failed, logged for investigation' });
  }
};

module.exports = { createBookingPaymentInvoice, createSubscriptionInvoice, handleWebhook };
