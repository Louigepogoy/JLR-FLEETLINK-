-- Chat messages can now be a photo or a shared location as well as text, and users can react to them.
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type VARCHAR(20) NOT NULL DEFAULT 'text';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS latitude DECIMAL(9,6);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS longitude DECIMAL(9,6);

-- Text is optional now (a photo may have no caption), but each type must carry its own content.
ALTER TABLE messages ALTER COLUMN body DROP NOT NULL;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_body_check;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_content_check;
ALTER TABLE messages ADD CONSTRAINT messages_content_check CHECK (
  (body IS NULL OR char_length(body) <= 2000)
  AND (
    (message_type = 'text' AND char_length(body) >= 1)
    OR (message_type = 'image' AND image_url IS NOT NULL)
    OR (message_type = 'location' AND latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
  )
);

-- One reaction per user per message (reacting again with another emoji replaces it).
CREATE TABLE IF NOT EXISTS message_reactions (
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji VARCHAR(16) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);
