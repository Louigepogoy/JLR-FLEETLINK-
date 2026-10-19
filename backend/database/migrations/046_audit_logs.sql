-- Central audit trail of admin actions (who did what to whom, with before/after values).
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  admin_name VARCHAR(255),
  action VARCHAR(50) NOT NULL,
  target_type VARCHAR(30),
  target_id UUID,
  target_label VARCHAR(255),
  details JSONB,
  ip_address VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
