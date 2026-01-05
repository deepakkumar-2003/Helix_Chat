'use client';

import { useState, memo, useCallback, useMemo } from 'react';
import { Message } from '@/types/database';
import { Avatar } from '@/components/ui/avatar';
import { formatMessageTime } from '@/lib/utils';
import {
  Smile,
  MoreHorizontal,
  Edit2,
  Trash2,
  Copy,
  Check,
  X,
  FileText,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageItemProps {
  message: Message;
  isOwn: boolean;
  isConsecutive: boolean;
  onEdit: (messageId: string, content: string) => void;
  onDelete: (messageId: string) => void;
  onReaction: (messageId: string, emoji: string) => void;
}

const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

// Memoized MessageItem component - only re-renders when props change
export const MessageItem = memo(function MessageItem({
  message,
  isOwn,
  isConsecutive,
  onEdit,
  onDelete,
  onReaction,
}: MessageItemProps) {
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  // Memoize expensive calculations
  const isImage = useMemo(
    () => message.file_type?.startsWith('image/'),
    [message.file_type]
  );

  const formattedTime = useMemo(
    () => formatMessageTime(message.created_at),
    [message.created_at]
  );

  // Memoized handlers to prevent unnecessary re-renders
  const handleEdit = useCallback(() => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit(message.id, editContent);
    }
    setIsEditing(false);
  }, [editContent, message.content, message.id, onEdit]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content);
    setShowMenu(false);
  }, [message.content]);

  const handleMouseEnter = useCallback(() => {
    setShowActions(true);
  }, []);

  const handleMouseLeave = useCallback((e: React.MouseEvent) => {
    // Don't close if menu is open (user might be clicking on it)
    if (showMenu || showReactions) {
      return;
    }
    // Don't close if hovering over a child menu
    const relatedTarget = e.relatedTarget;
    if (
      relatedTarget &&
      relatedTarget instanceof HTMLElement &&
      relatedTarget.closest('.message-action-menu')
    ) {
      return;
    }
    setShowActions(false);
  }, [showMenu, showReactions]);

  const handleTouchStart = useCallback(() => {
    const timer = setTimeout(() => {
      setShowActions(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleClick = useCallback(() => {
    if (window.innerWidth < 640) {
      setShowActions((prev) => !prev);
    }
  }, []);

  const handleReactionClick = useCallback((emoji: string) => {
    onReaction(message.id, emoji);
    setShowReactions(false);
    setShowActions(false);
  }, [message.id, onReaction]);

  const handleDeleteClick = useCallback(() => {
    onDelete(message.id);
    setShowActions(false);
  }, [message.id, onDelete]);

  const handleStartEditing = useCallback(() => {
    setIsEditing(true);
    setShowMenu(false);
    setShowActions(false);
  }, []);

  const closeAllMenus = useCallback(() => {
    setShowMenu(false);
    setShowReactions(false);
    setShowActions(false);
  }, []);

  return (
    <div
      className={cn(
        'group relative flex px-1',
        isConsecutive ? 'mt-0.5' : 'mt-3 sm:mt-4',
        isOwn ? 'justify-end' : 'justify-start'
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onClick={handleClick}
    >
      {/* Avatar - only show for received messages */}
      {!isOwn && (
        <div className="w-8 sm:w-10 flex-shrink-0 mr-2 sm:mr-3">
          {!isConsecutive && message.sender && (
            <Avatar user={message.sender} size="sm" className="sm:hidden" />
          )}
          {!isConsecutive && message.sender && (
            <Avatar user={message.sender} size="md" className="hidden sm:flex" />
          )}
        </div>
      )}

      {/* Content */}
      <div
        className={cn(
          'max-w-[75%] sm:max-w-[70%]',
          isOwn
            ? 'bg-purple-600 rounded-2xl rounded-br-md px-3 sm:px-4 py-2'
            : 'bg-slate-700 rounded-2xl rounded-bl-md px-3 sm:px-4 py-2'
        )}
      >
        {/* Header - only show sender name for received messages */}
        {!isConsecutive && !isOwn && (
          <div className="flex items-baseline gap-1.5 sm:gap-2 mb-0.5 sm:mb-1 flex-wrap">
            <span className="font-semibold text-white text-sm sm:text-base truncate max-w-[150px] sm:max-w-none">
              {message.sender?.full_name || 'Unknown'}
            </span>
          </div>
        )}

        {/* Message content */}
        {isEditing ? (
          <div className="flex items-center gap-1 sm:gap-2">
            <input
              type="text"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleEdit();
                if (e.key === 'Escape') setIsEditing(false);
              }}
              autoFocus
              className="flex-1 bg-slate-800 border border-slate-600 rounded-lg py-1.5 px-2 sm:px-3 text-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={handleEdit}
              className="p-1.5 text-green-400 hover:bg-slate-600 active:bg-slate-500 rounded transition-colors touch-manipulation"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="p-1.5 text-red-400 hover:bg-slate-600 active:bg-slate-500 rounded transition-colors touch-manipulation"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="text-white break-words whitespace-pre-wrap text-sm sm:text-base">
            {message.content}
          </div>
        )}

        {/* Timestamp */}
        <div className={cn(
          'flex items-center gap-1 mt-1',
          isOwn ? 'justify-end' : 'justify-start'
        )}>
          <span className="text-xs text-slate-300/70">
            {formattedTime}
          </span>
          {message.is_edited && (
            <span className="text-xs text-slate-300/70">(edited)</span>
          )}
        </div>

        {/* File attachment */}
        {message.file_url && (
          <div className="mt-2">
            {isImage ? (
              <div className="relative inline-block max-w-full">
                <img
                  src={message.file_url}
                  alt={message.file_name || 'Image'}
                  className="rounded-lg max-h-60 sm:max-h-80 object-contain cursor-pointer hover:opacity-90 active:opacity-80 transition-opacity"
                  onClick={() => window.open(message.file_url!, '_blank')}
                  loading="lazy"
                />
              </div>
            ) : (
              <a
                href={message.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg px-3 sm:px-4 py-2 transition-colors max-w-full',
                  isOwn
                    ? 'bg-purple-700 hover:bg-purple-800 active:bg-purple-900'
                    : 'bg-slate-800 hover:bg-slate-600 active:bg-slate-500'
                )}
              >
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300 flex-shrink-0" />
                <span className="text-xs sm:text-sm text-white truncate">
                  {message.file_name}
                </span>
                <Download className="w-4 h-4 text-slate-300 flex-shrink-0" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* Actions - positioned outside the bubble */}
      {showActions && !isEditing && (
        <div className={cn(
          'absolute -top-3 sm:-top-4 flex items-center gap-0.5 bg-slate-800 rounded-lg border border-slate-700 p-0.5 shadow-lg z-10',
          isOwn ? 'right-0' : 'left-10 sm:left-12'
        )}>
            {/* Quick reactions */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowReactions(!showReactions);
                }}
                className="p-1.5 text-slate-400 hover:text-white active:text-white hover:bg-slate-700 active:bg-slate-600 rounded transition-colors touch-manipulation"
              >
                <Smile className="w-4 h-4" />
              </button>

              {showReactions && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeAllMenus();
                    }}
                  />
                  <div className="message-action-menu absolute bottom-full left-0 mb-1 flex gap-0.5 sm:gap-1 bg-slate-800 rounded-lg border border-slate-700 p-1 shadow-lg z-50">
                  {quickReactions.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReactionClick(emoji);
                      }}
                      className="p-1 sm:p-1.5 hover:bg-slate-700 active:bg-slate-600 rounded transition-colors text-base sm:text-lg touch-manipulation"
                    >
                      {emoji}
                    </button>
                  ))}
                  </div>
                </>
              )}
            </div>

            {/* More actions */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="p-1.5 text-slate-400 hover:text-white active:text-white hover:bg-slate-700 active:bg-slate-600 rounded transition-colors touch-manipulation"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeAllMenus();
                    }}
                  />
                  <div className="message-action-menu absolute top-full right-0 mt-1 w-36 sm:w-40 bg-slate-800 rounded-lg border border-slate-700 py-1 shadow-lg z-50">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy();
                      setShowActions(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 active:bg-slate-600 transition-colors touch-manipulation"
                  >
                    <Copy className="w-4 h-4" />
                    Copy text
                  </button>
                  {isOwn && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEditing();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 active:bg-slate-600 transition-colors touch-manipulation"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-slate-700 active:bg-slate-600 transition-colors touch-manipulation"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </>
                  )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for memo - only re-render when these change
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.is_edited === nextProps.message.is_edited &&
    prevProps.message.file_url === nextProps.message.file_url &&
    prevProps.isOwn === nextProps.isOwn &&
    prevProps.isConsecutive === nextProps.isConsecutive
  );
});
