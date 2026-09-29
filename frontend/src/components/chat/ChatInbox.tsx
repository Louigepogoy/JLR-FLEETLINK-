'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Car, Check, Copy, CornerUpLeft, EyeOff, Forward, Headset, ImagePlus, Loader2, MapPin,
  MessageCircle, MoreHorizontal, Search, Send, ShieldCheck, SmilePlus, Trash2, Undo2, UserPlus, X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { format, isToday } from 'date-fns';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  apiErrorMessage, CHAT_IMAGE_MAX_BYTES, MAX_FORWARD_TARGETS, messagePreview, profilePath, REACTION_EMOJIS,
  startConversation, startSupportConversation,
  type ChatMessage, type ChatUser, type Conversation, type MessageReaction,
} from '@/lib/chat';
import { useAuthStore } from '@/store/authStore';

// Chat updates by polling rather than websockets, so it works on any host without extra infrastructure.
const LIST_POLL_MS = 8000;
const THREAD_POLL_MS = 3000;
const SEARCH_DEBOUNCE_MS = 300;

const formatChatTime = (value: string) => {
  const date = new Date(value);
  return isToday(date) ? format(date, 'h:mm a') : format(date, 'MMM d, h:mm a');
};

function Avatar({ name, url, small = false }: { name: string; url?: string | null; small?: boolean }) {
  return (
    <div className={cn(
      'shrink-0 overflow-hidden rounded-full gradient-bg flex items-center justify-center text-white font-bold',
      small ? 'h-9 w-9 text-sm' : 'h-11 w-11'
    )}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={name} className="h-full w-full object-cover" />
      ) : (
        name?.charAt(0).toUpperCase()
      )}
    </div>
  );
}

function SupportBadge() {
  return (
    <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold text-violet-500">Support</span>
  );
}

