# Helix Chat

A modern, real-time messaging and collaboration platform inspired by Google Chat. Built with Next.js, Supabase, and Tailwind CSS.

## Features

- **Real-time Messaging**: Instant message delivery with WebSocket connections
- **Spaces (Group Chats)**: Create public or private spaces for team collaboration
- **Direct Messages**: One-on-one conversations with team members
- **User Presence**: See who's online, away, or offline
- **Typing Indicators**: Know when someone is typing
- **File Sharing**: Upload and share images, documents, and files
- **Message Reactions**: React to messages with emojis
- **Message Search**: Full-text search across conversations
- **Authentication**: Google OAuth and email/password login
- **Notifications**: In-app and browser push notifications
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Backend**: Supabase (Auth, Database, Realtime, Storage)
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- A Supabase account

### 1. Clone and Install

```bash
cd Helix_Chat
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the schema from `supabase/schema.sql`
3. Enable **Realtime** for the following tables:
   - `messages`
   - `users`
   - `space_members`
   - `notifications`

4. Set up **Storage** buckets:
   - Create a bucket named `avatars` (public)
   - Create a bucket named `files` (public)

5. Configure **Authentication**:
   - Enable Email/Password provider
   - (Optional) Enable Google OAuth provider

### 3. Configure Environment Variables

Update `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Find these in your Supabase project: **Settings > API**

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── auth/callback/      # OAuth callback handler
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Main page
├── components/
│   ├── auth/               # Authentication components
│   ├── chat/               # Chat components (messages, input)
│   ├── sidebar/            # Sidebar components (spaces, DMs)
│   └── ui/                 # Reusable UI components
├── hooks/                  # Custom React hooks
├── lib/                    # Utilities and Supabase client
├── store/                  # Zustand state management
└── types/                  # TypeScript type definitions
```

## Database Schema

Key tables:
- `users` - User profiles and presence
- `spaces` - Group chat channels
- `space_members` - Space membership and roles
- `direct_messages` - DM conversations
- `messages` - All messages
- `message_reactions` - Emoji reactions
- `notifications` - User notifications

See `supabase/schema.sql` for the complete schema with Row Level Security policies.

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy

### Other Platforms

```bash
npm run build
npm start
```

## License

MIT
