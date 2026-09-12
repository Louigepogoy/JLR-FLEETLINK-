const crypto = require('crypto');

const API_BASE = 'https://api.paymongo.com/v1';

const getSecretKey = () => {
  if (!process.env.PAYMONGO_SECRET_KEY) {
    const error = new Error('Online payment is not configured. Set PAYMONGO_SECRET_KEY in backend/.env.');
    error.status = 503;
    throw error;
  }
  return process.env.PAYMONGO_SECRET_KEY;
};

const authHeader = (secretKey) => `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;

/**
 * Creates a PayMongo hosted Checkout Session. Amount is in whole pesos (converted to centavos here).
 */
const createCheckoutSession = async ({ referenceNumber, amount, description, payerEmail, successUrl, cancelUrl }) => {
  const secretKey = getSecretKey();

  const res = await fetch(`${API_BASE}/checkout_sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader(secretKey),
    },
    body: JSON.stringify({
      data: {
        attributes: {
          reference_number: referenceNumber,
          description,
          line_items: [
            { name: description, amount: Math.round(amount * 100), currency: 'PHP', quantity: 1 },
          ],
          payment_method_types: ['gcash', 'card', 'paymaya'],
          billing: payerEmail ? { email: payerEmail } : undefined,
          success_url: successUrl,
          cancel_url: cancelUrl,
          send_email_receipt: false,
          show_line_items: true,
        },
      },
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    const message = json?.errors?.[0]?.detail || 'PayMongo checkout session creation failed';
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }

  return { id: json.data.id, checkoutUrl: json.data.attributes.checkout_url };
};

/**
 * Fetches a Checkout Session's current state directly from PayMongo. Used as a fallback to
 * confirm payment when the user is redirected back before/without a webhook having arrived.
 */
const getCheckoutSession = async (sessionId) => {
  const secretKey = getSecretKey();

  const res = await fetch(`${API_BASE}/checkout_sessions/${sessionId}`, {
    headers: { Authorization: authHeader(secretKey) },
  });

  const json = await res.json();
  if (!res.ok) {
    const message = json?.errors?.[0]?.detail || 'Failed to fetch PayMongo checkout session';
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }

  return json.data;
};

/**
 * Verifies a PayMongo webhook's "Paymongo-Signature" header and returns the parsed event.
 * `rawBody` must be the exact raw request body string (not a re-serialized/parsed object).
 */
const verifyWebhookEvent = ({ rawBody, signatureHeader }) => {
  if (!process.env.PAYMONGO_WEBHOOK_SECRET) {
    const error = new Error('Webhook is not configured. Set PAYMONGO_WEBHOOK_SECRET in backend/.env.');
    error.status = 503;
    throw error;
  }
  if (!signatureHeader) {
    const error = new Error('Missing Paymongo-Signature header');
    error.status = 400;
    throw error;
  }

  const parts = signatureHeader.split(',');
  if (parts.length < 3) {
    const error = new Error('Malformed Paymongo-Signature header');
    error.status = 400;
    throw error;
  }

  const timestamp = parts[0].split('=')[1];
  const testModeSignature = parts[1].split('=')[1];
  const liveModeSignature = parts[2].split('=')[1];
  const comparisonSignature = liveModeSignature || testModeSignature;

  const expected = crypto
    .createHmac('sha256', process.env.PAYMONGO_WEBHOOK_SECRET)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');

  if (expected !== comparisonSignature) {
    const error = new Error('Webhook signature verification failed');
    error.status = 401;
    throw error;
  }

  return JSON.parse(rawBody);
};

module.exports = { createCheckoutSession, getCheckoutSession, verifyWebhookEvent };