function MessageContent({ message, mine, unsent, otherName }: {
  message: ChatMessage;
  mine: boolean;
  unsent: boolean;
  otherName: string;
}) {
  const bubble = cn(
    'max-w-[80%] overflow-hidden rounded-2xl text-sm',
    mine ? 'gradient-bg rounded-br-sm text-white' : 'rounded-bl-sm bg-[var(--primary)]/10'
  );

  if (unsent) {
    return (
      <div className="max-w-[80%] rounded-2xl border border-[var(--card-border)] px-4 py-2 text-sm italic text-[var(--muted)]">
        {mine ? 'You unsent a message' : `${otherName} unsent a message`}
      </div>
    );
  }

  if (message.message_type === 'image' && message.image_url) {
    return (
      <div className={bubble}>
        <a href={message.image_url} target="_blank" rel="noopener noreferrer" title="Open full photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={message.image_url} alt="Sent photo" className="max-h-72 w-full max-w-xs object-cover" />
        </a>
        {message.body && <p className="whitespace-pre-wrap break-words px-4 py-2">{message.body}</p>}
      </div>
    );
  }

  if (message.message_type === 'location' && message.latitude != null && message.longitude != null) {
    const coords = `${Number(message.latitude)},${Number(message.longitude)}`;
    return (
      <div className={cn(bubble, 'w-64')}>
        <iframe
          title="Shared location"
          src={`https://maps.google.com/maps?q=${coords}&z=16&output=embed`}
          className="pointer-events-none h-36 w-full border-0"
          loading="lazy"
        />
        <a
          href={`https://www.google.com/maps?q=${coords}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 font-medium hover:underline"
        >
          <MapPin className="h-4 w-4 shrink-0" /> Shared location · Open in Maps
        </a>
      </div>
    );
  }

  return <div className={cn(bubble, 'whitespace-pre-wrap break-words px-4 py-2')}>{message.body}</div>;
}

function ReactionBar({
  reactions, meId, onToggle,
}: {
  reactions: MessageReaction[];
  meId?: string;
  onToggle: (emoji: string) => void;
}) {
  if (!reactions.length) return null;
  const counts = new Map<string, number>();
  reactions.forEach((r) => counts.set(r.emoji, (counts.get(r.emoji) || 0) + 1));
  const myEmoji = reactions.find((r) => r.user_id === meId)?.emoji;
  return (
    <div className="-mt-1 flex gap-1">
      {[...counts.entries()].map(([emoji, count]) => (
        <button
          key={emoji}
          onClick={() => onToggle(emoji)}
          className={cn(
            'rounded-full border border-[var(--card-border)] bg-[var(--card)] px-1.5 text-xs shadow-sm',
            emoji === myEmoji && 'border-[var(--primary)]'
          )}
          title={emoji === myEmoji ? 'Remove your reaction' : 'React'}
        >
          {emoji}{count > 1 ? ` ${count}` : ''}
        </button>
      ))}
    </div>
  );
}

function ForwardModal({ message, onClose, onForwarded }: {
  message: ChatMessage | null;
  onClose: () => void;
  onForwarded: () => void;
}) {
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!message) return;
    api.get('/chat/conversations')
      .then((res) => setConversations(res.data.data))
      .catch(() => setConversations([]));
  }, [message]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_FORWARD_TARGETS) {
        toast.error(`You can forward to up to ${MAX_FORWARD_TARGETS} chats at once`);
        return prev;
      }
      return [...prev, id];
    });
  };

  const forward = async () => {
    if (!message || !selected.length) return;
    setSending(true);
    try {
      await api.post(`/chat/messages/${message.id}/forward`, { conversationIds: selected });
      toast.success(`Forwarded to ${selected.length} chat${selected.length > 1 ? 's' : ''}`);
      onForwarded();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not forward message'));
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="glass-card flex max-h-[80vh] w-full max-w-sm flex-col p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-bold"><Forward className="h-4 w-4" /> Forward message</h3>
              <button onClick={onClose} aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <p className="mb-3 truncate rounded-lg bg-[var(--primary)]/5 px-3 py-2 text-xs text-[var(--muted)]">
              {messagePreview(message)}
            </p>
            <div className="-mx-1 flex-1 overflow-y-auto">
              {conversations === null ? (
                <div className="space-y-2 p-1">
                  {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}
                </div>
              ) : conversations.length === 0 ? (
                <p className="p-3 text-center text-sm text-[var(--muted)]">No chats to forward to yet.</p>
              ) : (
                conversations.map((c) => {
                  const checked = selected.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggle(c.id)}
                      className={cn('flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-[var(--primary)]/5', checked && 'bg-[var(--primary)]/10')}
                    >
                      <Avatar name={c.other_name} url={c.other_avatar_url} small />
                      <span className="flex-1 truncate text-sm font-medium">{c.other_name}</span>
                      <span className={cn(
                        'flex h-5 w-5 items-center justify-center rounded-full border',
                        checked ? 'gradient-bg border-transparent text-white' : 'border-[var(--card-border)]'
                      )}>
                        {checked && <Check className="h-3 w-3" />}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
            <button
              onClick={forward}
              disabled={sending || !selected.length}
              className="btn-primary mt-4 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send{selected.length ? ` to ${selected.length}` : ''}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

type OpenMenu = { id: string; kind: 'react' | 'more' } | null;

function ChatThread({
  conversationId, meId, onBack, onActivity, onDeleted,
}: {
  conversationId: string;
  meId?: string;
  onBack: () => void;
  onActivity: () => void;
  onDeleted: () => void;
}) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<MessageReaction[]>([]);
  const [unsentIds, setUnsentIds] = useState<Set<string>>(new Set());
  const [seenUntil, setSeenUntil] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [draft, setDraft] = useState('');
  const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [forwarding, setForwarding] = useState<ChatMessage | null>(null);
  const [sending, setSending] = useState(false);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [deletingChat, setDeletingChat] = useState(false);
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  // Only advanced from fetched pages (never from our own sends), so a message the other person sent
  // just before ours is still picked up by the next poll.
  const cursor = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const addMessages = useCallback((incoming: ChatMessage[]) => {
    if (!incoming.length) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const added = incoming.filter((m) => !seen.has(m.id));
      return added.length ? [...prev, ...added] : prev;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const url = `/chat/conversations/${conversationId}/messages`;
    const apply = (data: {
      messages: ChatMessage[];
      reactions: MessageReaction[];
      unsent_ids: string[];
      seen_until: string | null;
    }) => {
      const newest = data.messages[data.messages.length - 1]?.created_at;
      if (newest && (!cursor.current || newest > cursor.current)) cursor.current = newest;
      addMessages(data.messages);
      setReactions(data.reactions);
      setUnsentIds(new Set(data.unsent_ids));
      setSeenUntil(data.seen_until);
    };

    api.get(url)
      .then((res) => {
        if (cancelled) return;
        setConversation(res.data.data.conversation);
        apply(res.data.data);
        onActivity();
      })
      .catch(() => { if (!cancelled) setNotFound(true); })
      .finally(() => { if (!cancelled) setLoading(false); });

    const timer = setInterval(() => {
      api.get(url, { params: cursor.current ? { after: cursor.current } : {} })
        .then((res) => {
          if (cancelled) return;
          apply(res.data.data);
          if (res.data.data.messages.length) onActivity();
        })
        .catch(() => {});
    }, THREAD_POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [conversationId, addMessages, onActivity]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  // Free the object URL used for the photo preview when it is replaced or the thread closes.
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.preview); }, [photo]);

  const isUnsent = (m: ChatMessage) => Boolean(m.deleted_at) || unsentIds.has(m.id);

  // e.g. "You replied to Maria", "Maria replied to you", "You replied to yourself".
  const replyLabel = (m: ChatMessage) => {
    const otherName = conversation?.other_name || '';
    const replier = m.sender_id === meId ? 'You' : otherName;
    const target = m.reply_sender_id === m.sender_id
      ? (m.sender_id === meId ? 'yourself' : 'themselves')
      : (m.reply_sender_id === meId ? 'you' : otherName);
    return `${replier} replied to ${target}`;
  };

  const handleSent = (message: ChatMessage) => {
    addMessages([message]);
    onActivity();
  };

  const choosePhoto = (file?: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Only JPEG, PNG, and WebP photos can be sent');
      return;
    }
    if (file.size > CHAT_IMAGE_MAX_BYTES) {
      toast.error('Photo is too large (max 5 MB)');
      return;
    }
    setPhoto({ file, preview: URL.createObjectURL(file) });
  };

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = draft.trim();
    if (sending || (!text && !photo)) return;
    setSending(true);
    try {
      if (photo) {
        const data = new FormData();
        data.append('chatImage', photo.file);
        if (text) data.append('body', text);
        if (replyTo) data.append('replyToId', replyTo.id);
        const res = await api.post(`/chat/conversations/${conversationId}/images`, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        handleSent(res.data.data);
        setPhoto(null);
      } else {
        const res = await api.post(`/chat/conversations/${conversationId}/messages`, {
          body: text, replyToId: replyTo?.id,
        });
        handleSent(res.data.data);
      }
      setDraft('');
      setReplyTo(null);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Message not sent'));
    } finally {
      setSending(false);
    }
  };

  const shareLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Location is not supported on this device');
      return;
    }
    if (!confirm(`Share your current location with ${conversation?.other_name}?`)) return;
    setSharingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await api.post(`/chat/conversations/${conversationId}/messages`, {
            type: 'location', latitude: coords.latitude, longitude: coords.longitude, replyToId: replyTo?.id,
          });
          handleSent(res.data.data);
          setReplyTo(null);
        } catch (err) {
          toast.error(apiErrorMessage(err, 'Could not share location'));
        } finally {
          setSharingLocation(false);
        }
      },
      (error) => {
        setSharingLocation(false);
        toast.error(error.code === error.PERMISSION_DENIED
          ? 'Location permission was denied. Allow it in your browser to share your location.'
          : 'Could not get your location. Please try again.');
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    setOpenMenu(null);
    try {
      const res = await api.post(`/chat/messages/${messageId}/reactions`, { emoji });
      setReactions((prev) => [...prev.filter((r) => r.message_id !== messageId), ...res.data.data]);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not react'));
    }
  };

  const startReply = (m: ChatMessage) => {
    setOpenMenu(null);
    setReplyTo(m);
    inputRef.current?.focus();
  };

  const copyText = async (m: ChatMessage) => {
    setOpenMenu(null);
    try {
      await navigator.clipboard.writeText(m.body || '');
      toast.success('Copied');
    } catch {
      toast.error('Could not copy');
    }
  };

  const unsend = async (m: ChatMessage) => {
    setOpenMenu(null);
    if (!confirm('Unsend this message? It will be removed for everyone in this chat.')) return;
    try {
      await api.delete(`/chat/messages/${m.id}`, { params: { scope: 'everyone' } });
      setUnsentIds((prev) => new Set(prev).add(m.id));
      setReactions((prev) => prev.filter((r) => r.message_id !== m.id));
      if (replyTo?.id === m.id) setReplyTo(null);
      onActivity();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not unsend message'));
    }
  };

  const removeForMe = async (m: ChatMessage) => {
    setOpenMenu(null);
    if (!confirm('Remove this message for you? The other person will still see it.')) return;
    try {
      await api.delete(`/chat/messages/${m.id}`, { params: { scope: 'me' } });
      setMessages((prev) => prev.filter((x) => x.id !== m.id));
      if (replyTo?.id === m.id) setReplyTo(null);
      onActivity();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not remove message'));
    }
  };

  const deleteChat = async () => {
    if (!confirm(`Delete this conversation with ${conversation?.other_name}? It will be removed from your chats. ${conversation?.other_name} will still have their copy.`)) return;
    setDeletingChat(true);
    try {
      await api.delete(`/chat/conversations/${conversationId}`);
      toast.success('Conversation deleted');
      onDeleted();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not delete conversation'));
      setDeletingChat(false);
    }
  };

  const scrollToMessage = (id: string | null) => {
    const el = id ? document.getElementById(`msg-${id}`) : null;
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('ring-2', 'ring-[var(--primary)]');
    setTimeout(() => el.classList.remove('ring-2', 'ring-[var(--primary)]'), 1500);
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-[var(--muted)]">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (notFound || !conversation) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-[var(--muted)]">
        <p>This chat could not be found.</p>
        <button onClick={onBack} className="btn-outline text-sm py-1.5 px-4">Back to chats</button>
      </div>
    );
  }

  const lastMine = [...messages].reverse().find((m) => m.sender_id === meId && !isUnsent(m));
  const lastMineSeen = Boolean(lastMine && seenUntil && lastMine.created_at <= seenUntil);
  const actionButton = 'shrink-0 rounded-full p-1 text-[var(--muted)] hover:bg-[var(--primary)]/10';
  const menuItem = 'flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--primary)]/10';

  return (
    <>
      <div className="flex items-center gap-3 border-b border-[var(--card-border)] px-4 py-3">
        <button onClick={onBack} className="lg:hidden rounded-lg p-1 hover:bg-[var(--primary)]/10" aria-label="Back to chats">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Link href={profilePath(conversation.other_id)} title="View profile">
          <Avatar name={conversation.other_name} url={conversation.other_avatar_url} small />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-semibold">
            <Link href={profilePath(conversation.other_id)} className="truncate hover:underline" title="View profile">
              {conversation.other_name}
            </Link>
            {conversation.other_role === 'admin' && <SupportBadge />}
          </p>
          {conversation.vehicle_id && conversation.vehicle_title && (
            <Link href={`/vehicles/${conversation.vehicle_id}`} className="flex items-center gap-1 text-xs text-[var(--primary)] hover:underline">
              <Car className="h-3 w-3" /> <span className="truncate">{conversation.vehicle_title}</span>
            </Link>
          )}
        </div>
        <button
          onClick={deleteChat}
          disabled={deletingChat}
          className="shrink-0 rounded-lg p-2 text-red-500 hover:bg-red-500/10 disabled:opacity-50"
          aria-label="Delete conversation"
          title="Delete conversation"
        >
          {deletingChat ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4" onClick={() => setOpenMenu(null)}>
        <p className="mx-auto flex max-w-md items-start gap-2 rounded-xl bg-[var(--primary)]/5 px-3 py-2 text-[11px] text-[var(--muted)]">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--primary)]" />
          <span>
            <b>Chat Policy:</b> Be respectful. Bad words, insults, harassment and scams are not allowed. Messages with
            bad words are blocked. Only share your location with people you trust.
          </span>
        </p>

        {messages.length === 0 ? (
          <p className="mt-6 text-center text-sm text-[var(--muted)]">
            No messages yet. Say hello and tell {conversation.other_name} what you need.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === meId;
            const unsent = isUnsent(m);
            const messageReactions = unsent ? [] : reactions.filter((r) => r.message_id === m.id);
            const menuOpen = openMenu?.id === m.id;
            return (
              <div key={m.id} className={cn('group flex flex-col gap-1', mine ? 'items-end' : 'items-start')}>
                {m.forwarded && !unsent && (
                  <span className="flex items-center gap-1 px-1 text-[10px] text-[var(--muted)]">
                    <Forward className="h-3 w-3" /> Forwarded
                  </span>
                )}
                {m.reply_to_id && !unsent && (
                  <button
                    onClick={() => scrollToMessage(m.reply_to_id)}
                    className="max-w-[75%] truncate rounded-xl border-l-4 border-[var(--primary)] bg-[var(--primary)]/5 px-3 py-1 text-left text-xs text-[var(--muted)]"
                    title="Go to original message"
                  >
                    <span className="flex items-center gap-1 font-semibold">
                      <CornerUpLeft className="h-3 w-3" />
                      {replyLabel(m)}
                    </span>
                    <span className="block truncate">
                      {messagePreview({ message_type: m.reply_type, body: m.reply_body, deleted: m.reply_deleted })}
                    </span>
                  </button>
                )}
                <div
                  id={`msg-${m.id}`}
                  className={cn('relative flex max-w-full items-center gap-1 rounded-2xl transition-shadow', mine && 'flex-row-reverse')}
                >
                  <MessageContent message={m} mine={mine} unsent={unsent} otherName={conversation.other_name} />
                  <div className={cn(
                    'flex items-center opacity-100 lg:opacity-0 lg:group-hover:opacity-100',
                    menuOpen && 'lg:opacity-100',
                    mine && 'flex-row-reverse'
                  )}>
                    {!unsent && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); setOpenMenu(menuOpen && openMenu?.kind === 'react' ? null : { id: m.id, kind: 'react' }); }}
                          className={actionButton}
                          aria-label="React to message"
                          title="React"
                        >
                          <SmilePlus className="h-4 w-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); startReply(m); }} className={actionButton} aria-label="Reply" title="Reply">
                          <CornerUpLeft className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); setOpenMenu(menuOpen && openMenu?.kind === 'more' ? null : { id: m.id, kind: 'more' }); }}
                      className={actionButton}
                      aria-label="More actions"
                      title="More"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>

                  {menuOpen && openMenu?.kind === 'react' && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className={cn(
                        'absolute -top-11 z-10 flex gap-1 rounded-full border border-[var(--card-border)] bg-[var(--card)] px-2 py-1 shadow-lg',
                        mine ? 'right-0' : 'left-0'
                      )}
                    >
                      {REACTION_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => toggleReaction(m.id, emoji)}
                          className="rounded-full p-1 text-lg transition-transform hover:scale-125"
                          aria-label={`React ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  {menuOpen && openMenu?.kind === 'more' && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className={cn(
                        'absolute top-full z-20 mt-1 w-48 overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)] py-1 shadow-lg',
                        mine ? 'right-0' : 'left-0'
                      )}
                    >
                      {!unsent && (
                        <>
                          <button onClick={() => startReply(m)} className={menuItem}><CornerUpLeft className="h-4 w-4" /> Reply</button>
                          <button onClick={() => { setOpenMenu(null); setForwarding(m); }} className={menuItem}><Forward className="h-4 w-4" /> Forward</button>
                          {m.message_type === 'text' && (
                            <button onClick={() => copyText(m)} className={menuItem}><Copy className="h-4 w-4" /> Copy text</button>
                          )}
                          {mine && (
                            <button onClick={() => unsend(m)} className={cn(menuItem, 'text-red-500')}><Undo2 className="h-4 w-4" /> Unsend for everyone</button>
                          )}
                        </>
                      )}
                      <button onClick={() => removeForMe(m)} className={cn(menuItem, 'text-red-500')}><EyeOff className="h-4 w-4" /> Remove for you</button>
                    </div>
                  )}
                </div>
                <ReactionBar reactions={messageReactions} meId={meId} onToggle={(emoji) => toggleReaction(m.id, emoji)} />
                <span className="px-1 text-[10px] text-[var(--muted)]">
                  {formatChatTime(m.created_at)}
                  {mine && m.id === lastMine?.id && lastMineSeen ? ' · Seen' : ''}
                </span>
              </div>
            );
          })
        )}
      </div>

      {replyTo && (
        <div className="flex items-center gap-3 border-t border-[var(--card-border)] bg-[var(--primary)]/5 px-4 py-2">
          <CornerUpLeft className="h-4 w-4 shrink-0 text-[var(--primary)]" />
          <div className="min-w-0 flex-1 text-xs">
            <p className="font-semibold">Replying to {replyTo.sender_id === meId ? 'yourself' : conversation.other_name}</p>
            <p className="truncate text-[var(--muted)]">{messagePreview(replyTo)}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="rounded-full p-1 hover:bg-[var(--primary)]/10" aria-label="Cancel reply">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {photo && (
        <div className="flex items-center gap-3 border-t border-[var(--card-border)] px-3 pt-3">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.preview} alt="Photo to send" className="h-16 w-16 rounded-lg object-cover" />
            <button
              onClick={() => setPhoto(null)}
              className="absolute -right-2 -top-2 rounded-full bg-black/70 p-0.5 text-white"
              aria-label="Remove photo"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <p className="text-xs text-[var(--muted)]">Add a caption (optional), then press send.</p>
        </div>
      )}

      <form onSubmit={send} className="flex items-end gap-2 border-t border-[var(--card-border)] p-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => { choosePhoto(e.target.files?.[0]); e.target.value = ''; }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex h-11 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--primary)] hover:bg-[var(--primary)]/10"
          aria-label="Send a photo"
          title="Send a photo"
        >
          <ImagePlus className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={shareLocation}
          disabled={sharingLocation}
          className="flex h-11 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--primary)] hover:bg-[var(--primary)]/10 disabled:opacity-50"
          aria-label="Share your location"
          title="Share your location"
        >
          {sharingLocation ? <Loader2 className="h-5 w-5 animate-spin" /> : <MapPin className="h-5 w-5" />}
        </button>
        <textarea
          ref={inputRef}
          className="input-field max-h-32 min-h-[44px] flex-1 resize-none"
          rows={1}
          maxLength={2000}
          placeholder={photo ? 'Add a caption...' : replyTo ? 'Write a reply...' : 'Type a message...'}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
            if (e.key === 'Escape') setReplyTo(null);
          }}
        />
        <button
          type="submit"
          disabled={sending || (!draft.trim() && !photo)}
          className="btn-primary flex h-11 w-11 shrink-0 items-center justify-center !p-0 disabled:opacity-50"
          aria-label="Send message"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>

      {/* Keyed by message so the chosen chats reset each time the dialog opens. */}
      <ForwardModal key={forwarding?.id ?? 'closed'} message={forwarding} onClose={() => setForwarding(null)} onForwarded={onActivity} />
    </>
  );
}

