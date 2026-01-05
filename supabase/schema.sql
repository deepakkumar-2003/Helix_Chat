-- Helix Chat Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'away', 'busy')),
  status_message TEXT,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spaces (Group Chats)
CREATE TABLE public.spaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  is_private BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Space Members
CREATE TABLE public.space_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  space_id UUID REFERENCES public.spaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'moderator', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(space_id, user_id)
);

-- Direct Messages (DM Conversations)
CREATE TABLE public.direct_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user1_id, user2_id),
  CHECK (user1_id < user2_id)
);

-- Messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content TEXT NOT NULL,
  sender_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  space_id UUID REFERENCES public.spaces(id) ON DELETE CASCADE,
  dm_id UUID REFERENCES public.direct_messages(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  is_edited BOOLEAN DEFAULT false,
  file_url TEXT,
  file_name TEXT,
  file_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (
    (space_id IS NOT NULL AND dm_id IS NULL) OR
    (space_id IS NULL AND dm_id IS NOT NULL)
  )
);

-- Message Reactions
CREATE TABLE public.message_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('message', 'mention', 'reaction', 'space_invite')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_messages_space_id ON public.messages(space_id);
CREATE INDEX idx_messages_dm_id ON public.messages(dm_id);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_space_members_user_id ON public.space_members(user_id);
CREATE INDEX idx_space_members_space_id ON public.space_members(space_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_direct_messages_user1 ON public.direct_messages(user1_id);
CREATE INDEX idx_direct_messages_user2 ON public.direct_messages(user2_id);

-- Full-text search on messages
CREATE INDEX idx_messages_content_search ON public.messages USING GIN (to_tsvector('english', content));

-- Row Level Security Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.space_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view all users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- Spaces policies
CREATE POLICY "Anyone can view public spaces" ON public.spaces FOR SELECT USING (NOT is_private OR EXISTS (
  SELECT 1 FROM public.space_members WHERE space_id = spaces.id AND user_id = auth.uid()
));
CREATE POLICY "Authenticated users can create spaces" ON public.spaces FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Space owners can update spaces" ON public.spaces FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.space_members WHERE space_id = spaces.id AND user_id = auth.uid() AND role = 'owner')
);
CREATE POLICY "Space owners can delete spaces" ON public.spaces FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.space_members WHERE space_id = spaces.id AND user_id = auth.uid() AND role = 'owner')
);

-- Space members policies
CREATE POLICY "Members can view space members" ON public.space_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.space_members sm WHERE sm.space_id = space_members.space_id AND sm.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.spaces WHERE id = space_members.space_id AND NOT is_private)
);
CREATE POLICY "Space owners/mods can add members" ON public.space_members FOR INSERT WITH CHECK (
  -- Space creator can add themselves as first member (owner)
  (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.spaces WHERE id = space_members.space_id AND created_by = auth.uid()))
  -- Existing owners/mods can add other members
  OR EXISTS (SELECT 1 FROM public.space_members WHERE space_id = space_members.space_id AND user_id = auth.uid() AND role IN ('owner', 'moderator'))
  -- Users can join public spaces
  OR (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.spaces WHERE id = space_members.space_id AND NOT is_private))
);
CREATE POLICY "Members can leave spaces" ON public.space_members FOR DELETE USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.space_members WHERE space_id = space_members.space_id AND user_id = auth.uid() AND role IN ('owner', 'moderator'))
);

-- Direct messages policies
CREATE POLICY "Users can view their DMs" ON public.direct_messages FOR SELECT USING (
  user1_id = auth.uid() OR user2_id = auth.uid()
);
CREATE POLICY "Users can create DMs" ON public.direct_messages FOR INSERT WITH CHECK (
  user1_id = auth.uid() OR user2_id = auth.uid()
);

-- Messages policies
CREATE POLICY "Users can view messages in their spaces/DMs" ON public.messages FOR SELECT USING (
  (space_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.space_members WHERE space_id = messages.space_id AND user_id = auth.uid()
  )) OR
  (dm_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.direct_messages WHERE id = messages.dm_id AND (user1_id = auth.uid() OR user2_id = auth.uid())
  ))
);
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND (
    (space_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.space_members WHERE space_id = messages.space_id AND user_id = auth.uid()
    )) OR
    (dm_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.direct_messages WHERE id = messages.dm_id AND (user1_id = auth.uid() OR user2_id = auth.uid())
    ))
  )
);
CREATE POLICY "Users can edit own messages" ON public.messages FOR UPDATE USING (sender_id = auth.uid());
CREATE POLICY "Users can delete own messages" ON public.messages FOR DELETE USING (sender_id = auth.uid());

-- Message reactions policies
CREATE POLICY "Users can view reactions" ON public.message_reactions FOR SELECT USING (true);
CREATE POLICY "Users can add reactions" ON public.message_reactions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can remove own reactions" ON public.message_reactions FOR DELETE USING (user_id = auth.uid());

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_spaces_updated_at BEFORE UPDATE ON public.spaces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Enable Realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.space_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
