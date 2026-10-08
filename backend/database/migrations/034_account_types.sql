-- Separate customer and owner accounts. New sign-ups choose one: a customer can book vehicles,
-- an owner can list them. Accounts that existed before this split keep doing both ('both').
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type VARCHAR(20) NOT NULL DEFAULT 'both';
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_account_type_check;
ALTER TABLE users ADD CONSTRAINT users_account_type_check CHECK (account_type IN ('customer', 'owner', 'both'));

-- Owner verification: optional business proof (DTI, Mayor's/Business Permit) for owners who rent
-- out as a business. Individual owners only need their driver's license and selfie.
ALTER TABLE users ADD COLUMN IF NOT EXISTS business_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS business_proof_url TEXT;
