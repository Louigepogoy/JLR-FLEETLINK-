-- Usernames no longer have a length or character rule (only "@" is reserved for email sign-in),
-- so allow them to be as long as a full name.
ALTER TABLE users ALTER COLUMN username TYPE VARCHAR(255);
