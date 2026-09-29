-- Direct chat between users: customer <-> vehicle owner, and anyone <-> admin support.
-- One conversation per pair of users; storing the pair ordered (user_one_id < user_two_id)
-- keeps it unique no matter who starts the chat. vehicle_id is the listing the chat is about, if any.
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_one_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_two_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT conversations_ordered_pair CHECK (user_one_id < user_two_id),
  CONSTRAINT conversations_unique_pair UNIQUE (user_one_id, user_two_id)
);
CREATE INDEX IF NOT EXISTS idx_conversations_user_one ON conversations(user_one_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_user_two ON conversations(user_two_id, last_message_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(conversation_id, sender_id) WHERE read_at IS NULL;
