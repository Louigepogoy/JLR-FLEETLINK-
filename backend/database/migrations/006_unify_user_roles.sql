-- Collapse 'customer' and 'owner' into a single 'user' role; only 'admin' remains distinct
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'owner'
  ) THEN
    ALTER TABLE users ALTER COLUMN role DROP DEFAULT;
    CREATE TYPE user_role_new AS ENUM ('user', 'admin');
    ALTER TABLE users ALTER COLUMN role TYPE user_role_new
      USING (CASE WHEN role::text = 'admin' THEN 'admin' ELSE 'user' END)::user_role_new;
    DROP TYPE user_role;
    ALTER TYPE user_role_new RENAME TO user_role;
    ALTER TABLE users ALTER COLUMN role SET DEFAULT 'user';
  END IF;
END $$;
