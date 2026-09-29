-- Expands the platform from Cebu only to the whole Philippines: vehicles now record their province
-- (validated in the API against backend/src/data/ph-provinces.json) and any city or municipality.
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS province VARCHAR(100);
-- Dropped first: it only allows the old Cebu city names, which the renames below would violate.
ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_cebu_city_check;

-- Every existing listing was in Cebu.
UPDATE vehicles SET province = 'Cebu' WHERE province IS NULL;
UPDATE vehicles SET city = 'Naga City' WHERE city = 'Naga Cebu';
UPDATE vehicles SET city = 'Carcar City' WHERE city = 'Carcar';
UPDATE vehicles SET city = 'Cebu (other municipality)' WHERE city = 'Other Cebu municipalities';

ALTER TABLE vehicles ALTER COLUMN province SET NOT NULL;

-- `location` is the human-readable place used by search and older screens.
UPDATE vehicles SET location = city || ', ' || province WHERE location IS DISTINCT FROM city || ', ' || province;

CREATE INDEX IF NOT EXISTS idx_vehicles_province ON vehicles(province);
