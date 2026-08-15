-- Owner-defined maintenance date ranges that block new bookings for a vehicle
CREATE TABLE IF NOT EXISTS vehicle_maintenance_dates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_maintenance_dates CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_dates_vehicle_id
  ON vehicle_maintenance_dates(vehicle_id);
