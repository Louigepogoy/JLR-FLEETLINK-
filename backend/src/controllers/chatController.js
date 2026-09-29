const fs = require('fs');
const path = require('path');
const { body, param, query: queryParam, validationResult } = require('express-validator');
const { query } = require('../config/db');
const { uploadDir } = require('../middleware/upload');
const { createNotification } = require('../utils/notifications');
const { containsProfanity } = require('../utils/profanity');

const MESSAGE_PAGE_SIZE = 200;
const MAX_FORWARD_TARGETS = 5;
const REACTION_EMOJIS = ['👍', '❤️', '😆', '😮', '😢', '😡'];
const POLICY_MESSAGE = 'Message blocked: bad words are not allowed in chat (Chat Policy).';

const sendValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  return true;
};

const messagesPathFor = (role, conversationId) =>
  `${role === 'admin' ? '/dashboard/admin/messages' : '/dashboard/messages'}?c=${conversationId}`;

// Every conversation row returned to the client has the same shape, seen from the current user's side.
// Messages from before the user deleted the conversation (conversation_clears) don't count for them.
const CONVERSATION_SELECT = `
  SELECT c.id, c.vehicle_id, c.last_message_at, c.created_at,
         o.id AS other_id, o.full_name AS other_name, o.avatar_url AS other_avatar_url, o.role AS other_role,
         v.title AS vehicle_title,
         CASE
           WHEN lm.deleted_at IS NOT NULL THEN 'Message unsent'
           WHEN lm.message_type = 'image' THEN COALESCE(NULLIF(lm.body, ''), 'Sent a photo')
           WHEN lm.message_type = 'location' THEN 'Shared a location'
           ELSE lm.body
         END AS last_message,
         lm.message_type AS last_message_type, lm.sender_id AS last_message_sender_id,
         (SELECT COUNT(*)::int FROM messages m
           WHERE m.conversation_id = c.id AND m.sender_id <> $1 AND m.read_at IS NULL AND m.deleted_at IS NULL
             AND m.created_at > COALESCE(cc.cleared_at, '-infinity')) AS unread_count
  FROM conversations c
  JOIN users o ON o.id = CASE WHEN c.user_one_id = $1 THEN c.user_two_id ELSE c.user_one_id END
  LEFT JOIN vehicles v ON v.id = c.vehicle_id
  LEFT JOIN conversation_clears cc ON cc.conversation_id = c.id AND cc.user_id = $1
  LEFT JOIN LATERAL (
    SELECT body, sender_id, message_type, deleted_at FROM messages m
    WHERE m.conversation_id = c.id AND m.created_at > COALESCE(cc.cleared_at, '-infinity')
      AND NOT EXISTS (SELECT 1 FROM message_hidden h WHERE h.message_id = m.id AND h.user_id = $1)
    ORDER BY m.created_at DESC LIMIT 1
  ) lm ON true
  WHERE $1 IN (c.user_one_id, c.user_two_id)`;

// A message with a preview of the message it replies to. Unsent messages have their content wiped.
const MESSAGE_SELECT = `
  SELECT m.id, m.conversation_id, m.sender_id, m.message_type, m.body, m.image_url, m.latitude, m.longitude,
         m.read_at, m.created_at, m.deleted_at, m.forwarded, m.reply_to_id,
         rm.sender_id AS reply_sender_id, rm.message_type AS reply_type, rm.body AS reply_body,
         (rm.deleted_at IS NOT NULL) AS reply_deleted
  FROM messages m
  LEFT JOIN messages rm ON rm.id = m.reply_to_id`;

// Messages of conversation $1 that user $2 can see (not before their clear, not removed for them).
const VISIBLE_TO_USER = `
  m.conversation_id = $1
  AND m.created_at > COALESCE(
    (SELECT cleared_at FROM conversation_clears WHERE conversation_id = $1 AND user_id = $2), '-infinity')
  AND NOT EXISTS (SELECT 1 FROM message_hidden h WHERE h.message_id = m.id AND h.user_id = $2)`;

