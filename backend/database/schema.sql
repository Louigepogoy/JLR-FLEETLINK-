-- JLR Fleetlink Database Schema (PostgreSQL)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE vehicle_status AS ENUM ('available', 'rented', 'maintenance', 'inactive');
CREATE TYPE booking_status AS ENUM ('pending', 'approved', 'rejected', 'active', 'completed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'partially_paid', 'fully_paid', 'refunded', 'cancelled');
CREATE TYPE payment_method AS ENUM ('gcash', 'card', 'cash');
CREATE TYPE transaction_type AS ENUM ('payment', 'refund', 'commission', 'payout');
CREATE TYPE notification_type AS ENUM ('booking', 'payment', 'system', 'alert');
CREATE TYPE approval_status AS ENUM ('unverified', 'pending', 'approved', 'rejected');
CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'resolved', 'dismissed');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  role user_role NOT NULL DEFAULT 'user',
  avatar_url TEXT,
  google_id VARCHAR(255) UNIQUE,
  license_number VARCHAR(50),
  license_image_url TEXT,
  selfie_image_url TEXT,
  approval_status approval_status DEFAULT 'unverified',
  rejection_reason TEXT,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE platform_settings (
  id SERIAL PRIMARY KEY,
  commission_percentage DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  inspection_window_minutes INTEGER NOT NULL DEFAULT 60 CHECK (inspection_window_minutes BETWEEN 5 AND 1440),
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  brand VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  plate_number VARCHAR(30),
  year INTEGER NOT NULL,
  vehicle_type VARCHAR(50) NOT NULL,
  transmission VARCHAR(50) NOT NULL,
  fuel_type VARCHAR(50) NOT NULL,
  seats INTEGER NOT NULL DEFAULT 4,
  price_per_day DECIMAL(12,2) NOT NULL,
  location VARCHAR(255) NOT NULL,
  province VARCHAR(100) NOT NULL,
  city VARCHAR(100) NOT NULL,
  barangay VARCHAR(100),
  pickup_address VARCHAR(255),
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  description TEXT,
  images TEXT[] DEFAULT '{}',
  proof_photos JSONB DEFAULT '{}',
  features TEXT[] DEFAULT '{}',
  driver_available BOOLEAN NOT NULL DEFAULT false,
  driver_fee_per_day DECIMAL(12,2) NOT NULL DEFAULT 0,
  status vehicle_status DEFAULT 'available',
  verification_status VARCHAR(20) NOT NULL DEFAULT 'unreviewed',
  verification_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  pickup_time TIME DEFAULT '09:00:00',
  dropoff_time TIME DEFAULT '17:00:00',
  total_amount DECIMAL(12,2) NOT NULL,
  paid_amount DECIMAL(12,2) DEFAULT 0,
  with_driver BOOLEAN NOT NULL DEFAULT false,
  driver_fee DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_status payment_status DEFAULT 'pending',
  status booking_status DEFAULT 'pending',
  notes TEXT,
  completed_at TIMESTAMPTZ,
  -- Pickup inspection: the owner hands the vehicle over, then the customer has until
  -- inspection_deadline to accept or reject it before it is auto-accepted.
  handed_over_at TIMESTAMPTZ,
  inspection_deadline TIMESTAMPTZ,
  inspection_result VARCHAR(20) CHECK (inspection_result IN ('accepted', 'auto_accepted', 'rejected')),
  inspected_at TIMESTAMPTZ,
  inspection_reminder_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_dates CHECK (end_date >= start_date)
);

CREATE TABLE vehicle_maintenance_dates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_maintenance_dates CHECK (end_date >= start_date)
);

CREATE INDEX idx_vehicle_maintenance_dates_vehicle_id ON vehicle_maintenance_dates(vehicle_id);

