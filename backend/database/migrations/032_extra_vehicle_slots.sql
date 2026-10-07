-- Premium owners can buy extra vehicle slots (₱500 each) on top of the plan's 20-vehicle limit.
-- Purchased slots are added to the active subscription's vehicle_limit and tracked here for display.
ALTER TABLE owner_subscriptions ADD COLUMN IF NOT EXISTS extra_vehicle_slots INTEGER NOT NULL DEFAULT 0;

ALTER TABLE payment_intents DROP CONSTRAINT IF EXISTS payment_intents_purpose_check;
ALTER TABLE payment_intents ADD CONSTRAINT payment_intents_purpose_check
  CHECK (purpose IN ('booking_payment', 'subscription', 'vehicle_slots'));
