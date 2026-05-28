-- Run this if you already created the database from schema.sql
-- psql -d jlr_fleetlink -f backend/database/migration_user_approval.sql

DO $$ BEGIN
  CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE users ADD COLUMN IF NOT EXISTS license_number VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS license_image_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS selfie_image_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_status approval_status DEFAULT 'pending';
ALTER TABLE users ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Existing admins should stay approved
UPDATE users SET approval_status = 'approved' WHERE role = 'admin';
UPDATE users SET approval_status = 'approved' WHERE approval_status IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_approval_status ON users(approval_status);
