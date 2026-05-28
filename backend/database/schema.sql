-- JLR Fleetlink Database Schema (PostgreSQL)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_role AS ENUM ('customer', 'owner', 'admin');
CREATE TYPE vehicle_status AS ENUM ('available', 'rented', 'maintenance', 'inactive');
CREATE TYPE booking_status AS ENUM ('pending', 'approved', 'rejected', 'active', 'completed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'partially_paid', 'fully_paid', 'refunded', 'cancelled');
CREATE TYPE payment_method AS ENUM ('gcash', 'card', 'cash');
CREATE TYPE transaction_type AS ENUM ('payment', 'refund', 'commission', 'payout');
CREATE TYPE notification_type AS ENUM ('booking', 'payment', 'system', 'alert');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  role user_role NOT NULL DEFAULT 'customer',
  avatar_url TEXT,
  license_number VARCHAR(50),
  license_image_url TEXT,
  selfie_image_url TEXT,
  approval_status approval_status DEFAULT 'pending',
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
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  brand VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  year INTEGER NOT NULL,
  vehicle_type VARCHAR(50) NOT NULL,
  transmission VARCHAR(50) NOT NULL,
  fuel_type VARCHAR(50) NOT NULL,
  seats INTEGER NOT NULL DEFAULT 4,
  price_per_day DECIMAL(12,2) NOT NULL,
  location VARCHAR(255) NOT NULL,
  description TEXT,
  images TEXT[] DEFAULT '{}',
  features TEXT[] DEFAULT '{}',
  status vehicle_status DEFAULT 'available',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  paid_amount DECIMAL(12,2) DEFAULT 0,
  payment_status payment_status DEFAULT 'pending',
  status booking_status DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_dates CHECK (end_date >= start_date)
);

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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE commissions (
  id SERIAL PRIMARY KEY,
  percentage DECIMAL(5,2) NOT NULL,
  set_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
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
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_vehicle ON bookings(vehicle_id);
CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_transactions_booking ON transactions(booking_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_users_approval_status ON users(approval_status);

INSERT INTO platform_settings (commission_percentage) VALUES (10.00);
