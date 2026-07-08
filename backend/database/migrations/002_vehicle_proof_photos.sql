-- Structured vehicle proof photos (6 required slots for owner verification)
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS proof_photos JSONB DEFAULT '{}';
