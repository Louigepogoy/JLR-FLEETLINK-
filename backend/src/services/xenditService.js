const { Xendit } = require('xendit-node');

const getClient = () => {
  if (!process.env.XENDIT_SECRET_KEY) {
    const error = new Error('Online payment is not configured. Set XENDIT_SECRET_KEY in backend/.env.');
    error.status = 503;
    throw error;
  }
  return new Xendit({ secretKey: process.env.XENDIT_SECRET_KEY });
};

const createInvoice = async ({ externalId, amount, description, payerEmail, successRedirectUrl, failureRedirectUrl }) => {
  const client = getClient();
  return client.Invoice.createInvoice({
    data: {
      externalId,
      amount,
      description,
      payerEmail,
      currency: 'PHP',
      successRedirectUrl,
      failureRedirectUrl,
    },
  });
};

module.exports = { createInvoice };
