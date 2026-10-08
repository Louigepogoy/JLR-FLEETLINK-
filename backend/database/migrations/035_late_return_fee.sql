-- Late return fee. When the owner marks a rental returned after the agreed drop-off time, the renter
-- owes (daily price / 24) for every started hour late. The fee is added to total_amount, so the
-- renter pays it through the normal booking payment flow.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS late_hours INTEGER NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS late_fee DECIMAL(12,2) NOT NULL DEFAULT 0;

-- A paid late fee pays the owner right away (the trip is already over); record why.
ALTER TABLE owner_payouts DROP CONSTRAINT IF EXISTS owner_payouts_source_check;
ALTER TABLE owner_payouts ADD CONSTRAINT owner_payouts_source_check
  CHECK (source IN ('accepted', 'auto_accepted', 'dispute', 'account_added', 'manual', 'legacy', 'late_fee'));
