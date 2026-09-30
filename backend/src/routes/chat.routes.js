const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { uploadChatMedia } = require('../middleware/upload');
const {
  getConversations, getUnreadCount, searchUsers, startConversation, startSupportConversation,
  getMessages, sendMessage, sendMedia, reactToMessage, deleteMessage, forwardMessage, deleteConversation,
  conversationIdValidation, startConversationValidation, searchUsersValidation, messageValidation,
  mediaMessageValidation, reactionValidation, deleteMessageValidation, forwardValidation,
} = require('../controllers/chatController');

router.get('/conversations', authenticate, getConversations);
router.get('/unread-count', authenticate, getUnreadCount);
router.get('/users', authenticate, searchUsersValidation, searchUsers);
router.post('/conversations', authenticate, startConversationValidation, startConversation);
router.post('/conversations/support', authenticate, startSupportConversation);
router.delete('/conversations/:id', authenticate, conversationIdValidation, deleteConversation);
router.get('/conversations/:id/messages', authenticate, conversationIdValidation, getMessages);
router.post('/conversations/:id/messages', authenticate, messageValidation, sendMessage);
router.post('/conversations/:id/media', authenticate, uploadChatMedia, mediaMessageValidation, sendMedia);
router.post('/messages/:messageId/reactions', authenticate, reactionValidation, reactToMessage);
router.post('/messages/:messageId/forward', authenticate, forwardValidation, forwardMessage);
router.delete('/messages/:messageId', authenticate, deleteMessageValidation, deleteMessage);

module.exports = router;
