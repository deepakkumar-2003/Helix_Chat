'use client';

import { memo, useCallback } from 'react';
import { Space } from '@/types/database';
import { useChatStore } from '@/store/chat-store';
import { Hash, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpaceListProps {
  spaces: Space[];
}

// Memoized individual space item
const SpaceItem = memo(function SpaceItem({
  space,
  isActive,
  onClick,
}: {
  space: Space;
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
      <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
        {space.is_private ? (
          <Lock className="w-4 h-4 text-slate-400" />
        ) : (
          <Hash className="w-4 h-4 text-slate-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{space.name}</p>
        {space.description && (
          <p className="text-xs text-slate-500 truncate">{space.description}</p>
        )}
      </div>
    </button>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.space.id === nextProps.space.id &&
    prevProps.space.name === nextProps.space.name &&
    prevProps.space.description === nextProps.space.description &&
    prevProps.space.is_private === nextProps.space.is_private &&
    prevProps.isActive === nextProps.isActive
  );
});

// Memoized SpaceList component
export const SpaceList = memo(function SpaceList({ spaces }: SpaceListProps) {
  const { activeChat, setActiveChat } = useChatStore();

  const handleSpaceClick = useCallback((space: Space) => {
    setActiveChat({
      type: 'space',
      id: space.id,
      name: space.name,
      avatar: space.avatar_url,
    });
  }, [setActiveChat]);

  if (spaces.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <Hash className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-sm text-slate-400">No spaces yet</p>
        <p className="text-xs text-slate-500 mt-1">Create one to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {spaces.map((space) => (
        <SpaceItem
          key={space.id}
          space={space}
          isActive={activeChat?.id === space.id}
          onClick={() => handleSpaceClick(space)}
        />
      ))}
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if the spaces array reference changes
  // This works because we use useMemo in the parent
  return prevProps.spaces === nextProps.spaces;
});
