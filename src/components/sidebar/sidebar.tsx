'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { useChatStore } from '@/store/chat-store';
import { supabase } from '@/lib/supabase';
import { Avatar } from '@/components/ui/avatar';
import { SpaceList } from './space-list';
import { DirectMessageList } from './dm-list';
import { CreateSpaceModal } from './create-space-modal';
import { UserProfileModal } from './user-profile-modal';
import { NewDMModal } from './new-dm-modal';
import {
  MessageCircle,
  Search,
  Plus,
  Bell,
  LogOut,
  Users,
  Hash,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const getStatusLabel = (status?: string) => {
  switch (status) {
    case 'online': return 'Available';
    case 'away': return 'Away';
    case 'busy': return 'Busy';
    case 'offline': return 'Offline';
    default: return 'Available';
  }
};

export function Sidebar() {
  const { profile, signOut } = useAuth();
  const { spaces, setSpaces, directMessages, setDirectMessages, notifications, sidebarOpen, setSidebarOpen } = useChatStore();
  const [showCreateSpace, setShowCreateSpace] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showNewDM, setShowNewDM] = useState(false);
  const [activeSection, setActiveSection] = useState<'spaces' | 'dms'>('spaces');
  const [searchQuery, setSearchQuery] = useState('');

  // Memoize fetch functions to prevent recreation on each render
  const fetchSpaces = useCallback(async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('space_members')
      .select(`
        space_id,
        spaces:space_id (
          id,
          name,
          description,
          avatar_url,
          is_private,
          created_by,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', profile.id);

    if (!error && data) {
      const spaceData = data
        .map((item: any) => item.spaces)
        .filter(Boolean);
      setSpaces(spaceData);
    }
  }, [profile, setSpaces]);

  const fetchDirectMessages = useCallback(async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('direct_messages')
      .select(`
        *,
        user1:user1_id (*),
        user2:user2_id (*)
      `)
      .or(`user1_id.eq.${profile.id},user2_id.eq.${profile.id}`);

    if (!error && data) {
      setDirectMessages(data);
    }
  }, [profile, setDirectMessages]);

  useEffect(() => {
    if (profile) {
      // Fetch spaces and DMs in parallel for faster loading
      Promise.all([fetchSpaces(), fetchDirectMessages()]);
    }
  }, [profile, fetchSpaces, fetchDirectMessages]);

  // Memoize unread count - O(n) but only recalculates when notifications change
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  // Memoize search query lowercase for consistent comparison
  const searchQueryLower = useMemo(
    () => searchQuery.toLowerCase(),
    [searchQuery]
  );

  // Memoize filtered spaces - O(n) but only when spaces or searchQuery changes
  const filteredSpaces = useMemo(
    () => spaces.filter((space) =>
      space.name.toLowerCase().includes(searchQueryLower)
    ),
    [spaces, searchQueryLower]
  );

  // Memoize filtered DMs - O(n) but only when directMessages, profile, or searchQuery changes
  const filteredDMs = useMemo(
    () => directMessages.filter((dm) => {
      const otherUser = dm.user1_id === profile?.id ? dm.user2 : dm.user1;
      return otherUser?.full_name.toLowerCase().includes(searchQueryLower);
    }),
    [directMessages, profile?.id, searchQueryLower]
  );

  // Memoize handlers
  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, [setSidebarOpen]);

  const handleOpenCreateSpace = useCallback(() => {
    setShowCreateSpace(true);
  }, []);

  const handleOpenNewDM = useCallback(() => {
    setShowNewDM(true);
  }, []);

  const handleOpenProfile = useCallback(() => {
    setShowProfile(true);
  }, []);

  const handleCloseCreateSpace = useCallback(() => {
    setShowCreateSpace(false);
  }, []);

  const handleCloseProfile = useCallback(() => {
    setShowProfile(false);
  }, []);

  const handleCloseNewDM = useCallback(() => {
    setShowNewDM(false);
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleSetSpacesSection = useCallback(() => {
    setActiveSection('spaces');
  }, []);

  const handleSetDMsSection = useCallback(() => {
    setActiveSection('dms');
  }, []);

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={handleCloseSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-50 w-[85vw] xs:w-72 sm:w-80 lg:w-72 xl:w-80 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:transition-none will-change-transform',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="font-bold text-white text-sm sm:text-base truncate">Helix Chat</h1>
                <p className="text-xs text-slate-400 truncate">Team workspace</p>
              </div>
            </div>
            <button
              onClick={handleCloseSidebar}
              className="lg:hidden p-2 -mr-1 text-slate-400 hover:text-white active:text-white transition-colors touch-manipulation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="mt-3 sm:mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 sm:py-2.5 pl-9 sm:pl-10 pr-3 sm:pr-4 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 flex-shrink-0">
          <button
            onClick={handleSetSpacesSection}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-colors touch-manipulation',
              activeSection === 'spaces'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-slate-400 hover:text-white active:text-white'
            )}
          >
            <Hash className="w-4 h-4" />
            Spaces
          </button>
          <button
            onClick={handleSetDMsSection}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-colors touch-manipulation',
              activeSection === 'dms'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-slate-400 hover:text-white active:text-white'
            )}
          >
            <Users className="w-4 h-4" />
            Direct
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {activeSection === 'spaces' ? (
            <div className="p-2">
              <div className="flex items-center justify-between px-2 py-1.5 sm:py-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Spaces
                </span>
                <button
                  onClick={handleOpenCreateSpace}
                  className="p-1.5 sm:p-1 text-slate-400 hover:text-white active:text-white hover:bg-slate-800 active:bg-slate-700 rounded transition-colors touch-manipulation"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <SpaceList spaces={filteredSpaces} />
            </div>
          ) : (
            <div className="p-2">
              <div className="flex items-center justify-between px-2 py-1.5 sm:py-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Direct Messages
                </span>
                <button
                  onClick={handleOpenNewDM}
                  className="p-1.5 sm:p-1 text-slate-400 hover:text-white active:text-white hover:bg-slate-800 active:bg-slate-700 rounded transition-colors touch-manipulation"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <DirectMessageList directMessages={filteredDMs} currentUserId={profile?.id || ''} />
            </div>
          )}
        </div>

        {/* User Section */}
        <div className="p-2.5 sm:p-3 border-t border-slate-800 bg-slate-900/50 flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={handleOpenProfile} className="flex-shrink-0 touch-manipulation">
              <Avatar user={profile} size="md" showStatus />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {profile?.full_name}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {profile?.status_message || getStatusLabel(profile?.status)}
              </p>
            </div>
            <div className="flex items-center gap-0.5 sm:gap-1">
              <button className="p-2 text-slate-400 hover:text-white active:text-white hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors relative touch-manipulation">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>
              <button
                onClick={signOut}
                className="p-2 text-slate-400 hover:text-red-400 active:text-red-500 hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors touch-manipulation"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Modals */}
      {showCreateSpace && (
        <CreateSpaceModal onClose={handleCloseCreateSpace} onCreated={fetchSpaces} />
      )}
      {showProfile && (
        <UserProfileModal onClose={handleCloseProfile} />
      )}
      {showNewDM && (
        <NewDMModal onClose={handleCloseNewDM} />
      )}
    </>
  );
}
