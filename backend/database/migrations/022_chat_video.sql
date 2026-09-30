-- Chat messages can now be a video too. Videos reuse the image_url column for their file URL.
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_content_check;
ALTER TABLE messages ADD CONSTRAINT messages_content_check CHECK (
  (body IS NULL OR char_length(body) <= 2000)
  AND (
    deleted_at IS NOT NULL
    OR (message_type = 'text' AND char_length(body) >= 1)
    OR (message_type IN ('image', 'video') AND image_url IS NOT NULL)
    OR (message_type = 'location' AND latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
  )
);