const getConversationForUser = async (userId, conversationId) => {
  const result = await query(`${CONVERSATION_SELECT} AND c.id = $2`, [userId, conversationId]);
  return result.rows[0] || null;
};

const getMessageForUser = async (userId, messageId) => {
  const result = await query(
    `${MESSAGE_SELECT} JOIN conversations c ON c.id = m.conversation_id
     WHERE m.id = $1 AND $2 IN (c.user_one_id, c.user_two_id)`,
    [messageId, userId]
  );
  return result.rows[0] || null;
};

const upsertConversation = async (userId, otherId, vehicleId = null) => {
  const result = await query(
    `INSERT INTO conversations (user_one_id, user_two_id, vehicle_id)
     VALUES (LEAST($1::uuid, $2::uuid), GREATEST($1::uuid, $2::uuid), $3)
     ON CONFLICT (user_one_id, user_two_id)
       DO UPDATE SET vehicle_id = COALESCE(EXCLUDED.vehicle_id, conversations.vehicle_id)
     RETURNING id`,
    [userId, otherId, vehicleId]
  );
  return result.rows[0].id;
};

// Deletes an uploaded chat photo once no remaining message (e.g. a forwarded copy) still uses it.
const removeChatImageIfUnused = async (imageUrl) => {
  if (!imageUrl) return;
  const stillUsed = await query('SELECT 1 FROM messages WHERE image_url = $1 LIMIT 1', [imageUrl]);
  const filename = imageUrl.split('/uploads/')[1];
  if (stillUsed.rows.length || !filename || !filename.startsWith('chatImage-')) return;
  await fs.promises.unlink(path.join(uploadDir, path.basename(filename))).catch(() => {});
};

const getConversations = async (req, res, next) => {
  try {
    const result = await query(
      `${CONVERSATION_SELECT} AND (cc.cleared_at IS NULL OR c.last_message_at > cc.cleared_at)
       ORDER BY c.last_message_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT COUNT(*)::int AS count
       FROM messages m
       JOIN conversations c ON c.id = m.conversation_id
       LEFT JOIN conversation_clears cc ON cc.conversation_id = c.id AND cc.user_id = $1
       WHERE $1 IN (c.user_one_id, c.user_two_id) AND m.sender_id <> $1 AND m.read_at IS NULL
         AND m.deleted_at IS NULL AND m.created_at > COALESCE(cc.cleared_at, '-infinity')`,
      [req.user.id]
    );
    res.json({ success: true, data: { count: result.rows[0].count } });
  } catch (error) {
    next(error);
  }
};

