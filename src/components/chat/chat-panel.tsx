'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useChatStore } from '@/store/chat-store';
import { useAuth } from '@/components/auth/auth-provider';
import { supabase } from '@/lib/supabase';
import { Message } from '@/types/database';
import { ChatHeader } from './chat-header';
import { MessageList } from './message-list';
import { MessageInput } from './message-input';
import { MessageCircle, Hash, Users, Menu } from 'lucide-react';

export function ChatPanel() {
  const { profile } = useAuth();
  const {
    activeChat,
    messages,
    setMessages,
    addMessage,
    updateMessage,
    removeMessage,
    typingUsers,
    setSidebarOpen,
    users,
    addUser,
    messageCache,
  } = useChatStore();
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previousChatIdRef = useRef<string | null>(null);

  // Check if we have cached messages for this chat
  const hasCachedMessages = useMemo(() => {
    if (!activeChat) return false;
    return messageCache.has(activeChat.id) && messageCache.get(activeChat.id)!.size > 0;
  }, [activeChat, messageCache]);

  const fetchMessages = useCallback(async () => {
    if (!activeChat) return;

    // Skip fetch if we already have cached messages (instant load)
    if (hasCachedMessages && previousChatIdRef.current !== activeChat.id) {
      previousChatIdRef.current = activeChat.id;
      // Still fetch in background to ensure data is fresh
      fetchMessagesBackground();
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id (*)
        `)
        .order('created_at', { ascending: true })
        .limit(100);

      if (activeChat.type === 'space') {
        query = query.eq('space_id', activeChat.id);
      } else {
        query = query.eq('dm_id', activeChat.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setMessages(data || [], activeChat.id);

      // Cache users from messages
      data?.forEach((msg) => {
        if (msg.sender && !users[msg.sender.id]) {
          addUser(msg.sender);
        }
      });
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [activeChat, hasCachedMessages, setMessages, users, addUser]);

  // Background fetch for fresh data
  const fetchMessagesBackground = useCallback(async () => {
    if (!activeChat) return;

    try {
      let query = supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id (*)
        `)
        .order('created_at', { ascending: true })
        .limit(100);

      if (activeChat.type === 'space') {
        query = query.eq('space_id', activeChat.id);
      } else {
        query = query.eq('dm_id', activeChat.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      if (data) {
        setMessages(data, activeChat.id);
        // Cache users
        data.forEach((msg) => {
          if (msg.sender && !users[msg.sender.id]) {
            addUser(msg.sender);
          }
        });
      }
    } catch (error) {
      console.error('Error fetching messages in background:', error);
    }
  }, [activeChat, setMessages, users, addUser]);

  const subscribeToMessages = useCallback(() => {
    if (!activeChat) return;

    const channelName = `messages:${activeChat.type}:${activeChat.id}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: activeChat.type === 'space'
            ? `space_id=eq.${activeChat.id}`
            : `dm_id=eq.${activeChat.id}`,
        },
        async (payload) => {
          const newMessage = payload.new as Message;
          const cachedUser = useChatStore.getState().users[newMessage.sender_id];

          if (cachedUser) {
            addMessage({ ...newMessage, sender: cachedUser });
          } else {
            // Fetch sender info and cache it
            const { data } = await supabase
              .from('messages')
              .select('*, sender:sender_id (*)')
              .eq('id', newMessage.id)
              .single();

            if (data) {
              addMessage(data);
              if (data.sender) {
                addUser(data.sender);
              }
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: activeChat.type === 'space'
            ? `space_id=eq.${activeChat.id}`
            : `dm_id=eq.${activeChat.id}`,
        },
        (payload) => {
          const updatedMessage = payload.new as Message;
          const existingMessage = useChatStore.getState().messages.find(m => m.id === updatedMessage.id);

          if (existingMessage?.sender) {
            updateMessage({ ...updatedMessage, sender: existingMessage.sender });
          } else {
            updateMessage(updatedMessage);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: activeChat.type === 'space'
            ? `space_id=eq.${activeChat.id}`
            : `dm_id=eq.${activeChat.id}`,
        },
        (payload) => {
          removeMessage(payload.old.id);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [activeChat, addMessage, updateMessage, removeMessage, addUser]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    if (activeChat) {
      fetchMessages();
      cleanup = subscribeToMessages();
    }

    return () => {
      cleanup?.();
    };
  }, [activeChat?.id, fetchMessages, subscribeToMessages]);

  // Memoized handlers
  const handleSendMessage = useCallback(async (content: string, file?: File) => {
    if (!activeChat || !profile) return;

    try {
      let fileUrl = null;
      let fileName = null;
      let fileType = null;

      if (file) {
        const filePath = `${activeChat.id}/${Date.now()}-${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from('files')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('files')
          .getPublicUrl(filePath);

        fileUrl = publicUrl;
        fileName = file.name;
        fileType = file.type;
      }

      const messageData = {
        content,
        sender_id: profile.id,
        space_id: activeChat.type === 'space' ? activeChat.id : null,
        dm_id: activeChat.type === 'dm' ? activeChat.id : null,
        file_url: fileUrl,
        file_name: fileName,
        file_type: fileType,
      };

      const { error } = await supabase
        .from('messages')
        .insert(messageData);

      if (error) throw error;
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [activeChat, profile]);

  const handleEditMessage = useCallback(async (messageId: string, content: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ content, is_edited: true })
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      console.error('Error editing message:', error);
    }
  }, []);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  }, []);

  const handleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!profile) return;

    try {
      const { data: existing } = await supabase
        .from('message_reactions')
        .select()
        .eq('message_id', messageId)
        .eq('user_id', profile.id)
        .eq('emoji', emoji)
        .single();

      if (existing) {
        await supabase
          .from('message_reactions')
          .delete()
          .eq('id', existing.id);
      } else {
        await supabase
          .from('message_reactions')
          .insert({
            message_id: messageId,
            user_id: profile.id,
            emoji,
          });
      }
    } catch (error) {
      console.error('Error toggling reaction:', error);
    }
  }, [profile]);

  const handleOpenSidebar = useCallback(() => {
    setSidebarOpen(true);
  }, [setSidebarOpen]);

  // Memoize typing users for current chat
  const currentTypingUsers = useMemo(
    () => (activeChat ? typingUsers[activeChat.id] || [] : []),
    [activeChat, typingUsers]
  );

  if (!activeChat) {
    return (
      <div className="flex-1 flex flex-col bg-slate-900">
        {/* Mobile header with menu button */}
        <div className="lg:hidden h-14 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm flex items-center px-2 flex-shrink-0">
          <button
            onClick={handleOpenSidebar}
            className="p-2 text-slate-400 hover:text-white active:text-white hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors touch-manipulation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 flex items-center justify-center">
            <h1 className="font-semibold text-white text-sm">Helix Chat</h1>
          </div>
          <div className="w-9" />
        </div>

        {/* Welcome content */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-md w-full">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <MessageCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Welcome to Helix Chat</h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Select a space or start a direct message to begin chatting with your team.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 mt-6 sm:mt-8">
              <div className="flex items-center gap-2 text-slate-500 text-sm sm:text-base">
                <Hash className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Spaces for teams</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500 text-sm sm:text-base">
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Direct messages</span>
              </div>
            </div>

            <button
              onClick={handleOpenSidebar}
              className="lg:hidden mt-8 px-6 py-3 bg-purple-500 hover:bg-purple-600 active:bg-purple-700 text-white font-medium rounded-xl transition-colors touch-manipulation"
            >
              Open Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-900 min-h-0 w-full">
      <ChatHeader chat={activeChat} />

      <MessageList
        messages={messages}
        currentUserId={profile?.id || ''}
        loading={loading && !hasCachedMessages}
        onEdit={handleEditMessage}
        onDelete={handleDeleteMessage}
        onReaction={handleReaction}
      />

      <div ref={messagesEndRef} />

      <MessageInput
        onSend={handleSendMessage}
        chatId={activeChat.id}
        typingUsers={currentTypingUsers}
      />
    </div>
  );
}
