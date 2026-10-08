-- Cash at pickup. A cash booking is confirmed by an online reservation fee (at least the platform
-- commission); the rest is paid in cash to the owner at pickup, who records it when handing over.
--   payment_option: 'online' (pay everything online) or 'cash' (reservation online + cash at pickup)
--   cash_due:       cash still to collect at pickup (0 once collected)
--   cash_collected: cash the owner has recorded as received (never refunded through PayMongo)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_option VARCHAR(10) NOT NULL DEFAULT 'online';
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_payment_option_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_payment_option_check CHECK (payment_option IN ('online', 'cash'));
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cash_due DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cash_collected DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cash_collected_at TIMESTAMPTZ;
