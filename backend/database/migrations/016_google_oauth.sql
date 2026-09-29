-- Lets a user sign in with Google instead of email/password. password_hash becomes optional
-- since a Google-only account never sets one.
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
