-- Dispute refunds are now sent automatically through PayMongo when possible. Record how each refund
-- was actually paid out: 'paymongo' (fully refunded via the API), 'manual' (admin sends it
-- themselves), or 'partly_manual' (PayMongo refunded part of it; the admin sends the rest).
ALTER TABLE booking_disputes ADD COLUMN IF NOT EXISTS refund_method VARCHAR(20)
  CHECK (refund_method IN ('paymongo', 'manual', 'partly_manual'));
-- PayMongo refund ids (comma-separated) and/or a note about what still has to be sent manually.
ALTER TABLE booking_disputes ADD COLUMN IF NOT EXISTS refund_reference TEXT;
