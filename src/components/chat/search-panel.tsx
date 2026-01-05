'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useChatStore } from '@/store/chat-store';
import { Message } from '@/types/database';
import { Avatar } from '@/components/ui/avatar';
import { formatDate } from '@/lib/utils';
import { Search, X, Loader2 } from 'lucide-react';

export function SearchPanel() {
  const { isSearching, setIsSearching, activeChat } = useChatStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const searchMessages = async () => {
      if (!query.trim() || !activeChat) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        let searchQuery = supabase
          .from('messages')
          .select('*, sender:sender_id (*)')
          .ilike('content', `%${query}%`)
          .order('created_at', { ascending: false })
          .limit(20);

        if (activeChat.type === 'space') {
          searchQuery = searchQuery.eq('space_id', activeChat.id);
        } else {
          searchQuery = searchQuery.eq('dm_id', activeChat.id);
        }

        const { data, error } = await searchQuery;

        if (!error && data) {
          setResults(data);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchMessages, 300);
    return () => clearTimeout(debounce);
  }, [query, activeChat]);

  if (!isSearching) return null;

  return (
    <>
      {/* Mobile overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-10 sm:hidden"
        onClick={() => setIsSearching(false)}
      />

      {/* Search panel */}
      <div className="fixed sm:absolute inset-x-0 sm:inset-x-auto right-0 top-14 sm:top-16 bottom-0 w-full sm:w-80 bg-slate-900 border-l border-slate-800 flex flex-col z-20 sm:z-10">
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <h3 className="font-semibold text-white text-sm sm:text-base">Search Messages</h3>
            <button
              onClick={() => setIsSearching(false)}
              className="p-1.5 sm:p-1 text-slate-400 hover:text-white active:text-white transition-colors touch-manipulation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              autoFocus
              className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 sm:py-2.5 pl-9 sm:pl-10 pr-3 sm:pr-4 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm sm:text-base px-4">
              {query ? 'No messages found' : 'Enter a search term'}
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {results.map((message) => (
                <div
                  key={message.id}
                  className="p-3 sm:p-4 hover:bg-slate-800/50 active:bg-slate-800 cursor-pointer transition-colors touch-manipulation"
                >
                  <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                    <Avatar user={message.sender} size="xs" />
                    <span className="text-xs sm:text-sm font-medium text-white truncate">
                      {message.sender?.full_name}
                    </span>
                    <span className="text-xs text-slate-500 flex-shrink-0">
                      {formatDate(message.created_at)}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 line-clamp-2">
                    {message.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
