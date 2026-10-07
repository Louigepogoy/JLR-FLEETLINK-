-- A record of every owner payout, automatic or manual, for the admin's payout history. Each paid
-- transaction points at the payout that sent it.
CREATE TABLE IF NOT EXISTS owner_payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  amount DECIMAL(12,2) NOT NULL,
  -- Where it was sent (copied at payout time; null for a manual payout to an owner with no account).
  payout_method VARCHAR(20),
  account_name VARCHAR(255),
  account_number VARCHAR(50),
  -- What triggered it: renter accepted, inspection time ran out, dispute closed, owner added a payout
  -- account, admin marked it paid, or a payout made before this history existed.
  source VARCHAR(20) NOT NULL
    CHECK (source IN ('accepted', 'auto_accepted', 'dispute', 'account_added', 'manual', 'legacy')),
  reference VARCHAR(40) NOT NULL UNIQUE,
  paid_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_owner_payouts_created ON owner_payouts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_owner_payouts_owner ON owner_payouts(owner_id, created_at DESC);

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payout_id UUID REFERENCES owner_payouts(id) ON DELETE SET NULL;

-- Payouts made before this table existed: one 'legacy' record per owner per payout time.
WITH g AS (
  SELECT user_id, paid_out_at, SUM(owner_amount) AS amount
  FROM transactions
  WHERE payout_status = 'paid' AND payout_id IS NULL AND paid_out_at IS NOT NULL AND user_id IS NOT NULL
  GROUP BY user_id, paid_out_at
), ins AS (
  INSERT INTO owner_payouts (owner_id, amount, payout_method, account_name, account_number, source, reference, created_at)
  SELECT g.user_id, g.amount, a.payout_method, a.account_name, a.account_number, 'legacy',
         'PO-' || UPPER(SUBSTR(MD5(g.user_id::text || g.paid_out_at::text), 1, 10)), g.paid_out_at
  FROM g LEFT JOIN owner_payout_accounts a ON a.owner_id = g.user_id
  ON CONFLICT (reference) DO NOTHING
  RETURNING id, owner_id, created_at
)
UPDATE transactions t SET payout_id = ins.id
FROM ins
WHERE t.user_id = ins.owner_id AND t.paid_out_at = ins.created_at AND t.payout_status = 'paid' AND t.payout_id IS NULL;
