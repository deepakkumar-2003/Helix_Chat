'use client';

import { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { Message } from '@/types/database';
import { MessageItem } from './message-item';
import { formatFullDate } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  loading: boolean;
  onEdit: (messageId: string, content: string) => void;
  onDelete: (messageId: string) => void;
  onReaction: (messageId: string, emoji: string) => void;
}

interface GroupedMessages {
  date: string;
  dateKey: string; // Stable key for React
  messages: Message[];
}

// Pre-compute consecutive message info - O(n) once instead of O(n²) per render
interface ProcessedMessage {
  message: Message;
  isConsecutive: boolean;
}

export function MessageList({
  messages,
  currentUserId,
  loading,
  onEdit,
  onDelete,
  onReaction,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);

  // Memoize handlers to prevent child re-renders
  const handleEdit = useCallback((messageId: string, content: string) => {
    onEdit(messageId, content);
  }, [onEdit]);

  const handleDelete = useCallback((messageId: string) => {
    onDelete(messageId);
  }, [onDelete]);

  const handleReaction = useCallback((messageId: string, emoji: string) => {
    onReaction(messageId, emoji);
  }, [onReaction]);

  // Group messages by date with stable keys and pre-computed consecutive info - O(n)
  const groupedMessages = useMemo(() => {
    const groups: GroupedMessages[] = [];
    let currentDateKey = '';

    // Pre-compute time values for all messages once - O(n)
    const messageTimeMap = new Map<string, number>();
    messages.forEach((msg) => {
      messageTimeMap.set(msg.id, new Date(msg.created_at).getTime());
    });

    messages.forEach((message, index) => {
      const messageDate = new Date(message.created_at).toDateString();

      if (messageDate !== currentDateKey) {
        currentDateKey = messageDate;
        groups.push({
          date: message.created_at,
          dateKey: messageDate, // Use date string as stable key
          messages: [message],
        });
      } else {
        groups[groups.length - 1].messages.push(message);
      }
    });

    return groups;
  }, [messages]);

  // Pre-compute isConsecutive for all messages - O(n) total
  const consecutiveMap = useMemo(() => {
    const map = new Map<string, boolean>();

    groupedMessages.forEach((group) => {
      group.messages.forEach((message, index) => {
        if (index === 0) {
          map.set(message.id, false);
        } else {
          const prevMessage = group.messages[index - 1];
          const currentTime = new Date(message.created_at).getTime();
          const prevTime = new Date(prevMessage.created_at).getTime();
          const isConsecutive =
            prevMessage.sender_id === message.sender_id &&
            currentTime - prevTime < 5 * 60 * 1000; // 5 minutes
          map.set(message.id, isConsecutive);
        }
      });
    });

    return map;
  }, [groupedMessages]);

  // Track scroll position for auto-scroll behavior
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const threshold = 100; // pixels from bottom
    setIsNearBottom(scrollHeight - scrollTop - clientHeight < threshold);
  }, []);

  // Auto-scroll to bottom when new messages arrive (only if already near bottom)
  useEffect(() => {
    if (isNearBottom && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages.length, isNearBottom]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-slate-400 text-sm sm:text-base">No messages yet</p>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Be the first to send a message!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto overscroll-contain px-2 sm:px-4 py-2 sm:py-4 space-y-2 sm:space-y-4"
    >
      {groupedMessages.map((group) => (
        <div key={group.dateKey}>
          {/* Date divider */}
          <div className="flex items-center gap-2 sm:gap-4 my-2 sm:my-4">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap px-1">
              {formatFullDate(group.date)}
            </span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          {/* Messages for this date */}
          <div className="space-y-0.5 sm:space-y-1">
            {group.messages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                isOwn={message.sender_id === currentUserId}
                isConsecutive={consecutiveMap.get(message.id) || false}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onReaction={handleReaction}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