function NewChatSearch({ onStarted, onClose }: { onStarted: (conversation: Conversation) => void; onClose: () => void }) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<ChatUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [startingId, setStartingId] = useState<string | null>(null);
  const trimmed = term.trim();

  useEffect(() => {
    if (trimmed.length < 2) return;
    const timer = setTimeout(() => {
      setSearching(true);
      api.get('/chat/users', { params: { q: trimmed } })
        .then((res) => setResults(res.data.data))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [trimmed]);

  const start = async (userId: string) => {
    setStartingId(userId);
    try {
      onStarted(await startConversation({ userId }));
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not start chat'));
    } finally {
      setStartingId(null);
    }
  };

  const visibleResults = trimmed.length >= 2 ? results : [];

  return (
    <div className="border-b border-[var(--card-border)] p-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            autoFocus
            className="input-field !pl-9 text-sm"
            placeholder="Search people by name..."
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-[var(--primary)]/10" aria-label="Close search">
          <X className="h-4 w-4" />
        </button>
      </div>
      {trimmed.length >= 2 && (
        <div className="mt-2 max-h-60 overflow-y-auto">
          {searching && !visibleResults.length ? (
            <p className="p-2 text-xs text-[var(--muted)]">Searching...</p>
          ) : visibleResults.length === 0 ? (
            <p className="p-2 text-xs text-[var(--muted)]">No one found with that name.</p>
          ) : (
            visibleResults.map((u) => (
              <div key={u.id} className="flex items-center gap-1 rounded-lg hover:bg-[var(--primary)]/5">
                <button
                  onClick={() => start(u.id)}
                  disabled={startingId !== null}
                  className="flex min-w-0 flex-1 items-center gap-3 p-2 text-left disabled:opacity-50"
                  title={`Message ${u.full_name}`}
                >
                  <Avatar name={u.full_name} url={u.avatar_url} small />
                  <span className="flex-1 truncate text-sm font-medium">{u.full_name}</span>
                  {u.role === 'admin' && <SupportBadge />}
                  {startingId === u.id && <Loader2 className="h-4 w-4 animate-spin" />}
                </button>
                <Link
                  href={profilePath(u.id)}
                  className="shrink-0 rounded-lg px-2 py-1 text-xs text-[var(--primary)] hover:underline"
                >
                  Profile
                </Link>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function ChatInbox({ role }: { role: 'user' | 'admin' }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('c');
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingSupport, setStartingSupport] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const loadConversations = useCallback(() => {
    api.get('/chat/conversations')
      .then((res) => setConversations(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadConversations();
    const timer = setInterval(loadConversations, LIST_POLL_MS);
    return () => clearInterval(timer);
  }, [loadConversations]);

  const openConversation = (id: string | null) =>
    router.replace(id ? `${pathname}?c=${id}` : pathname, { scroll: false });

  const handleStarted = (conversation: Conversation) => {
    setSearchOpen(false);
    loadConversations();
    openConversation(conversation.id);
  };

  const handleDeleted = () => {
    if (selectedId) setConversations((list) => list.filter((c) => c.id !== selectedId));
    openConversation(null);
    loadConversations();
  };

  const handleSupport = async () => {
    setStartingSupport(true);
    try {
      handleStarted(await startSupportConversation());
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not reach support'));
    } finally {
      setStartingSupport(false);
    }
  };

  const previewFor = (c: Conversation) => {
    if (!c.last_message) return 'No messages yet';
    const icon = c.last_message === 'Message unsent' ? '' : c.last_message_type === 'image' ? '📷 ' : c.last_message_type === 'location' ? '📍 ' : '';
    return `${c.last_message_sender_id === user?.id ? 'You: ' : ''}${icon}${c.last_message}`;
  };

  return (
    <div className="glass-card grid h-[calc(100vh-9.5rem)] min-h-[480px] overflow-hidden lg:grid-cols-[320px_1fr]">
      <aside className={cn('min-h-0 flex-col border-[var(--card-border)] lg:border-r', selectedId ? 'hidden lg:flex' : 'flex')}>
        <div className="flex items-center justify-between gap-2 border-b border-[var(--card-border)] px-4 py-3">
          <p className="font-semibold">Chats</p>
          <div className="flex items-center gap-2">
            {role === 'user' && (
              <button
                onClick={handleSupport}
                disabled={startingSupport}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--primary)] px-2.5 py-1.5 text-xs text-[var(--primary)] hover:bg-[var(--primary)]/10 disabled:opacity-50"
                title="Chat with Support"
              >
                {startingSupport ? <Loader2 className="h-3 w-3 animate-spin" /> : <Headset className="h-3 w-3" />}
                Support
              </button>
            )}
            <button
              onClick={() => setSearchOpen((open) => !open)}
              className="flex items-center gap-1.5 rounded-lg gradient-bg px-2.5 py-1.5 text-xs text-white"
              title="Start a new chat"
            >
              <UserPlus className="h-3 w-3" /> New
            </button>
          </div>
        </div>

        {searchOpen && <NewChatSearch onStarted={handleStarted} onClose={() => setSearchOpen(false)} />}

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center text-sm text-[var(--muted)]">
              <MessageCircle className="mx-auto mb-2 h-8 w-8 opacity-50" />
              No chats yet.
              <p className="mt-1">Tap <b>New</b> to find someone by name{role === 'user' ? ', or chat with support' : ''}.</p>
            </div>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => openConversation(c.id)}
                className={cn(
                  'flex w-full gap-3 border-b border-[var(--card-border)] px-4 py-3 text-left transition-colors hover:bg-[var(--primary)]/5',
                  c.id === selectedId && 'bg-[var(--primary)]/10'
                )}
              >
                <Avatar name={c.other_name} url={c.other_avatar_url} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
                      <span className="truncate">{c.other_name}</span>
                      {c.other_role === 'admin' && <SupportBadge />}
                    </p>
                    <span className="shrink-0 text-[10px] text-[var(--muted)]">{formatChatTime(c.last_message_at)}</span>
                  </div>
                  {c.vehicle_title && (
                    <p className="flex items-center gap-1 truncate text-xs text-[var(--primary)]">
                      <Car className="h-3 w-3 shrink-0" /> <span className="truncate">{c.vehicle_title}</span>
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn('truncate text-xs', c.unread_count ? 'font-semibold' : 'text-[var(--muted)]')}>
                      {previewFor(c)}
                    </p>
                    {c.unread_count > 0 && (
                      <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full gradient-bg px-1.5 text-[10px] font-bold text-white">
                        {c.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className={cn('min-h-0 flex-col', selectedId ? 'flex' : 'hidden lg:flex')}>
        {selectedId ? (
          <ChatThread
            key={selectedId}
            conversationId={selectedId}
            meId={user?.id}
            onBack={() => openConversation(null)}
            onActivity={loadConversations}
            onDeleted={handleDeleted}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-[var(--muted)]">
            <MessageCircle className="h-10 w-10 opacity-50" />
            <p className="font-medium">Select a chat to start messaging</p>
            <p className="text-sm">Tap <b>New</b> to message anyone on JLR Fleetlink{role === 'user' ? ', or chat with support if you have a concern' : ''}.</p>
          </div>
        )}
      </section>
    </div>
  );
}
