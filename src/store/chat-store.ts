import { create } from 'zustand';
import { User, Space, Message, DirectMessage, ChatContext, Notification, SpaceMember } from '@/types/database';

// Message cache using Map for O(1) lookup by chatId
// Data structure: Map<chatId, Map<messageId, Message>>
type MessageCache = Map<string, Map<string, Message>>;

interface ChatState {
  // User
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;

  // Active chat
  activeChat: ChatContext | null;
  setActiveChat: (chat: ChatContext | null) => void;

  // Spaces
  spaces: Space[];
  setSpaces: (spaces: Space[]) => void;
  addSpace: (space: Space) => void;
  updateSpace: (space: Space) => void;
  removeSpace: (spaceId: string) => void;

  // Space members
  spaceMembers: Record<string, SpaceMember[]>;
  setSpaceMembers: (spaceId: string, members: SpaceMember[]) => void;

  // Direct Messages
  directMessages: DirectMessage[];
  setDirectMessages: (dms: DirectMessage[]) => void;
  addDirectMessage: (dm: DirectMessage) => void;

  // Messages - Now using cache for O(1) operations
  messageCache: MessageCache;
  messages: Message[]; // Derived from cache for current chat
  setMessages: (messages: Message[], chatId?: string) => void;
  addMessage: (message: Message) => void;
  updateMessage: (message: Message) => void;
  removeMessage: (messageId: string) => void;
  getMessagesForChat: (chatId: string) => Message[];
  clearChatMessages: (chatId: string) => void;

  // Users (for presence) - Using Map internally for O(1) lookup
  users: Record<string, User>;
  setUsers: (users: User[]) => void;
  updateUserStatus: (userId: string, status: User['status']) => void;
  addUser: (user: User) => void;

  // Typing indicators
  typingUsers: Record<string, string[]>; // chatId -> userIds
  setTypingUsers: (chatId: string, userIds: string[]) => void;

  // Notifications
  notifications: Notification[];
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markNotificationRead: (notificationId: string) => void;

  // UI State
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSearching: boolean;
  setIsSearching: (searching: boolean) => void;
}

// Helper to convert Map to sorted array - O(n log n)
const mapToSortedArray = (map: Map<string, Message>): Message[] => {
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
};

// Helper to get chat ID from message
const getChatIdFromMessage = (message: Message): string | null => {
  return message.space_id || message.dm_id || null;
};

