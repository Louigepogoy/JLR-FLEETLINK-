-- Walk-in rentals reported by owners reuse the date-block table, with the renter's name and proof photo.
ALTER TABLE vehicle_maintenance_dates ADD COLUMN IF NOT EXISTS block_type VARCHAR(20) NOT NULL DEFAULT 'maintenance';
ALTER TABLE vehicle_maintenance_dates DROP CONSTRAINT IF EXISTS vehicle_block_type_check;
ALTER TABLE vehicle_maintenance_dates ADD CONSTRAINT vehicle_block_type_check CHECK (block_type IN ('maintenance', 'walk_in'));
ALTER TABLE vehicle_maintenance_dates ADD COLUMN IF NOT EXISTS renter_name VARCHAR(255);
ALTER TABLE vehicle_maintenance_dates ADD COLUMN IF NOT EXISTS proof_url TEXT;
