-- When each user last opened a sidebar page or their notifications. Sidebar badges and the
-- notification bell count only what is new since then, so a badge disappears once it's been seen.
CREATE TABLE IF NOT EXISTS user_seen_markers (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- A sidebar path such as '/dashboard/admin/bookings', or 'notifications' for the bell.
  marker_key VARCHAR(100) NOT NULL,
  seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, marker_key)
);
