-- Escrow-style pickup inspection. The customer's payment stays with the platform until the customer
-- accepts the vehicle at pickup (or the inspection window runs out and it is auto-accepted). Only then
-- does the owner's share become eligible for payout. Rejecting the vehicle opens a dispute that an
-- admin resolves with a full refund, a partial refund, or a dismissal.

ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS inspection_window_minutes INTEGER NOT NULL DEFAULT 60
  CHECK (inspection_window_minutes BETWEEN 5 AND 1440);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS handed_over_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS inspection_deadline TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS inspection_result VARCHAR(20)
  CHECK (inspection_result IN ('accepted', 'auto_accepted', 'rejected'));
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS inspected_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS inspection_reminder_sent BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_bookings_inspection_pending
  ON bookings(inspection_deadline) WHERE handed_over_at IS NOT NULL AND inspection_result IS NULL;

CREATE TABLE IF NOT EXISTS booking_disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (char_length(reason) BETWEEN 5 AND 2000),
  -- [{ "url": "...", "type": "image" | "video" }]
  evidence JSONB NOT NULL DEFAULT '[]',
  status VARCHAR(20) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'refunded', 'partially_refunded', 'dismissed')),
  refund_amount DECIMAL(12,2),
  admin_notes TEXT,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_booking_disputes_status ON booking_disputes(status, created_at);

-- Bookings that were already picked up before this feature existed count as accepted, so their
-- owners' pending payouts aren't frozen.
UPDATE bookings SET inspection_result = 'accepted', inspected_at = COALESCE(updated_at, NOW())
WHERE status IN ('active', 'completed') AND inspection_result IS NULL;
