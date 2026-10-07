-- Sign-in lockout: after 5 wrong passwords in a row the account is locked for 15 minutes.
-- A successful sign-in or a password reset clears the counter.
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;
