const { body, param, validationResult } = require('express-validator');
const { query, pool } = require('../config/db');
const { generateInvoiceNumber } = require('../utils/helpers');
const { createNotification } = require('../utils/notifications');
const { createRefund } = require('../services/paymongoService');

const RESOLUTIONS = ['refund_full', 'refund_partial', 'dismiss'];

const getDisputes = async (req, res, next) => {
  try {
    const status = req.query.status === 'all' ? null : (req.query.status || 'open');
    const result = await query(
      `SELECT d.*, b.start_date, b.end_date, b.pickup_time, b.dropoff_time, b.total_amount, b.paid_amount,
              b.payment_status, b.status AS booking_status, b.handed_over_at, b.inspected_at,
              v.id AS vehicle_id, v.title AS vehicle_title, v.brand, v.model, v.plate_number, v.images AS vehicle_images,
              c.full_name AS customer_name, c.email AS customer_email,
              o.id AS owner_id, o.full_name AS owner_name, o.email AS owner_email,
              r.full_name AS resolved_by_name
       FROM booking_disputes d
       JOIN bookings b ON d.booking_id = b.id
       JOIN vehicles v ON b.vehicle_id = v.id
       JOIN users c ON d.customer_id = c.id
       JOIN users o ON v.owner_id = o.id
       LEFT JOIN users r ON d.resolved_by = r.id
       WHERE $1::text IS NULL OR d.status = $1
       ORDER BY (d.status = 'open') DESC, d.created_at DESC`,
      [status]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

const peso = (n) => `₱${Number(n).toFixed(2)}`;
const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Sends `amount` back to the renter through PayMongo, spread over the booking's payments (newest
 * first). Each refund returns to the method that payment was made with. The platform absorbs
 * PayMongo's original transaction fee, which it doesn't return on refunds. Returns the refund ids and
 * whatever couldn't be refunded automatically (with the first error), for the admin to send manually.
 */
const sendPaymongoRefunds = async (client, bookingId, amount, notes) => {
  if (!process.env.PAYMONGO_SECRET_KEY) {
    return { refundIds: [], remaining: amount, error: 'Online payments (PayMongo) are not configured' };
  }
  const payments = await client.query(
    `SELECT id, amount, reference_number FROM payments
     WHERE booking_id = $1 AND status <> 'refunded' ORDER BY created_at DESC`,
    [bookingId]
  );

  let remaining = amount;
  const refundIds = [];
  let error = null;
  for (const payment of payments.rows) {
    if (remaining <= 0) break;
    const share = round2(Math.min(remaining, parseFloat(payment.amount)));
    if (!payment.reference_number?.startsWith('pay_')) {
      error = error || 'This payment has no PayMongo payment id to refund';
      continue;
    }
    try {
      const refund = await createRefund({ paymentId: payment.reference_number, amount: share, notes });
      refundIds.push(refund.id);
      remaining = round2(remaining - share);
    } catch (err) {
      error = error || err.message;
    }
  }
  return { refundIds, remaining, error: remaining > 0 ? (error || 'No refundable payment found') : null };
};

/**
 * Admin decision on a pickup dispute. Refunds are sent automatically through PayMongo; if that
 * isn't possible (e.g. low PayMongo balance or past the refund window) the admin can instead record
 * it as a manual refund (`manual: true`) and send the money themselves.
 * The booking was already cancelled when the renter rejected the vehicle (freeing its dates), so this
 * only decides the money:
 *  - refund_full:    all payments refunded, owner gets nothing.
 *  - refund_partial: part of the payment refunded (split between owner and platform by the original
 *                    commission rate); the rest is paid out to the owner.
 *  - dismiss:        no refund; the owner is paid out normally.
 */
const resolveDispute = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  }

  const { action, notes } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const disputeResult = await client.query(
      `SELECT d.*, b.paid_amount, v.owner_id, v.title
       FROM booking_disputes d
       JOIN bookings b ON d.booking_id = b.id
       JOIN vehicles v ON b.vehicle_id = v.id
       WHERE d.id = $1 FOR UPDATE OF d, b`,
      [req.params.id]
    );
    const d = disputeResult.rows[0];
    if (!d) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Dispute not found' });
    }
    if (d.status !== 'open') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'This dispute has already been resolved' });
    }

    const paid = parseFloat(d.paid_amount);
    let refundAmount = null;
    let disputeStatus = 'dismissed';

    if (action === 'refund_full') {
      refundAmount = paid;
      disputeStatus = 'refunded';
    } else if (action === 'refund_partial') {
      refundAmount = round2(parseFloat(req.body.amount));
      if (!(refundAmount > 0) || refundAmount >= paid) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `A partial refund must be more than ₱0 and less than the ₱${paid.toFixed(2)} paid. Use a full refund otherwise.`,
        });
      }
      disputeStatus = 'partially_refunded';
    }

    // Send the money back before recording anything. The dispute row stays locked meanwhile, so two
    // admins resolving at once can't refund twice.
    let refundMethod = null;
    let refundReference = null;
    let manualRemaining = 0;
    if (refundAmount) {
      if (req.body.manual) {
        refundMethod = 'manual';
        manualRemaining = refundAmount;
      } else {
        const result = await sendPaymongoRefunds(client, d.booking_id, refundAmount, `Pickup dispute refund: ${d.title}`);
        if (!result.refundIds.length) {
          await client.query('ROLLBACK');
          return res.status(502).json({
            success: false,
            canRefundManually: true,
            message: `Automatic refund failed: ${result.error}. Nothing was refunded or saved.`,
          });
        }
        manualRemaining = result.remaining;
        refundMethod = manualRemaining > 0 ? 'partly_manual' : 'paymongo';
        refundReference = result.refundIds.join(', ')
          + (manualRemaining > 0 ? ` — ${peso(manualRemaining)} still to send manually (${result.error})` : '');
      }
    }

    if (action === 'refund_full') {
      await client.query(`UPDATE payments SET status = 'refunded' WHERE booking_id = $1`, [d.booking_id]);
      await client.query(
        `UPDATE transactions SET status = 'refunded' WHERE booking_id = $1 AND type = 'payment'`,
        [d.booking_id]
      );
      await client.query(
        `INSERT INTO transactions (booking_id, user_id, type, total_amount, commission_amount, owner_amount,
           platform_amount, status, invoice_number, description)
         VALUES ($1, $2, 'refund', $3, 0, 0, 0, 'refunded', $4, $5)`,
        [d.booking_id, d.owner_id, refundAmount, generateInvoiceNumber(), `Full refund for ${d.title} (pickup dispute)`]
      );
      await client.query(
        `UPDATE bookings SET payment_status = 'refunded', updated_at = NOW() WHERE id = $1`,
        [d.booking_id]
      );
    } else if (action === 'refund_partial') {
      // Take the refund out of the owner's and the platform's shares in the same ratio they were
      // split when the customer paid. Negative amounts offset the owner's pending payout.
      const shares = await client.query(
        `SELECT COALESCE(SUM(total_amount), 0) AS total, COALESCE(SUM(platform_amount), 0) AS platform
         FROM transactions WHERE booking_id = $1 AND type = 'payment'`,
        [d.booking_id]
      );
      const total = parseFloat(shares.rows[0].total);
      const platformRatio = total > 0 ? parseFloat(shares.rows[0].platform) / total : 0;
      const platformPart = Math.round(refundAmount * platformRatio * 100) / 100;
      const ownerPart = Math.round((refundAmount - platformPart) * 100) / 100;
      await client.query(
        `INSERT INTO transactions (booking_id, user_id, type, total_amount, commission_amount, owner_amount,
           platform_amount, commission_percentage, status, invoice_number, description)
         VALUES ($1, $2, 'refund', $3, $4, $5, $4, $6, 'refunded', $7, $8)`,
        [
          d.booking_id, d.owner_id, refundAmount, -platformPart, -ownerPart,
          Math.round(platformRatio * 10000) / 100, generateInvoiceNumber(),
          `Partial refund for ${d.title} (pickup dispute)`,
        ]
      );
    }

    const updated = await client.query(
      `UPDATE booking_disputes SET status = $1, refund_amount = $2, admin_notes = $3,
         resolved_by = $4, resolved_at = NOW(), refund_method = $6, refund_reference = $7
       WHERE id = $5 RETURNING *`,
      [disputeStatus, refundAmount, notes?.trim() || null, req.user.id, d.id, refundMethod, refundReference]
    );
    try {
      await client.query('COMMIT');
    } catch (err) {
      // Money already went back through PayMongo but couldn't be recorded — make it traceable.
      if (refundReference) console.error(`Dispute ${d.id}: PayMongo refunds ${refundReference} sent but not saved:`, err.message);
      throw err;
    }

    const refundTiming = 'It goes back to the account you paid with: GCash/Maya within 24 hours, cards within 30 days.';
    const refundLine = !refundAmount ? ''
      : refundMethod === 'paymongo' ? `${peso(refundAmount)} has been refunded. ${refundTiming}`
        : refundMethod === 'partly_manual'
          ? `${peso(refundAmount - manualRemaining)} has been refunded. ${refundTiming} The remaining ${peso(manualRemaining)} will be sent to you separately.`
          : `A refund of ${peso(refundAmount)} will be sent to you.`;
    const customerMessage = {
      refunded: `Your dispute for ${d.title} was approved with a full refund. ${refundLine}`,
      partially_refunded: `Your dispute for ${d.title} was resolved with a partial refund. ${refundLine}`,
      dismissed: `Your dispute for ${d.title} was reviewed and closed without a refund.`,
    }[disputeStatus];
    const ownerMessage = {
      refunded: `The renter's dispute for ${d.title} ended in a full refund, so no payout will be made for this booking.`,
      partially_refunded: `The renter's dispute for ${d.title} ended in a partial refund of ${peso(refundAmount || 0)}. The rest of your earnings are now eligible for payout.`,
      dismissed: `The renter's dispute for ${d.title} was dismissed. Your earnings are now eligible for payout.`,
    }[disputeStatus];
    await createNotification(d.customer_id, 'Dispute resolved', customerMessage, 'booking', '/dashboard/bookings').catch(() => {});
    await createNotification(d.owner_id, 'Dispute resolved', ownerMessage, 'payment', '/dashboard/earnings').catch(() => {});
    if (manualRemaining > 0) {
      await createNotification(
        req.user.id,
        'Manual refund needed',
        `Send ${peso(manualRemaining)} back to the renter of ${d.title} yourself (GCash/bank). It wasn't refunded automatically.`,
        'alert',
        '/dashboard/admin/disputes'
      ).catch(() => {});
    }

    res.json({ success: true, data: updated.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally {
    client.release();
  }
};

const resolveDisputeValidation = [
  param('id').isUUID().withMessage('Invalid dispute'),
  body('action').isIn(RESOLUTIONS).withMessage('Choose full refund, partial refund, or dismiss'),
  body('amount').if(body('action').equals('refund_partial'))
    .isFloat({ gt: 0 }).withMessage('Enter the partial refund amount'),
  body('notes').optional({ values: 'falsy' }).isString().isLength({ max: 2000 }).withMessage('Notes are too long'),
  body('manual').optional().isBoolean().withMessage('Invalid manual flag').toBoolean(),
];

module.exports = { getDisputes, resolveDispute, resolveDisputeValidation };
