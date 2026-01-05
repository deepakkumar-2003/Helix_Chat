'use client';

import { useAuth } from '@/components/auth/auth-provider';
import { LoginForm } from '@/components/auth/login-form';
import { Sidebar } from '@/components/sidebar/sidebar';
import { ChatPanel } from '@/components/chat/chat-panel';
import { SearchPanel } from '@/components/chat/search-panel';
import { usePresence } from '@/hooks/use-presence';
import { useNotifications } from '@/hooks/use-notifications';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { user, loading } = useAuth();

  // Initialize hooks (only active when user is logged in)
  usePresence();
  useNotifications();

  if (loading) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-slate-950">
        <div className="text-center px-4">
          <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm sm:text-base">Loading Helix Chat...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return (
    <div className="h-screen h-[100dvh] flex overflow-hidden bg-slate-950">
      <Sidebar />
      <main className="flex-1 flex relative min-w-0 w-full">
        <ChatPanel />
        <SearchPanel />
      </main>
    </div>
  );
}
