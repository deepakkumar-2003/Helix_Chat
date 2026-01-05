'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChatContext } from '@/types/database';
import { useChatStore } from '@/store/chat-store';
import { Avatar } from '@/components/ui/avatar';
import {
  Hash,
  Lock,
  Search,
  Phone,
  Video,
  MoreVertical,
  Users,
  Settings,
  Menu,
  Info,
  UserPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatHeaderProps {
  chat: ChatContext;
}

export function ChatHeader({ chat }: ChatHeaderProps) {
  const { setSidebarOpen, setIsSearching, isSearching } = useChatStore();
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleMenuToggle = () => {
    if (!showMenu && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setShowMenu(!showMenu);
  };

  return (
    <div className="h-14 sm:h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm flex items-center justify-between px-2 sm:px-4 flex-shrink-0">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        {/* Mobile menu button */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden p-2 text-slate-400 hover:text-white active:text-white hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors -ml-1 flex-shrink-0 touch-manipulation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Chat avatar/icon */}
        {chat.type === 'dm' ? (
          <Avatar src={chat.avatar} name={chat.name} size="md" showStatus />
        ) : (
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
            <Hash className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
          </div>
        )}

        {/* Chat info */}
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-white flex items-center gap-2 text-sm sm:text-base truncate">
            {chat.name}
          </h2>
          <p className="text-xs text-slate-400 truncate">
            {chat.type === 'dm' ? 'Direct message' : 'Space'}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
        <button
          onClick={() => setIsSearching(!isSearching)}
          className={cn(
            'p-2 rounded-lg transition-colors touch-manipulation',
            isSearching
              ? 'bg-purple-500/20 text-purple-400'
              : 'text-slate-400 hover:text-white active:text-white hover:bg-slate-800 active:bg-slate-700'
          )}
          title="Search messages"
        >
          <Search className="w-5 h-5" />
        </button>

        {chat.type === 'space' && (
          <button
            className="hidden sm:flex p-2 text-slate-400 hover:text-white active:text-white hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors touch-manipulation"
            title="Members"
          >
            <Users className="w-5 h-5" />
          </button>
        )}

        <button
          className="hidden sm:flex p-2 text-slate-400 hover:text-white active:text-white hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors touch-manipulation"
          title="Info"
        >
          <Info className="w-5 h-5" />
        </button>

        {/* More menu */}
        <div className="relative">
          <button
            ref={buttonRef}
            onClick={handleMenuToggle}
            className="p-2 text-slate-400 hover:text-white active:text-white hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors touch-manipulation"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {showMenu && mounted && createPortal(
            <>
              <div
                className="fixed inset-0 z-[9998]"
                onClick={() => setShowMenu(false)}
              />
              <div
                className="fixed w-48 bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-1 z-[9999]"
                style={{ top: menuPosition.top, right: menuPosition.right }}
              >
                {/* Mobile-only menu items */}
                <button
                  onClick={() => setShowMenu(false)}
                  className="sm:hidden w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 active:bg-slate-600 transition-colors touch-manipulation"
                >
                  <Info className="w-4 h-4" />
                  Info
                </button>
                {chat.type === 'space' && (
                  <>
                    <button
                      onClick={() => setShowMenu(false)}
                      className="sm:hidden w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 active:bg-slate-600 transition-colors touch-manipulation"
                    >
                      <Users className="w-4 h-4" />
                      Members
                    </button>
                    <button
                      onClick={() => setShowMenu(false)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 active:bg-slate-600 transition-colors touch-manipulation"
                    >
                      <UserPlus className="w-4 h-4" />
                      Invite people
                    </button>
                    <button
                      onClick={() => setShowMenu(false)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 active:bg-slate-600 transition-colors touch-manipulation"
                    >
                      <Settings className="w-4 h-4" />
                      Space settings
                    </button>
                    <div className="border-t border-slate-700 my-1" />
                  </>
                )}
                <button
                  onClick={() => setShowMenu(false)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-slate-700 active:bg-slate-600 transition-colors touch-manipulation"
                >
                  {chat.type === 'space' ? 'Leave space' : 'Delete conversation'}
                </button>
              </div>
            </>,
            document.body
          )}
        </div>
      </div>
    </div>
  );
}
