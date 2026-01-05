export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  status: 'online' | 'offline' | 'away' | 'busy';
  status_message: string | null;
  last_seen: string;
  created_at: string;
  updated_at: string;
}

export interface Space {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  is_private: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SpaceMember {
  id: string;
  space_id: string;
  user_id: string;
  role: 'owner' | 'moderator' | 'member';
  joined_at: string;
  user?: User;
}

export interface DirectMessage {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  user1?: User;
  user2?: User;
}

export interface Message {
  id: string;
  content: string;
  sender_id: string;
  space_id: string | null;
  dm_id: string | null;
  parent_id: string | null;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  sender?: User;
  file_url?: string | null;
  file_name?: string | null;
  file_type?: string | null;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  user?: User;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'message' | 'mention' | 'reaction' | 'space_invite';
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface TypingIndicator {
  user_id: string;
  space_id: string | null;
  dm_id: string | null;
  user?: User;
}

export interface FileUpload {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploaded_by: string;
  message_id: string | null;
  created_at: string;
}

export type ChatType = 'space' | 'dm';

export interface ChatContext {
  type: ChatType;
  id: string;
  name: string;
  avatar?: string | null;
}
