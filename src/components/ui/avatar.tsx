'use client';

import { User } from '@/types/database';
import { cn } from '@/lib/utils';

interface AvatarProps {
  user?: User | null;
  name?: string;
  src?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showStatus?: boolean;
  className?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
};

const statusSizeClasses = {
  xs: 'w-2 h-2 border',
  sm: 'w-2.5 h-2.5 border',
  md: 'w-3 h-3 border-2',
  lg: 'w-3.5 h-3.5 border-2',
  xl: 'w-4 h-4 border-2',
};

const statusColors = {
  online: 'bg-green-500',
  offline: 'bg-slate-500',
  away: 'bg-yellow-500',
  busy: 'bg-red-500',
};

export function Avatar({ user, name, src, size = 'md', showStatus = false, className }: AvatarProps) {
  const displayName = user?.full_name || name || 'User';
  const avatarUrl = user?.avatar_url || src;
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const status = user?.status || 'offline';

  return (
    <div className={cn('relative inline-flex', className)}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={displayName}
          className={cn(
            'rounded-full object-cover bg-slate-700',
            sizeClasses[size]
          )}
        />
      ) : (
        <div
          className={cn(
            'rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center font-medium text-white',
            sizeClasses[size]
          )}
        >
          {initials}
        </div>
      )}
      {showStatus && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-slate-800',
            statusSizeClasses[size],
            statusColors[status]
          )}
        />
      )}
    </div>
  );
}
