-- Demo accounts (run after schema.sql)
-- Passwords: Admin@123 | Owner@123 | Customer@123

INSERT INTO users (
  id, email, password_hash, full_name, phone, role,
  license_number, approval_status, is_active
) VALUES
(
  'a0000000-0000-0000-0000-000000000001',
  'admin@jlrfleetlink.com',
  '$2b$12$sVn4BhiOXwtYsMrPK.I9n.tEC6QYXjDN7DMrU4C2NJb0.oIVW.MNq',
  'System Administrator',
  '+639171000001',
  'admin',
  NULL,
  'approved',
  TRUE
),
(
  'a0000000-0000-0000-0000-000000000002',
  'owner@jlrfleetlink.com',
  '$2b$12$EtnvKsCofkqnidwoJD9jkuHaRp8fWsB7alLmSsKlb5pAETjKBqBjK',
  'Juan Dela Cruz',
  '+639181000002',
  'user',
  'N01-12-345678',
  'approved',
  TRUE
),
(
  'a0000000-0000-0000-0000-000000000003',
  'customer@jlrfleetlink.com',
  '$2b$12$0qRrsW1yRmsZMaD6xymRMOqZ3cZD1Ed5y0Xf8x8G/059m8bENpPje',
  'Maria Santos',
  '+639191000003',
  'user',
  'N02-98-765432',
  'approved',
  TRUE
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  approval_status = 'approved',
  is_active = TRUE;
