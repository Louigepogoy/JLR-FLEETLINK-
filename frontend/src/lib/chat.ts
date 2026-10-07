import api from '@/lib/api';

export type Conversation = {
  id: string;
  vehicle_id: string | null;
  vehicle_title: string | null;
  last_message_at: string;
  other_id: string;
  other_name: string;
  other_avatar_url: string | null;
  other_role: 'user' | 'admin';
  // Chat between an admin and a user. Every admin shares these as one support inbox.
  is_support: boolean;
  last_message: string | null;
  last_message_type: ChatMessage['message_type'] | null;
  last_message_sender_id: string | null;
  unread_count: number;
};

export type ChatMessage = {
  id: string;
  sender_id: string;
  // Who sent it; in support chats this can be any admin, not only the one on the conversation.
  sender_name: string;
  sender_role: 'user' | 'admin';
  message_type: 'text' | 'image' | 'video' | 'location';
  body: string | null;
  image_url: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
  read_at: string | null;
  created_at: string;
  // Set when the sender unsent it (content is wiped).
  deleted_at: string | null;
  forwarded: boolean;
  // Preview of the message this one replies to, if any.
  reply_to_id: string | null;
  reply_sender_id: string | null;
  reply_type: ChatMessage['message_type'] | null;
  reply_body: string | null;
  reply_deleted: boolean | null;
};

export const MAX_FORWARD_TARGETS = 5;

// Short one-line description of a message, for reply quotes and previews.
export const messagePreview = (m: { message_type: ChatMessage['message_type'] | null; body: string | null; deleted?: boolean | null }) => {
  if (m.deleted) return 'Message unsent';
  if (m.message_type === 'image') return m.body ? `📷 ${m.body}` : '📷 Photo';
  if (m.message_type === 'video') return m.body ? `🎥 ${m.body}` : '🎥 Video';
  if (m.message_type === 'location') return '📍 Location';
  return m.body || '';
};

export type MessageReaction = { message_id: string; user_id: string; emoji: string };

export type ChatUser = { id: string; full_name: string; avatar_url: string | null; role: 'user' | 'admin' };

export const REACTION_EMOJIS = ['👍', '❤️', '😆', '😮', '😢', '😡'];

export const CHAT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const CHAT_VIDEO_MAX_BYTES = 50 * 1024 * 1024;
export const CHAT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const CHAT_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

export const profilePath = (userId: string) => `/users/${userId}`;

export const messagesPath =(role: string | undefined, conversationId?: string) =>
  `${role === 'admin' ? '/dashboard/admin/messages' : '/dashboard/messages'}${conversationId ? `?c=${conversationId}` : ''}`;

// Starts (or reopens) a chat with a user or a vehicle's owner and returns the conversation.
export const startConversation = async (target: { userId?: string; vehicleId?: string }) => {
  const res = await api.post('/chat/conversations', target);
  return res.data.data as Conversation;
};

export const startSupportConversation = async () => {
  const res = await api.post('/chat/conversations/support');
  return res.data.data as Conversation;
};

export const apiErrorMessage = (err: unknown, fallback: string) => {
  const error = err as { response?: { data?: { message?: string } } };
  return error.response?.data?.message || fallback;
};
