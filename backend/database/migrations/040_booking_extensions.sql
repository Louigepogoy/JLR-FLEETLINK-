-- Extend a rental by hours while it is in use. The renter pays for the added hours (online, or an online
-- reservation share + cash to the owner for cash bookings); once paid, the booking's end_date/dropoff_time
-- move forward and the owner is notified. Every extension is kept in booking_extensions so the renter,
-- the owner and later renters can see how long the vehicle was extended and until when.
--   bookings.extended_hours:  total hours added by extensions
--   bookings.extension_fee:   total price of those hours (included in total_amount)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS extended_hours INTEGER NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS extension_fee DECIMAL(12,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS booking_extensions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  hours INTEGER NOT NULL CHECK (hours > 0),
  amount DECIMAL(12,2) NOT NULL,
  online_amount DECIMAL(12,2) NOT NULL,
  previous_end_date DATE NOT NULL,
  previous_dropoff_time TIME NOT NULL,
  new_end_date DATE NOT NULL,
  new_dropoff_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_booking_extensions_booking ON booking_extensions(booking_id);

ALTER TABLE payment_intents DROP CONSTRAINT IF EXISTS payment_intents_purpose_check;
ALTER TABLE payment_intents ADD CONSTRAINT payment_intents_purpose_check
  CHECK (purpose IN ('booking_payment', 'subscription', 'vehicle_slots', 'booking_extension'));
