-- Add Cebu-only pickup fields for existing Neon PostgreSQL databases.

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS barangay VARCHAR(100),
  ADD COLUMN IF NOT EXISTS pickup_address VARCHAR(255),
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7);

UPDATE vehicles
SET
  city = CASE
    WHEN COALESCE(city, location) IN (
      'Cebu City',
      'Mandaue City',
      'Lapu-Lapu City',
      'Talisay City',
      'Toledo City',
      'Minglanilla',
      'Consolacion',
      'Cordova',
      'Carcar',
      'Naga Cebu',
      'Other Cebu municipalities'
    ) THEN COALESCE(city, location)
    ELSE 'Other Cebu municipalities'
  END,
  location = CASE
    WHEN COALESCE(city, location) IN (
      'Cebu City',
      'Mandaue City',
      'Lapu-Lapu City',
      'Talisay City',
      'Toledo City',
      'Minglanilla',
      'Consolacion',
      'Cordova',
      'Carcar',
      'Naga Cebu',
      'Other Cebu municipalities'
    ) THEN COALESCE(city, location)
    ELSE 'Other Cebu municipalities'
  END,
  pickup_address = COALESCE(pickup_address, location, 'Cebu pickup area'),
  latitude = COALESCE(latitude, 10.3157000),
  longitude = COALESCE(longitude, 123.8854000)
WHERE city IS NULL
   OR city NOT IN (
      'Cebu City',
      'Mandaue City',
      'Lapu-Lapu City',
      'Talisay City',
      'Toledo City',
      'Minglanilla',
      'Consolacion',
      'Cordova',
      'Carcar',
      'Naga Cebu',
      'Other Cebu municipalities'
   )
   OR pickup_address IS NULL
   OR latitude IS NULL
   OR longitude IS NULL;

ALTER TABLE vehicles
  ALTER COLUMN city SET NOT NULL,
  ALTER COLUMN latitude SET NOT NULL,
  ALTER COLUMN longitude SET NOT NULL;

ALTER TABLE vehicles
  DROP CONSTRAINT IF EXISTS vehicles_cebu_city_check;

ALTER TABLE vehicles
  ADD CONSTRAINT vehicles_cebu_city_check CHECK (
    city IN (
      'Cebu City',
      'Mandaue City',
      'Lapu-Lapu City',
      'Talisay City',
      'Toledo City',
      'Minglanilla',
      'Consolacion',
      'Cordova',
      'Carcar',
      'Naga Cebu',
      'Other Cebu municipalities'
    )
  );

CREATE INDEX IF NOT EXISTS idx_vehicles_city ON vehicles(city);
