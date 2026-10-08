-- Rental agreement: the renter must accept it (typing their full name as a signature) before booking.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS agreement_signed_name VARCHAR(255);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS agreement_signed_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS agreement_version VARCHAR(20);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS agreement_ip VARCHAR(64);
