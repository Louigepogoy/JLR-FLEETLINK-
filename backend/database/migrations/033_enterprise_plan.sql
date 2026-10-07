-- New Enterprise plan above Premium: publish up to 50 vehicles for ₱15,000/month.
ALTER TABLE owner_subscriptions DROP CONSTRAINT IF EXISTS owner_subscription_plan_check;
ALTER TABLE owner_subscriptions ADD CONSTRAINT owner_subscription_plan_check
  CHECK (plan_id IN ('basic', 'pro', 'premium', 'enterprise'));
