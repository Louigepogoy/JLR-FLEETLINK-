-- Runs after 007 (in a separate transaction, once 'unverified' is committed).
ALTER TABLE users ALTER COLUMN approval_status SET DEFAULT 'unverified';

-- Any leftover accounts stuck pending from the old registration-gate flow become
-- normal active accounts that simply haven't verified yet.
UPDATE users SET approval_status = 'unverified', is_active = true
WHERE approval_status = 'pending' AND is_active = false;
