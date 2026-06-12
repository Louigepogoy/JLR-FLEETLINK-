-- Add pickup and dropoff times to bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS pickup_time TIME DEFAULT '09:00:00',
  ADD COLUMN IF NOT EXISTS dropoff_time TIME DEFAULT '17:00:00';
