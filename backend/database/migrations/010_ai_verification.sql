-- AI-assisted verification: risk-score results and an audit trail of admin decisions
-- for both driver's-license verifications and vehicle listings.
CREATE TABLE IF NOT EXISTS ai_verification_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_type VARCHAR(20) NOT NULL CHECK (subject_type IN ('license', 'vehicle')),
  subject_id UUID NOT NULL,
  risk_score INTEGER NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
  verdict VARCHAR(20) NOT NULL,
  reasons JSONB DEFAULT '[]',
  summary TEXT,
  model VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_verification_results_subject
  ON ai_verification_results(subject_type, subject_id, created_at DESC);

CREATE TABLE IF NOT EXISTS verification_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_type VARCHAR(20) NOT NULL CHECK (subject_type IN ('license', 'vehicle')),
  subject_id UUID NOT NULL,
  admin_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR(30) NOT NULL CHECK (action IN ('approved', 'rejected', 'needs_more_info')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_verification_actions_subject
  ON verification_actions(subject_type, subject_id, created_at DESC);

-- Informational-only verification status for vehicles (does not affect vehicle_status/visibility)
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) NOT NULL DEFAULT 'unreviewed';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS verification_notes TEXT;
