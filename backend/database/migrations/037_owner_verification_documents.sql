-- Owner verification now requires business proof and the OR/CR of a vehicle they own, on top of the
-- driver's license and selfie. Customers still only need the license and selfie.
ALTER TABLE users ADD COLUMN IF NOT EXISTS business_proof_type VARCHAR(30);
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_business_proof_type_check;
ALTER TABLE users ADD CONSTRAINT users_business_proof_type_check
  CHECK (business_proof_type IS NULL OR business_proof_type IN ('dti', 'mayors_permit', 'sec', 'bir_2303'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS owner_or_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS owner_cr_url TEXT;
