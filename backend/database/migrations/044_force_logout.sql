-- Admin "force logout": tokens issued before this moment are rejected by the auth middleware.
ALTER TABLE users ADD COLUMN IF NOT EXISTS sessions_invalidated_at TIMESTAMPTZ;
