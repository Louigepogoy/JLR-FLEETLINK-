-- Deleting a vehicle that was ever booked keeps its row (hidden everywhere) so its booking history is
-- preserved and it still counts toward the owner's plan vehicle limit. Otherwise an owner could delete a
-- rented listing and re-create it to free a slot or erase its record.
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_vehicles_deleted_at ON vehicles(deleted_at) WHERE deleted_at IS NOT NULL;
