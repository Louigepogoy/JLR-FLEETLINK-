-- Tracks Xendit invoices we've created, so the webhook can find what to finalize
-- once payment is confirmed (a booking payment amount, or a subscription plan purchase).
CREATE TABLE IF NOT EXISTS payment_intents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id VARCHAR(120) UNIQUE NOT NULL,
  xendit_invoice_id VARCHAR(100),
  purpose VARCHAR(20) NOT NULL CHECK (purpose IN ('booking_payment', 'subscription')),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired', 'failed')),
  invoice_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payment_intents_external_id ON payment_intents(external_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_user ON payment_intents(user_id);