// Finds people to start a chat with. Only public profile fields are returned (no email/phone).
const searchUsers = async (req, res, next) => {
  try {
    if (sendValidationErrors(req, res)) return;
    const term = `%${req.query.q.replace(/[%_\\]/g, '\\$&')}%`;
    const result = await query(
      `SELECT id, full_name, avatar_url, role FROM users
       WHERE is_active = true AND id <> $1 AND full_name ILIKE $2
       ORDER BY full_name ASC LIMIT 10`,
      [req.user.id, term]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

// Start (or reopen) a chat with any active user, optionally about one of their vehicle listings.
const startConversation = async (req, res, next) => {
  try {
    if (sendValidationErrors(req, res)) return;

    const { vehicleId } = req.body;
    let { userId } = req.body;

    if (vehicleId) {
      const vehicle = await query('SELECT owner_id FROM vehicles WHERE id = $1', [vehicleId]);
      if (!vehicle.rows[0]) return res.status(404).json({ success: false, message: 'Vehicle not found' });
      if (userId && userId !== vehicle.rows[0].owner_id) {
        return res.status(400).json({ success: false, message: 'That user does not own this vehicle' });
      }
      userId = vehicle.rows[0].owner_id;
    }

    if (!userId) return res.status(400).json({ success: false, message: 'userId or vehicleId is required' });
    if (userId === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot message yourself' });
    }

    const other = await query('SELECT id FROM users WHERE id = $1 AND is_active = true', [userId]);
    if (!other.rows[0]) return res.status(404).json({ success: false, message: 'User not found' });

    const conversationId = await upsertConversation(req.user.id, userId, vehicleId || null);
    res.status(201).json({ success: true, data: await getConversationForUser(req.user.id, conversationId) });
  } catch (error) {
    next(error);
  }
};

// Opens a chat with the support team: reuses the user's most recent chat with an admin,
// otherwise picks the longest-standing active admin.
const startSupportConversation = async (req, res, next) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Admins cannot open a support chat' });
    }

    const existing = await query(
      `SELECT c.id FROM conversations c
       JOIN users a ON a.id = CASE WHEN c.user_one_id = $1 THEN c.user_two_id ELSE c.user_one_id END
       WHERE $1 IN (c.user_one_id, c.user_two_id) AND a.role = 'admin' AND a.is_active = true
       ORDER BY c.last_message_at DESC LIMIT 1`,
      [req.user.id]
    );

    let conversationId = existing.rows[0]?.id;
    if (!conversationId) {
      const admin = await query(
        "SELECT id FROM users WHERE role = 'admin' AND is_active = true ORDER BY created_at ASC LIMIT 1"
      );
      if (!admin.rows[0]) {
        return res.status(503).json({ success: false, message: 'Support is not available right now' });
      }
      conversationId = await upsertConversation(req.user.id, admin.rows[0].id);
    }

    res.status(201).json({ success: true, data: await getConversationForUser(req.user.id, conversationId) });
  } catch (error) {
    next(error);
  }
};