export const useChatStore = create<ChatState>((set, get) => ({
  // User
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),

  // Active chat - Now preserves cache and updates messages from cache
  activeChat: null,
  setActiveChat: (chat) => {
    const { messageCache } = get();
    if (chat) {
      const chatMessages = messageCache.get(chat.id);
      const messages = chatMessages ? mapToSortedArray(chatMessages) : [];
      set({ activeChat: chat, messages });
    } else {
      set({ activeChat: chat, messages: [] });
    }
  },

  // Spaces
  spaces: [],
  setSpaces: (spaces) => set({ spaces }),
  addSpace: (space) => set((state) => ({ spaces: [...state.spaces, space] })),
  updateSpace: (space) => set((state) => ({
    spaces: state.spaces.map((s) => s.id === space.id ? space : s)
  })),
  removeSpace: (spaceId) => set((state) => ({
    spaces: state.spaces.filter((s) => s.id !== spaceId)
  })),

  // Space members
  spaceMembers: {},
  setSpaceMembers: (spaceId, members) => set((state) => ({
    spaceMembers: { ...state.spaceMembers, [spaceId]: members }
  })),

  // Direct Messages
  directMessages: [],
  setDirectMessages: (dms) => set({ directMessages: dms }),
  addDirectMessage: (dm) => set((state) => ({ directMessages: [...state.directMessages, dm] })),

  // Messages with caching - O(1) operations
  messageCache: new Map(),
  messages: [],

  setMessages: (messages, chatId) => {
    const { activeChat, messageCache } = get();
    const targetChatId = chatId || activeChat?.id;

    if (!targetChatId) {
      set({ messages });
      return;
    }

    // Create new Map for this chat's messages - O(n)
    const chatMessageMap = new Map<string, Message>();
    messages.forEach((msg) => {
      chatMessageMap.set(msg.id, msg);
    });

    // Update cache
    const newCache = new Map(messageCache);
    newCache.set(targetChatId, chatMessageMap);

    // Only update messages array if this is the active chat
    if (activeChat?.id === targetChatId) {
      set({ messageCache: newCache, messages });
    } else {
      set({ messageCache: newCache });
    }
  },

  addMessage: (message) => {
    const { activeChat, messageCache, messages } = get();
    const chatId = getChatIdFromMessage(message);

    if (!chatId) return;

    // Update cache - O(1)
    const newCache = new Map(messageCache);
    const chatMessages = newCache.get(chatId) || new Map<string, Message>();
    const newChatMessages = new Map(chatMessages);
    newChatMessages.set(message.id, message);
    newCache.set(chatId, newChatMessages);

    // Only update messages array if this is the active chat
    if (activeChat?.id === chatId) {
      set({
        messageCache: newCache,
        messages: [...messages, message]
      });
    } else {
      set({ messageCache: newCache });
    }
  },

  updateMessage: (message) => {
    const { activeChat, messageCache, messages } = get();
    const chatId = getChatIdFromMessage(message);

    if (!chatId) return;

    // Update cache - O(1)
    const newCache = new Map(messageCache);
    const chatMessages = newCache.get(chatId);

    if (chatMessages) {
      const newChatMessages = new Map(chatMessages);
      newChatMessages.set(message.id, message);
      newCache.set(chatId, newChatMessages);

      // Only update messages array if this is the active chat
      if (activeChat?.id === chatId) {
        const newMessages = messages.map((m) => m.id === message.id ? message : m);
        set({ messageCache: newCache, messages: newMessages });
      } else {
        set({ messageCache: newCache });
      }
    }
  },

  removeMessage: (messageId) => {
    const { activeChat, messageCache, messages } = get();

    // Find which chat this message belongs to
    let foundChatId: string | null = null;
    for (const [chatId, chatMessages] of messageCache) {
      if (chatMessages.has(messageId)) {
        foundChatId = chatId;
        break;
      }
    }

    if (!foundChatId) return;

    // Update cache - O(1)
    const newCache = new Map(messageCache);
    const chatMessages = newCache.get(foundChatId);

    if (chatMessages) {
      const newChatMessages = new Map(chatMessages);
      newChatMessages.delete(messageId);
      newCache.set(foundChatId, newChatMessages);

      // Only update messages array if this is the active chat
      if (activeChat?.id === foundChatId) {
        const newMessages = messages.filter((m) => m.id !== messageId);
        set({ messageCache: newCache, messages: newMessages });
      } else {
        set({ messageCache: newCache });
      }
    }
  },

  getMessagesForChat: (chatId) => {
    const { messageCache } = get();
    const chatMessages = messageCache.get(chatId);
    return chatMessages ? mapToSortedArray(chatMessages) : [];
  },

  clearChatMessages: (chatId) => {
    const { messageCache, activeChat } = get();
    const newCache = new Map(messageCache);
    newCache.delete(chatId);

    if (activeChat?.id === chatId) {
      set({ messageCache: newCache, messages: [] });
    } else {
      set({ messageCache: newCache });
    }
  },

  // Users - O(1) lookup
  users: {},
  setUsers: (users) => set({
    users: users.reduce((acc, user) => ({ ...acc, [user.id]: user }), {})
  }),
  updateUserStatus: (userId, status) => set((state) => ({
    users: {
      ...state.users,
      [userId]: state.users[userId] ? { ...state.users[userId], status } : state.users[userId]
    }
  })),
  addUser: (user) => set((state) => ({
    users: { ...state.users, [user.id]: user }
  })),

  // Typing indicators
  typingUsers: {},
  setTypingUsers: (chatId, userIds) => set((state) => ({
    typingUsers: { ...state.typingUsers, [chatId]: userIds }
  })),

  // Notifications
  notifications: [],
  setNotifications: (notifications) => set({ notifications }),
  addNotification: (notification) => set((state) => ({
    notifications: [notification, ...state.notifications]
  })),
  markNotificationRead: (notificationId) => set((state) => ({
    notifications: state.notifications.map((n) =>
      n.id === notificationId ? { ...n, is_read: true } : n
    )
  })),

  // UI State
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  isSearching: false,
  setIsSearching: (searching) => set({ isSearching: searching }),
}));

// Selector hooks for optimized subscriptions - prevents unnecessary re-renders
export const useActiveChat = () => useChatStore((state) => state.activeChat);
export const useMessages = () => useChatStore((state) => state.messages);
export const useSpaces = () => useChatStore((state) => state.spaces);
export const useDirectMessages = () => useChatStore((state) => state.directMessages);
export const useUsers = () => useChatStore((state) => state.users);
export const useTypingUsers = (chatId: string) =>
  useChatStore((state) => state.typingUsers[chatId] || []);
