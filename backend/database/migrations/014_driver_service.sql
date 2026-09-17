-- Lets an owner offer a driver for their vehicle at a per-day fee, and lets a customer
-- choose "with driver" at booking time for an additional charge on top of the daily rate.
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS driver_available BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS driver_fee_per_day DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS with_driver BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS driver_fee DECIMAL(12,2) NOT NULL DEFAULT 0;
