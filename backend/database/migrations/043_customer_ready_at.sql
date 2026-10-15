-- The renter confirms they're at the pickup ("I'm here / Ready for pickup"); until then the owner can't
-- hand the vehicle over (the automatic handover still happens a few hours after the pickup time).
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_ready_at TIMESTAMPTZ;
