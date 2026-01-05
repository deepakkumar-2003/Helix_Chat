'use client';

import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useChatStore } from '@/store/chat-store';
import { useAuth } from '@/components/auth/auth-provider';

export function usePresence() {
  const { profile } = useAuth();
  const { setUsers, updateUserStatus, directMessages } = useChatStore();
  const hasFetchedUsers = useRef(false);

  // Only update last_seen timestamp, NOT the user's status
  // Status should only be changed manually by the user
  const updateLastSeen = useCallback(async () => {
    if (!profile) return;

    await supabase
      .from('users')
      .update({
        last_seen: new Date().toISOString(),
      })
      .eq('id', profile.id);
  }, [profile]);

  useEffect(() => {
    if (!profile) return;

    // Update last_seen on page load (don't change status)
    updateLastSeen();

    // Only fetch users once and only fetch relevant users (from DMs)
    const fetchRelevantUsers = async () => {
      if (hasFetchedUsers.current) return;
      hasFetchedUsers.current = true;

      // Get unique user IDs from direct messages
      const dmUserIds = new Set<string>();
      directMessages.forEach(dm => {
        if (dm.user1_id !== profile.id) dmUserIds.add(dm.user1_id);
        if (dm.user2_id !== profile.id) dmUserIds.add(dm.user2_id);
      });

      // Only fetch if there are users to fetch
      if (dmUserIds.size === 0) {
        setUsers([profile]); // At least set the current user
        return;
      }

      const userIdsArray = Array.from(dmUserIds);
      const { data } = await supabase
        .from('users')
        .select('id, email, full_name, avatar_url, status, status_message, last_seen, created_at, updated_at')
        .in('id', userIdsArray);

      if (data) {
        setUsers([profile, ...data]);
      }
    };

    fetchRelevantUsers();

    // Subscribe to user status changes
    const channel = supabase
      .channel('presence')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
        },
        (payload) => {
          if (payload.new.status) {
            updateUserStatus(payload.new.id, payload.new.status);
          }
        }
      )
      .subscribe();

    // Periodically update last_seen while user is active (every 5 minutes)
    const lastSeenInterval = setInterval(() => {
      if (!document.hidden) {
        updateLastSeen();
      }
    }, 5 * 60 * 1000);

    // Update last_seen when user returns to the page
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateLastSeen();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      channel.unsubscribe();
      clearInterval(lastSeenInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [profile, updateLastSeen, setUsers, updateUserStatus, directMessages]);
}
