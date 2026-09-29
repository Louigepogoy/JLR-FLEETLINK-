-- Messenger-style chat actions: reply to a message, forward it, unsend it (for everyone),
-- remove it just for yourself, and delete a whole conversation from your own list.
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS forwarded BOOLEAN NOT NULL DEFAULT false;
-- Set when the sender unsends; the content columns are wiped at the same time.
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_content_check;
ALTER TABLE messages ADD CONSTRAINT messages_content_check CHECK (
  (body IS NULL OR char_length(body) <= 2000)
  AND (
    deleted_at IS NOT NULL
    OR (message_type = 'text' AND char_length(body) >= 1)
    OR (message_type = 'image' AND image_url IS NOT NULL)
    OR (message_type = 'location' AND latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
  )
);

-- "Remove for you": hides one message for one user only.
CREATE TABLE IF NOT EXISTS message_hidden (
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

-- "Delete conversation": that user no longer sees messages sent before cleared_at, and the chat
-- leaves their list until someone sends a new message.
CREATE TABLE IF NOT EXISTS conversation_clears (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cleared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);