CREATE TABLE ai_verification_results (
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
CREATE INDEX idx_ai_verification_results_subject ON ai_verification_results(subject_type, subject_id, created_at DESC);

CREATE TABLE verification_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_type VARCHAR(20) NOT NULL CHECK (subject_type IN ('license', 'vehicle')),
  subject_id UUID NOT NULL,
  admin_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR(30) NOT NULL CHECK (action IN ('approved', 'rejected', 'needs_more_info')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_verification_actions_subject ON verification_actions(subject_type, subject_id, created_at DESC);

CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  admin_response TEXT,
  responded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status, created_at DESC);

CREATE TABLE payment_intents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id VARCHAR(120) UNIQUE NOT NULL,
  gateway_session_id VARCHAR(100),
  purpose VARCHAR(20) NOT NULL CHECK (purpose IN ('booking_payment', 'subscription')),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired', 'failed')),
  checkout_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_payment_intents_external_id ON payment_intents(external_id);
CREATE INDEX idx_payment_intents_user ON payment_intents(user_id);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  payment_method payment_method NOT NULL,
  status payment_status DEFAULT 'pending',
  reference_number VARCHAR(100),
  card_last_four VARCHAR(4),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  type transaction_type NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  commission_amount DECIMAL(12,2) DEFAULT 0,
  owner_amount DECIMAL(12,2) DEFAULT 0,
  platform_amount DECIMAL(12,2) DEFAULT 0,
  commission_percentage DECIMAL(5,2),
  status payment_status DEFAULT 'pending',
  invoice_number VARCHAR(50) UNIQUE,
  description TEXT,
  payout_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payout_status IN ('pending', 'paid')),
  paid_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE owner_payout_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  payout_method VARCHAR(20) NOT NULL CHECK (payout_method IN ('gcash', 'bank')),
  account_name VARCHAR(255) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'unverified' CHECK (status IN ('unverified', 'verified')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE commissions (
  id SERIAL PRIMARY KEY,
  percentage DECIMAL(5,2) NOT NULL,
  set_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE owner_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id VARCHAR(50) NOT NULL,
  plan_name VARCHAR(100) NOT NULL,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  billing_cycle VARCHAR(50) NOT NULL,
  vehicle_limit INTEGER NOT NULL,
  photo_limit INTEGER NOT NULL DEFAULT 5,
  payment_method VARCHAR(50) NOT NULL,
  payment_reference VARCHAR(100),
  card_last_four VARCHAR(4),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT owner_subscription_plan_check CHECK (plan_id IN ('basic', 'pro', 'premium')),
  CONSTRAINT owner_subscription_payment_check CHECK (payment_method IN ('trial', 'gcash', 'card')),
  CONSTRAINT owner_subscription_status_check CHECK (status IN ('active', 'cancelled', 'expired'))
);

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  status report_status DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT reports_not_self CHECK (reporter_id <> reported_user_id)
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type notification_type DEFAULT 'system',
  is_read BOOLEAN DEFAULT FALSE,
  link VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_one_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_two_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT conversations_ordered_pair CHECK (user_one_id < user_two_id),
  CONSTRAINT conversations_unique_pair UNIQUE (user_one_id, user_two_id)
);
CREATE INDEX idx_conversations_user_one ON conversations(user_one_id, last_message_at DESC);
CREATE INDEX idx_conversations_user_two ON conversations(user_two_id, last_message_at DESC);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_type VARCHAR(20) NOT NULL DEFAULT 'text',
  body TEXT,
  image_url TEXT, -- file URL for both image and video messages
  latitude DECIMAL(9,6),
  longitude DECIMAL(9,6),
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  forwarded BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT messages_content_check CHECK (
    (body IS NULL OR char_length(body) <= 2000)
    AND (
      deleted_at IS NOT NULL
      OR (message_type = 'text' AND char_length(body) >= 1)
      OR (message_type IN ('image', 'video') AND image_url IS NOT NULL)
      OR (message_type = 'location' AND latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
    )
  )
);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_unread ON messages(conversation_id, sender_id) WHERE read_at IS NULL;

CREATE TABLE booking_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  reviewer_role VARCHAR(10) NOT NULL CHECK (reviewer_role IN ('customer', 'owner')),
  user_rating SMALLINT NOT NULL CHECK (user_rating BETWEEN 1 AND 5),
  vehicle_rating SMALLINT CHECK (vehicle_rating BETWEEN 1 AND 5),
  comment TEXT CHECK (comment IS NULL OR char_length(comment) <= 1000),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT booking_reviews_one_per_side UNIQUE (booking_id, reviewer_id),
  CONSTRAINT booking_reviews_vehicle_rating_by_customer CHECK (
    (reviewer_role = 'customer' AND vehicle_rating IS NOT NULL AND vehicle_id IS NOT NULL)
    OR (reviewer_role = 'owner' AND vehicle_rating IS NULL)
  )
);
CREATE INDEX idx_booking_reviews_reviewee ON booking_reviews(reviewee_id, created_at DESC);
CREATE INDEX idx_booking_reviews_vehicle ON booking_reviews(vehicle_id, created_at DESC);

-- Opened when a customer rejects the vehicle at pickup; an admin resolves it.
CREATE TABLE booking_disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (char_length(reason) BETWEEN 5 AND 2000),
  -- [{ "url": "...", "type": "image" | "video" }]
  evidence JSONB NOT NULL DEFAULT '[]',
  status VARCHAR(20) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'refunded', 'partially_refunded', 'dismissed')),
  refund_amount DECIMAL(12,2),
  -- How the refund was paid out, and the PayMongo refund ids / note on what was sent manually.
  refund_method VARCHAR(20) CHECK (refund_method IN ('paymongo', 'manual', 'partly_manual')),
  refund_reference TEXT,
  admin_notes TEXT,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_booking_disputes_status ON booking_disputes(status, created_at);

CREATE TABLE message_hidden (
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

CREATE TABLE conversation_clears (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cleared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE message_reactions (
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji VARCHAR(16) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

-- Prevent double booking: no overlapping approved/active bookings for same vehicle
CREATE OR REPLACE FUNCTION check_booking_overlap()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE vehicle_id = NEW.vehicle_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND status IN ('pending', 'approved', 'active')
      AND (NEW.start_date, NEW.end_date) OVERLAPS (start_date, end_date)
  ) THEN
    RAISE EXCEPTION 'Vehicle is already booked for the selected dates';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_overlap_check
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION check_booking_overlap();

CREATE INDEX idx_vehicles_owner ON vehicles(owner_id);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_city ON vehicles(city);
CREATE INDEX idx_vehicles_province ON vehicles(province);
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_vehicle ON bookings(vehicle_id);
CREATE INDEX idx_bookings_inspection_pending ON bookings(inspection_deadline) WHERE handed_over_at IS NOT NULL AND inspection_result IS NULL;
CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_transactions_booking ON transactions(booking_id);
CREATE INDEX idx_transactions_payout_status ON transactions(user_id, payout_status) WHERE type = 'payment';
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_users_approval_status ON users(approval_status);
CREATE INDEX idx_owner_subscriptions_owner ON owner_subscriptions(owner_id);
CREATE INDEX idx_owner_subscriptions_status ON owner_subscriptions(status);
CREATE INDEX idx_reports_reporter ON reports(reporter_id);
CREATE INDEX idx_reports_reported_user ON reports(reported_user_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_booking ON reports(booking_id);

INSERT INTO platform_settings (commission_percentage) VALUES (10.00);