// Returns messages (all, or only those after `after` for polling) plus state that changes on older
// messages and so is always sent in full: every reaction, which messages were unsent, and how far the
// other person has read. Then marks the other side's messages as read.
const getMessages = async (req, res, next) => {
  try {
    if (sendValidationErrors(req, res)) return;

    const conversation = await getConversationForUser(req.user.id, req.params.id);
    if (!conversation) return res.status(404).json({ success: false, message: 'Conversation not found' });

    const { after } = req.query;
    const afterDate = after && !Number.isNaN(Date.parse(after)) ? new Date(after) : null;
    const messages = afterDate
      ? await query(
        `${MESSAGE_SELECT} WHERE ${VISIBLE_TO_USER} AND m.created_at > $3 ORDER BY m.created_at ASC`,
        [req.params.id, req.user.id, afterDate]
      )
      : await query(
        `SELECT * FROM (${MESSAGE_SELECT} WHERE ${VISIBLE_TO_USER} ORDER BY m.created_at DESC LIMIT $3) latest
         ORDER BY created_at ASC`,
        [req.params.id, req.user.id, MESSAGE_PAGE_SIZE]
      );

    const [reactions, unsent, seen] = await Promise.all([
      query(
        `SELECT r.message_id, r.user_id, r.emoji FROM message_reactions r
         JOIN messages m ON m.id = r.message_id WHERE m.conversation_id = $1`,
        [req.params.id]
      ),
      query('SELECT id FROM messages WHERE conversation_id = $1 AND deleted_at IS NOT NULL', [req.params.id]),
      query(
        `SELECT MAX(created_at) AS seen_until FROM messages
         WHERE conversation_id = $1 AND sender_id = $2 AND read_at IS NOT NULL`,
        [req.params.id, req.user.id]
      ),
      query(
        'UPDATE messages SET read_at = NOW() WHERE conversation_id = $1 AND sender_id <> $2 AND read_at IS NULL',
        [req.params.id, req.user.id]
      ),
    ]);

    res.json({
      success: true,
      data: {
        conversation: { ...conversation, unread_count: 0 },
        messages: messages.rows,
        reactions: reactions.rows,
        unsent_ids: unsent.rows.map((r) => r.id),
        seen_until: seen.rows[0].seen_until,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Validates that a reply target belongs to the same conversation and wasn't unsent.
const resolveReplyTarget = async (conversationId, replyToId) => {
  if (!replyToId) return { ok: true, id: null };
  const target = await query(
    'SELECT id FROM messages WHERE id = $1 AND conversation_id = $2 AND deleted_at IS NULL',
    [replyToId, conversationId]
  );
  return target.rows[0] ? { ok: true, id: target.rows[0].id } : { ok: false };
};

// Inserts a message, bumps the conversation, notifies the other person, and returns the full message row.
const createMessage = async (sender, conversation, fields) => {
  // Only notify on the first unread message so a burst of messages doesn't flood notifications.
  const pendingUnread = await query(
    'SELECT 1 FROM messages WHERE conversation_id = $1 AND sender_id = $2 AND read_at IS NULL AND deleted_at IS NULL LIMIT 1',
    [conversation.id, sender.id]
  );

  const inserted = await query(
    `INSERT INTO messages
       (conversation_id, sender_id, message_type, body, image_url, latitude, longitude, reply_to_id, forwarded)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [conversation.id, sender.id, fields.type, fields.body || null, fields.imageUrl || null,
      fields.latitude ?? null, fields.longitude ?? null, fields.replyToId || null, Boolean(fields.forwarded)]
  );
  await query('UPDATE conversations SET last_message_at = NOW() WHERE id = $1', [conversation.id]);

  if (!pendingUnread.rows.length) {
    const text = fields.type === 'image' ? 'Sent you a photo' : fields.type === 'location' ? 'Shared a location' : fields.body;
    const preview = text.length > 80 ? `${text.slice(0, 77)}...` : text;
    await createNotification(
      conversation.other_id,
      `New message from ${sender.full_name}`,
      preview,
      'system',
      messagesPathFor(conversation.other_role, conversation.id)
    ).catch(() => {});
  }

  const result = await query(`${MESSAGE_SELECT} WHERE m.id = $1`, [inserted.rows[0].id]);
  return result.rows[0];
};

// Text or location message, optionally replying to another message.
const sendMessage = async (req, res, next) => {
  try {
    if (sendValidationErrors(req, res)) return;

    const conversation = await getConversationForUser(req.user.id, req.params.id);
    if (!conversation) return res.status(404).json({ success: false, message: 'Conversation not found' });

    const reply = await resolveReplyTarget(conversation.id, req.body.replyToId);
    if (!reply.ok) return res.status(400).json({ success: false, message: 'The message you replied to is no longer available' });

    if (req.body.type === 'location') {
      const message = await createMessage(req.user, conversation, {
        type: 'location', latitude: req.body.latitude, longitude: req.body.longitude, replyToId: reply.id,
      });
      return res.status(201).json({ success: true, data: message });
    }

    const text = req.body.body.trim();
    if (containsProfanity(text)) return res.status(400).json({ success: false, message: POLICY_MESSAGE, policyViolation: true });
    const message = await createMessage(req.user, conversation, { type: 'text', body: text, replyToId: reply.id });
    res.status(201).json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
};

// Photo message (multipart field "chatImage", optional caption in "body", optional "replyToId").
const sendImage = async (req, res, next) => {
  const removeUpload = () => req.file && fs.promises.unlink(req.file.path).catch(() => {});
  try {
    if (sendValidationErrors(req, res)) return removeUpload();
    if (!req.file) return res.status(400).json({ success: false, message: 'Please choose a photo to send' });

    const conversation = await getConversationForUser(req.user.id, req.params.id);
    if (!conversation) {
      removeUpload();
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const reply = await resolveReplyTarget(conversation.id, req.body.replyToId);
    if (!reply.ok) {
      removeUpload();
      return res.status(400).json({ success: false, message: 'The message you replied to is no longer available' });
    }

    const caption = (req.body.body || '').trim();
    if (caption && containsProfanity(caption)) {
      removeUpload();
      return res.status(400).json({ success: false, message: POLICY_MESSAGE, policyViolation: true });
    }

    const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const message = await createMessage(req.user, conversation, {
      type: 'image', body: caption, imageUrl: `${baseUrl}/uploads/${req.file.filename}`, replyToId: reply.id,
    });
    res.status(201).json({ success: true, data: message });
  } catch (error) {
    removeUpload();
    next(error);
  }
};

// scope=everyone ("Unsend", sender only): wipes the content for both people.
// scope=me ("Remove for you"): hides the message only for the current user.
const deleteMessage = async (req, res, next) => {
  try {
    if (sendValidationErrors(req, res)) return;

    const message = await getMessageForUser(req.user.id, req.params.messageId);
    if (!message) return res.status(404).json({ success: false, message: 'Message not found' });

    if (req.query.scope === 'everyone') {
      if (message.sender_id !== req.user.id) {
        return res.status(403).json({ success: false, message: 'You can only unsend your own messages' });
      }
      if (!message.deleted_at) {
        await query(
          `UPDATE messages SET deleted_at = NOW(), body = NULL, image_url = NULL, latitude = NULL, longitude = NULL
           WHERE id = $1`,
          [message.id]
        );
        await query('DELETE FROM message_reactions WHERE message_id = $1', [message.id]);
        await removeChatImageIfUnused(message.image_url);
      }
      return res.json({ success: true, data: { id: message.id, scope: 'everyone' } });
    }

    await query(
      'INSERT INTO message_hidden (message_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [message.id, req.user.id]
    );
    res.json({ success: true, data: { id: message.id, scope: 'me' } });
  } catch (error) {
    next(error);
  }
};

// Copies a message into up to MAX_FORWARD_TARGETS of the user's other conversations.
const forwardMessage = async (req, res, next) => {
  try {
    if (sendValidationErrors(req, res)) return;

    const message = await getMessageForUser(req.user.id, req.params.messageId);
    if (!message || message.deleted_at) {
      return res.status(404).json({ success: false, message: 'This message can no longer be forwarded' });
    }

    const targetIds = [...new Set(req.body.conversationIds)];
    const targets = await Promise.all(targetIds.map((id) => getConversationForUser(req.user.id, id)));
    if (targets.some((t) => !t)) return res.status(404).json({ success: false, message: 'One of the chats was not found' });

    const forwarded = [];
    for (const target of targets) {
      forwarded.push(await createMessage(req.user, target, {
        type: message.message_type,
        body: message.body,
        imageUrl: message.image_url,
        latitude: message.latitude,
        longitude: message.longitude,
        forwarded: true,
      }));
    }
    res.status(201).json({ success: true, data: forwarded });
  } catch (error) {
    next(error);
  }
};

// Removes the conversation from the current user's list and hides its history for them only.
const deleteConversation = async (req, res, next) => {
  try {
    if (sendValidationErrors(req, res)) return;

    const conversation = await getConversationForUser(req.user.id, req.params.id);
    if (!conversation) return res.status(404).json({ success: false, message: 'Conversation not found' });

    await query(
      `INSERT INTO conversation_clears (conversation_id, user_id, cleared_at) VALUES ($1, $2, NOW())
       ON CONFLICT (conversation_id, user_id) DO UPDATE SET cleared_at = NOW()`,
      [conversation.id, req.user.id]
    );
    await query(
      'UPDATE messages SET read_at = NOW() WHERE conversation_id = $1 AND sender_id <> $2 AND read_at IS NULL',
      [conversation.id, req.user.id]
    );
    res.json({ success: true, data: { id: conversation.id } });
  } catch (error) {
    next(error);
  }
};

// Sets the current user's reaction on a message; sending the same emoji again removes it.
const reactToMessage = async (req, res, next) => {
  try {
    if (sendValidationErrors(req, res)) return;

    const message = await getMessageForUser(req.user.id, req.params.messageId);
    if (!message || message.deleted_at) return res.status(404).json({ success: false, message: 'Message not found' });

    const { emoji } = req.body;
    const removed = await query(
      'DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3 RETURNING 1',
      [message.id, req.user.id, emoji]
    );
    if (!removed.rows.length) {
      await query(
        `INSERT INTO message_reactions (message_id, user_id, emoji) VALUES ($1, $2, $3)
         ON CONFLICT (message_id, user_id) DO UPDATE SET emoji = EXCLUDED.emoji, created_at = NOW()`,
        [message.id, req.user.id, emoji]
      );
    }

    const reactions = await query(
      'SELECT message_id, user_id, emoji FROM message_reactions WHERE message_id = $1',
      [message.id]
    );
    res.json({ success: true, data: reactions.rows });
  } catch (error) {
    next(error);
  }
};

// Any Postgres-style UUID, not only RFC-versioned ones: the seeded demo accounts use IDs like
// a0000000-0000-0000-0000-000000000001, which express-validator's isUUID() rejects.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuidField = (field, message) =>
  field.matches(UUID_PATTERN).withMessage(message).customSanitizer((value) => String(value).toLowerCase());

const conversationIdValidation = [uuidField(param('id'), 'Invalid conversation')];
const messageIdValidation = [uuidField(param('messageId'), 'Invalid message')];
const replyToValidation = uuidField(body('replyToId').optional({ values: 'falsy' }), 'Invalid reply');

const startConversationValidation = [
  uuidField(body('userId').optional({ values: 'falsy' }), 'Invalid user'),
  uuidField(body('vehicleId').optional({ values: 'falsy' }), 'Invalid vehicle'),
];

const searchUsersValidation = [
  queryParam('q').isString().trim().isLength({ min: 2, max: 100 }).withMessage('Type at least 2 letters to search'),
];

const messageValidation = [
  ...conversationIdValidation,
  replyToValidation,
  body('type').optional().isIn(['text', 'location']).withMessage('Invalid message type'),
  body('body')
    .if(body('type').not().equals('location'))
    .isString().trim().isLength({ min: 1, max: 2000 }).withMessage('Message must be 1-2000 characters'),
  body('latitude')
    .if(body('type').equals('location'))
    .isFloat({ min: -90, max: 90 }).withMessage('Invalid location').toFloat(),
  body('longitude')
    .if(body('type').equals('location'))
    .isFloat({ min: -180, max: 180 }).withMessage('Invalid location').toFloat(),
];

const imageMessageValidation = [
  ...conversationIdValidation,
  replyToValidation,
  body('body').optional().isString().trim().isLength({ max: 2000 }).withMessage('Caption is too long'),
];

const reactionValidation = [
  ...messageIdValidation,
  body('emoji').isIn(REACTION_EMOJIS).withMessage('Unsupported reaction'),
];

const deleteMessageValidation = [
  ...messageIdValidation,
  queryParam('scope').isIn(['everyone', 'me']).withMessage('scope must be "everyone" or "me"'),
];

const forwardValidation = [
  ...messageIdValidation,
  body('conversationIds')
    .isArray({ min: 1, max: MAX_FORWARD_TARGETS }).withMessage(`Choose 1 to ${MAX_FORWARD_TARGETS} chats to forward to`),
  uuidField(body('conversationIds.*'), 'Invalid chat'),
];

module.exports = {
  getConversations, getUnreadCount, searchUsers, startConversation, startSupportConversation,
  getMessages, sendMessage, sendImage, reactToMessage, deleteMessage, forwardMessage, deleteConversation,
  conversationIdValidation, startConversationValidation, searchUsersValidation, messageValidation,
  imageMessageValidation, reactionValidation, deleteMessageValidation, forwardValidation,
};
