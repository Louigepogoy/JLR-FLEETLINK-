const crypto = require('crypto');
const { query, pool } = require('../config/db');
const { createNotification } = require('../utils/notifications');

const peso = (n) => `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const maskAccount = (number) => `••••${String(number).slice(-4)}`;
// e.g. PO-261007-7F3A9C
const payoutReference = () => {
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date()).replace(/-/g, '').slice(2);
  return `PO-${date}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
};

/**
 * Pays out everything an owner is currently owed and records it in owner_payouts (the admin's payout
 * history). `source` says what triggered it: 'accepted', 'auto_accepted', 'dispute', 'account_added', 'late_fee',
 * or 'manual' (admin, with `paidBy`). Returns { paid, payout } — paid is 0 when nothing was owed.
 *
 * The payable transactions are claimed with one UPDATE inside a transaction, so two triggers at the
 * same moment can't pay the same earnings twice.
 */
const recordPayout = async ({ ownerId, source, paidBy = null }) => {
  // Required here, not at the top: transactionController loads inspectionService, which loads this.
  const { PAYABLE_SQL } = require('../controllers/transactionController');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const claimed = await client.query(
      `UPDATE transactions t SET payout_status = 'paid', paid_out_at = NOW()
       WHERE t.user_id = $1 AND ${PAYABLE_SQL}
       RETURNING t.id, t.owner_amount`,
      [ownerId]
    );
    const total = Math.round(claimed.rows.reduce((sum, r) => sum + parseFloat(r.owner_amount), 0) * 100) / 100;
    if (!claimed.rows.length) {
      await client.query('ROLLBACK');
      return { paid: 0, payout: null };
    }
    const account = (await client.query('SELECT * FROM owner_payout_accounts WHERE owner_id = $1', [ownerId])).rows[0];
    const payout = (await client.query(
      `INSERT INTO owner_payouts (owner_id, amount, payout_method, account_name, account_number, source, reference, paid_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [ownerId, total, account?.payout_method || null, account?.account_name || null, account?.account_number || null,
        source, payoutReference(), paidBy]
    )).rows[0];
    await client.query('UPDATE transactions SET payout_id = $1 WHERE id = ANY($2::uuid[])', [payout.id, claimed.rows.map((r) => r.id)]);
    await client.query('COMMIT');
    return { paid: total, payout, account };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Automatic (simulated) owner payout. As soon as an owner's earnings become payable — the renter
 * accepted the vehicle, it was auto-accepted, or a dispute closed without a full refund — they are
 * sent to the owner's saved GCash/bank account, recorded in the payout history, and the owner is
 * notified.
 *
 * No real money moves: PayMongo's disbursement/transfer feature needs a separately approved business
 * account, so this records the payout the same way the admin's "Mark as Paid" does. Owners without a
 * payout account keep the amount pending until they save one (see savePayoutAccount).
 *
 * Never throws: a payout problem must not undo the accept/resolve that triggered it.
 */
const autoPayoutOwner = async (ownerId, source) => {
  try {
    const { PAYABLE_SQL } = require('../controllers/transactionController');
    const account = await query('SELECT 1 FROM owner_payout_accounts WHERE owner_id = $1', [ownerId]);
    if (!account.rows[0]) {
      const owed = await query(
        `SELECT COALESCE(SUM(t.owner_amount), 0) AS amount FROM transactions t WHERE t.user_id = $1 AND ${PAYABLE_SQL}`,
        [ownerId]
      );
      const amount = parseFloat(owed.rows[0].amount);
      if (amount > 0) {
        await createNotification(
          ownerId,
          'Add a payout account to get paid',
          `You have ${peso(amount)} ready to be sent to you. Add your GCash or bank account in Earnings and it will be sent automatically.`,
          'payment',
          '/dashboard/earnings'
        ).catch(() => {});
      }
      return { paid: 0, reason: 'no_account' };
    }

    const { paid, payout, account: acct } = await recordPayout({ ownerId, source });
    if (paid > 0) {
      const where = acct.payout_method === 'gcash' ? 'GCash' : 'bank account';
      await createNotification(
        ownerId,
        `${peso(paid)} sent to your ${where}`,
        `Your earnings of ${peso(paid)} were sent to your ${where} ${maskAccount(acct.account_number)} (${acct.account_name}). Reference: ${payout.reference}.`,
        'payment',
        '/dashboard/earnings'
      ).catch(() => {});
    }
    return { paid };
  } catch (error) {
    console.error('Auto payout failed:', error.message);
    return { paid: 0, reason: 'error' };
  }
};

module.exports = { autoPayoutOwner, recordPayout };
