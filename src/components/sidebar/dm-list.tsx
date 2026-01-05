'use client';

import { memo, useCallback, useMemo } from 'react';
import { DirectMessage, User } from '@/types/database';
import { useChatStore } from '@/store/chat-store';
import { Avatar } from '@/components/ui/avatar';
import { MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DirectMessageListProps {
  directMessages: DirectMessage[];
  currentUserId: string;
}

// Memoized individual DM item
const DMItem = memo(function DMItem({
  otherUser,
  isActive,
  onClick,
}: {
  otherUser: User;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left',
        isActive
          ? 'bg-purple-500/20 text-purple-300'
          : 'text-slate-300 hover:bg-slate-800'
      )}
    >
      <Avatar user={otherUser} size="sm" showStatus />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{otherUser.full_name}</p>
        <p className="text-xs text-slate-500 truncate">
          {otherUser.status === 'online' ? 'Active now' : 'Offline'}
        </p>
      </div>
    </button>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.otherUser.id === nextProps.otherUser.id &&
    prevProps.otherUser.full_name === nextProps.otherUser.full_name &&
    prevProps.otherUser.avatar_url === nextProps.otherUser.avatar_url &&
    prevProps.otherUser.status === nextProps.otherUser.status &&
    prevProps.isActive === nextProps.isActive
  );
});

// Memoized DirectMessageList component
export const DirectMessageList = memo(function DirectMessageList({
  directMessages,
  currentUserId,
}: DirectMessageListProps) {
  const { activeChat, setActiveChat } = useChatStore();

  // Pre-compute other users for each DM - O(n) once
  const dmWithOtherUsers = useMemo(() => {
    return directMessages.map((dm) => ({
      dm,
      otherUser: dm.user1_id === currentUserId ? dm.user2 : dm.user1,
    })).filter((item) => item.otherUser !== null) as Array<{
      dm: DirectMessage;
      otherUser: User;
    }>;
  }, [directMessages, currentUserId]);

  const handleDMClick = useCallback((dm: DirectMessage, otherUser: User) => {
    setActiveChat({
      type: 'dm',
      id: dm.id,
      name: otherUser.full_name,
      avatar: otherUser.avatar_url,
    });
  }, [setActiveChat]);

  if (dmWithOtherUsers.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-sm text-slate-400">No conversations yet</p>
        <p className="text-xs text-slate-500 mt-1">Start a direct message</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {dmWithOtherUsers.map(({ dm, otherUser }) => (
        <DMItem
          key={dm.id}
          otherUser={otherUser}
          isActive={activeChat?.id === dm.id}
          onClick={() => handleDMClick(dm, otherUser)}
        />
      ))}
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if the array reference or currentUserId changes
  return (
    prevProps.directMessages === nextProps.directMessages &&
    prevProps.currentUserId === nextProps.currentUserId
  );
});
