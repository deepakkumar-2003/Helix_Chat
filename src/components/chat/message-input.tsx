'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { useChatStore } from '@/store/chat-store';
import { supabase } from '@/lib/supabase';
import {
  Send,
  Paperclip,
  Smile,
  X,
  Image,
  FileText,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface MessageInputProps {
  onSend: (content: string, file?: File) => void;
  chatId: string;
  typingUsers: string[];
}

const emojiList = ['😀', '😂', '🥰', '😎', '🤔', '👍', '👎', '❤️', '🎉', '🔥', '💯', '🚀'];

export function MessageInput({ onSend, chatId, typingUsers }: MessageInputProps) {
  const { profile } = useAuth();
  const { users } = useChatStore();
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Create and reuse a single channel for typing indicators
  useEffect(() => {
    if (!chatId) return;

    // Create channel once per chat
    channelRef.current = supabase.channel(`typing:${chatId}`);
    channelRef.current.subscribe();

    return () => {
      // Cleanup channel on unmount or chat change
      channelRef.current?.unsubscribe();
      channelRef.current = null;
    };
  }, [chatId]);

  // Handle typing indicator with debounce
  const sendTypingIndicator = useCallback(async (typing: boolean) => {
    if (!profile || !channelRef.current) return;

    try {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { user_id: profile.id, typing },
      });
    } catch (error) {
      // Silently handle errors - typing indicators are not critical
    }
  }, [profile]);

  useEffect(() => {
    if (content && !isTyping) {
      setIsTyping(true);
      sendTypingIndicator(true);
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator
    if (content) {
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingIndicator(false);
        setIsTyping(false);
      }, 3000);
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [content, isTyping, sendTypingIndicator]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!content.trim() && !file) || sending) return;

    setSending(true);
    try {
      await onSend(content.trim(), file || undefined);
      setContent('');
      setFile(null);
      inputRef.current?.focus();
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // 10MB limit
      if (selectedFile.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      setFile(selectedFile);
    }
  };

  const insertEmoji = (emoji: string) => {
    setContent((prev) => prev + emoji);
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  const typingUserNames = typingUsers
    .filter((id) => id !== profile?.id)
    .map((id) => users[id]?.full_name || 'Someone')
    .slice(0, 3);

  return (
    <div className="p-2 sm:p-4 border-t border-slate-800 bg-slate-900/50 backdrop-blur-sm flex-shrink-0">
      {/* Typing indicator */}
      {typingUserNames.length > 0 && (
        <div className="text-xs text-slate-400 mb-2 flex items-center gap-1 px-1">
          <span className="flex gap-0.5">
            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
          <span className="truncate">
            {typingUserNames.length === 1
              ? `${typingUserNames[0]} is typing...`
              : typingUserNames.length === 2
              ? `${typingUserNames[0]} and ${typingUserNames[1]} are typing...`
              : `${typingUserNames.slice(0, 2).join(', ')} and ${typingUserNames.length - 2} more are typing...`}
          </span>
        </div>
      )}

      {/* File preview */}
      {file && (
        <div className="mb-2 sm:mb-3 inline-flex items-center gap-2 bg-slate-800 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 max-w-full">
          {file.type.startsWith('image/') ? (
            <Image className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400 flex-shrink-0" />
          ) : (
            <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400 flex-shrink-0" />
          )}
          <span className="text-xs sm:text-sm text-slate-300 truncate">
            {file.name}
          </span>
          <button
            onClick={() => setFile(null)}
            className="p-1 text-slate-400 hover:text-white active:text-white transition-colors flex-shrink-0 touch-manipulation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-1 sm:gap-2">
        {/* File upload */}
        <div className="relative flex-shrink-0">
          <input
            type="file"
            id="file-upload"
            onChange={handleFileSelect}
            className="hidden"
          />
          <label
            htmlFor="file-upload"
            className="p-2 sm:p-2.5 text-slate-400 hover:text-white active:text-white hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors cursor-pointer block touch-manipulation"
          >
            <Paperclip className="w-5 h-5" />
          </label>
        </div>

        {/* Message input */}
        <div className="flex-1 relative min-w-0">
          <textarea
            ref={inputRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 sm:py-3 px-3 sm:px-4 pr-10 sm:pr-12 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none max-h-32 text-base"
            style={{ minHeight: '44px' }}
          />

          {/* Emoji picker */}
          <div className="absolute right-1.5 sm:right-2 bottom-1.5 sm:bottom-2">
            <button
              type="button"
              onClick={() => setShowEmoji(!showEmoji)}
              className="p-1 sm:p-1.5 text-slate-400 hover:text-white active:text-white transition-colors touch-manipulation"
            >
              <Smile className="w-5 h-5" />
            </button>

            {showEmoji && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowEmoji(false)}
                />
                <div className="absolute bottom-full right-0 mb-2 bg-slate-800 rounded-xl border border-slate-700 p-1.5 sm:p-2 shadow-lg z-20">
                  <div className="grid grid-cols-6 gap-0.5 sm:gap-1">
                    {emojiList.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => insertEmoji(emoji)}
                        className="p-1.5 sm:p-2 hover:bg-slate-700 active:bg-slate-600 rounded transition-colors text-lg sm:text-xl touch-manipulation"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Send button */}
        <button
          type="submit"
          disabled={(!content.trim() && !file) || sending}
          className={cn(
            'p-2 sm:p-2.5 rounded-xl transition-all flex-shrink-0 touch-manipulation',
            content.trim() || file
              ? 'bg-purple-500 hover:bg-purple-600 active:bg-purple-700 text-white'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          )}
        >
          {sending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </form>
    </div>
  );
}
