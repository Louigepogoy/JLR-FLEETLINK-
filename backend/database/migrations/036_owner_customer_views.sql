-- Read-only views that split users into owners and customers, so each group can be browsed on its own
-- (e.g. in the Neon console: SELECT * FROM owners). The data stays in the users table, which the app
-- uses for login, bookings, chat, payments, etc.; these views just filter it and add a few totals.
-- Accounts from before the customer/owner split ('both') appear in both views. No passwords.

DROP VIEW IF EXISTS owners;
CREATE VIEW owners AS
SELECT
  u.id, u.full_name, u.username, u.email, u.phone, u.account_type,
  u.approval_status AS verification_status, u.license_number,
  u.business_name, u.business_proof_url IS NOT NULL AS has_business_proof,
  u.is_active, u.created_at,
  (SELECT COUNT(*)::int FROM vehicles v WHERE v.owner_id = u.id) AS vehicles_listed,
  (SELECT s.plan_name FROM owner_subscriptions s
    WHERE s.owner_id = u.id AND s.status = 'active' AND (s.ends_at IS NULL OR s.ends_at > NOW())
    ORDER BY s.created_at DESC LIMIT 1) AS current_plan,
  (SELECT COUNT(*)::int FROM bookings b JOIN vehicles v ON v.id = b.vehicle_id
    WHERE v.owner_id = u.id AND b.status IN ('approved', 'active', 'completed')) AS times_rented_out,
  (SELECT COALESCE(SUM(t.owner_amount), 0) FROM transactions t
    WHERE t.user_id = u.id AND t.type = 'payment') AS total_earnings
FROM users u
WHERE u.role = 'user' AND u.account_type IN ('owner', 'both');

DROP VIEW IF EXISTS customers;
CREATE VIEW customers AS
SELECT
  u.id, u.full_name, u.username, u.email, u.phone, u.account_type,
  u.approval_status AS verification_status, u.license_number,
  u.is_active, u.created_at,
  (SELECT COUNT(*)::int FROM bookings b WHERE b.customer_id = u.id) AS bookings_made,
  (SELECT COUNT(*)::int FROM bookings b
    WHERE b.customer_id = u.id AND b.status IN ('approved', 'active', 'completed')) AS times_rented,
  (SELECT COALESCE(SUM(b.paid_amount), 0) FROM bookings b WHERE b.customer_id = u.id) AS total_spent,
  (SELECT COALESCE(SUM(b.late_fee), 0) FROM bookings b WHERE b.customer_id = u.id) AS late_fees
FROM users u
WHERE u.role = 'user' AND u.account_type IN ('customer', 'both');
