CREATE TABLE IF NOT EXISTS owner_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id VARCHAR(50) NOT NULL,
  plan_name VARCHAR(100) NOT NULL,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  billing_cycle VARCHAR(50) NOT NULL,
  vehicle_limit INTEGER NOT NULL,
  photo_limit INTEGER NOT NULL DEFAULT 5,
  payment_method VARCHAR(50) NOT NULL,
  payment_reference VARCHAR(100),
  card_last_four VARCHAR(4),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT owner_subscription_plan_check CHECK (plan_id IN ('basic', 'pro', 'premium')),
  CONSTRAINT owner_subscription_payment_check CHECK (payment_method IN ('trial', 'gcash', 'card')),
  CONSTRAINT owner_subscription_status_check CHECK (status IN ('active', 'cancelled', 'expired'))
);

CREATE INDEX IF NOT EXISTS idx_owner_subscriptions_owner ON owner_subscriptions(owner_id);
CREATE INDEX IF NOT EXISTS idx_owner_subscriptions_status ON owner_subscriptions(status);
