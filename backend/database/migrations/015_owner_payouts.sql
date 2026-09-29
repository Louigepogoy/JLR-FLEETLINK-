-- Tracks where an owner wants to receive their earnings, and whether a given payment's
-- owner_amount has actually been paid out to them yet. PayMongo's automated
-- disbursement/Platforms API requires a separate approved business account we don't have, so
-- payouts are recorded here and settled manually (e.g. admin sends GCash, then marks it paid).
CREATE TABLE IF NOT EXISTS owner_payout_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  payout_method VARCHAR(20) NOT NULL CHECK (payout_method IN ('gcash', 'bank')),
  account_name VARCHAR(255) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'unverified' CHECK (status IN ('unverified', 'verified')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payout_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payout_status IN ('pending', 'paid'));
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS paid_out_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_transactions_payout_status ON transactions(user_id, payout_status) WHERE type = 'payment';
