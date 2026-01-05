'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/auth-provider';
import { useChatStore } from '@/store/chat-store';
import { User } from '@/types/database';
import { Avatar } from '@/components/ui/avatar';
import { X, Search, Loader2, MessageSquare } from 'lucide-react';

interface NewDMModalProps {
  onClose: () => void;
}

export function NewDMModal({ onClose }: NewDMModalProps) {
  const { profile } = useAuth();
  const { setActiveChat, addDirectMessage } = useChatStore();
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .neq('id', profile.id)
        .order('full_name');

      if (!error && data) {
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const startConversation = async (otherUser: User) => {
    if (!profile || creating) return;

    setCreating(true);
    try {
      // Order user IDs to match the constraint
      const [user1_id, user2_id] = [profile.id, otherUser.id].sort();

      // Check if DM already exists
      const { data: existing } = await supabase
        .from('direct_messages')
        .select('*')
        .eq('user1_id', user1_id)
        .eq('user2_id', user2_id)
        .single();

      if (existing) {
        // Use existing DM
        setActiveChat({
          type: 'dm',
          id: existing.id,
          name: otherUser.full_name,
          avatar: otherUser.avatar_url,
        });
      } else {
        // Create new DM
        const { data: newDM, error } = await supabase
          .from('direct_messages')
          .insert({ user1_id, user2_id })
          .select(`*, user1:user1_id (*), user2:user2_id (*)`)
          .single();

        if (error) throw error;

        addDirectMessage(newDM);
        setActiveChat({
          type: 'dm',
          id: newDM.id,
          name: otherUser.full_name,
          avatar: otherUser.avatar_url,
        });
      }

      onClose();
    } catch (error) {
      console.error('Error starting conversation:', error);
    } finally {
      setCreating(false);
    }
  };

  const filteredUsers = users.filter((user) =>
    user.full_name.toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-slate-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl max-h-[85vh] sm:max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
          <h2 className="text-base sm:text-lg font-semibold text-white">New Message</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white active:text-white transition-colors touch-manipulation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 sm:p-4 border-b border-slate-700 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              autoFocus
              className="w-full bg-slate-700 border border-slate-600 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm sm:text-base">
              {search ? 'No users found' : 'No users available'}
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => startConversation(user)}
                  disabled={creating}
                  className="w-full flex items-center gap-3 p-3 sm:p-4 hover:bg-slate-700/50 active:bg-slate-700 transition-colors disabled:opacity-50 touch-manipulation"
                >
                  <Avatar user={user} size="md" showStatus />
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-medium text-white text-sm sm:text-base truncate">{user.full_name}</p>
                    <p className="text-xs sm:text-sm text-slate-400 truncate">{user.email}</p>
                  </div>
                  <MessageSquare className="w-5 h-5 text-slate-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
