-- Adds the pickup-location columns for older databases. This originally restricted vehicles to Cebu
-- (a city CHECK constraint and a rewrite of non-Cebu cities); that was lifted in
-- migrations/021_philippines_locations.sql, so this file now only adds missing columns and fills
-- blanks — it must never overwrite a location, because setup-database.js re-runs it every time.

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS barangay VARCHAR(100),
  ADD COLUMN IF NOT EXISTS pickup_address VARCHAR(255),
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7);

UPDATE vehicles
SET
  city = COALESCE(city, location),
  latitude = COALESCE(latitude, 10.3157000),
  longitude = COALESCE(longitude, 123.8854000)
WHERE city IS NULL OR latitude IS NULL OR longitude IS NULL;

ALTER TABLE vehicles
  ALTER COLUMN city SET NOT NULL,
  ALTER COLUMN latitude SET NOT NULL,
  ALTER COLUMN longitude SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vehicles_city ON vehicles(city);
