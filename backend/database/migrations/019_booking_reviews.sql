-- Ratings after a completed rental (like ride/food apps): the customer rates the vehicle and the owner,
-- and the owner rates the customer. One review per side per booking.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS booking_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Set only on the customer's review, so vehicle averages can be computed per listing.
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
CREATE INDEX IF NOT EXISTS idx_booking_reviews_reviewee ON booking_reviews(reviewee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_reviews_vehicle ON booking_reviews(vehicle_id, created_at DESC);
