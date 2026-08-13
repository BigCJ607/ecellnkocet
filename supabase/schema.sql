-- ==============================================================================
-- EVENT ZERO - SUPABASE DATABASE SCHEMA & SEED SCRIPT (IDEMPOTENT / RE-RUNNABLE)
-- ==============================================================================
-- Run this script in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- You can safely run this script multiple times without duplicate policy errors.
-- ==============================================================================

-- 1. PROFILES TABLE (Extends Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  pnr TEXT DEFAULT '',
  class_year TEXT NOT NULL DEFAULT 'First Year',
  division TEXT NOT NULL DEFAULT '',
  branch TEXT DEFAULT '',
  contact_email TEXT NOT NULL DEFAULT '',
  bio TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  password_plain TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all columns exist if profiles table was created earlier
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pnr TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'student';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_plain TEXT DEFAULT '';

-- 2. EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  category TEXT NOT NULL,
  short_description TEXT NOT NULL,
  full_description TEXT NOT NULL,
  location TEXT NOT NULL,
  address TEXT NOT NULL,
  attendees TEXT NOT NULL DEFAULT '0',
  speakers JSONB NOT NULL DEFAULT '[]'::JSONB,
  schedule JSONB NOT NULL DEFAULT '[]'::JSONB,
  is_past BOOLEAN NOT NULL DEFAULT FALSE,
  max_team_size INT NOT NULL DEFAULT 4,
  time TEXT DEFAULT '',
  submissions_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS max_team_size INT NOT NULL DEFAULT 4;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS time TEXT DEFAULT '';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS submissions_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. TICKETS / EVENT REGISTRATIONS TABLE
CREATE TABLE IF NOT EXISTS public.tickets (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_title TEXT NOT NULL,
  date TEXT NOT NULL,
  location TEXT NOT NULL,
  team_name TEXT,
  team_id TEXT REFERENCES public.teams(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'Confirmed' CHECK (status IN ('Confirmed', 'Waitlisted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS team_id TEXT REFERENCES public.teams(id) ON DELETE SET NULL;

-- 4. TEAMS TABLE
CREATE TABLE IF NOT EXISTS public.teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  event_id TEXT REFERENCES public.events(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. TEAM MEMBERS (MANY-TO-MANY)
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id TEXT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (team_id, user_id)
);

-- 5b. TEAM JOIN REQUESTS
CREATE TABLE IF NOT EXISTS public.team_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id TEXT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (team_id, user_id)
);

-- 6. REALTIME MESSAGES (TEAM CHAT)
CREATE TABLE IF NOT EXISTS public.messages (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. SUBMISSIONS (HACKATHON DELIVERABLES)
CREATE TABLE IF NOT EXISTS public.submissions (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  repo_url TEXT NOT NULL DEFAULT '',
  file_name TEXT,
  file_size BIGINT,
  file_url TEXT,
  description TEXT DEFAULT '',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- AUTOMATIC PROFILE CREATION TRIGGER
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, contact_email, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=' || NEW.id || '&backgroundColor=0d0d17,1a1a2e,16213e'),
    CASE WHEN LOWER(NEW.email) = 'nikhildeosani@gmail.com' THEN 'admin' ELSE 'student' END
  )
  ON CONFLICT (id) DO UPDATE
  SET role = CASE WHEN LOWER(EXCLUDED.contact_email) = 'nikhildeosani@gmail.com' THEN 'admin' ELSE public.profiles.role END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
DROP POLICY IF EXISTS "Allow public read access on profiles" ON public.profiles;
CREATE POLICY "Allow public read access on profiles"
  ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow users to update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile updates" ON public.profiles;
CREATE POLICY "Allow profile updates"
  ON public.profiles FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow users to insert own profile" ON public.profiles;
CREATE POLICY "Allow users to insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. Events Policies
DROP POLICY IF EXISTS "Allow public read access on events" ON public.events;
CREATE POLICY "Allow public read access on events"
  ON public.events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert events" ON public.events;
DROP POLICY IF EXISTS "Allow event insert" ON public.events;
CREATE POLICY "Allow event insert"
  ON public.events FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update events" ON public.events;
DROP POLICY IF EXISTS "Allow event update" ON public.events;
CREATE POLICY "Allow event update"
  ON public.events FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete events" ON public.events;
DROP POLICY IF EXISTS "Allow event delete" ON public.events;
CREATE POLICY "Allow event delete"
  ON public.events FOR DELETE USING (true);

-- 3. Tickets Policies
DROP POLICY IF EXISTS "Allow users to view own tickets" ON public.tickets;
CREATE POLICY "Allow users to view own tickets"
  ON public.tickets FOR SELECT USING (auth.uid() = user_id);

-- Admin can read ALL tickets (for the enrollments roster)
DROP POLICY IF EXISTS "Allow admin to view all tickets" ON public.tickets;
CREATE POLICY "Allow admin to view all tickets"
  ON public.tickets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND (role = 'admin' OR LOWER(contact_email) = 'nikhildeosani@gmail.com')
    )
  );

DROP POLICY IF EXISTS "Allow users to register tickets" ON public.tickets;
CREATE POLICY "Allow users to register tickets"
  ON public.tickets FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users to delete own tickets" ON public.tickets;
CREATE POLICY "Allow users to delete own tickets"
  ON public.tickets FOR DELETE USING (auth.uid() = user_id);

-- 4. Teams & Membership Policies
DROP POLICY IF EXISTS "Allow public read access on teams" ON public.teams;
CREATE POLICY "Allow public read access on teams"
  ON public.teams FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to create teams" ON public.teams;
CREATE POLICY "Allow authenticated users to create teams"
  ON public.teams FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow team creator to update" ON public.teams;
CREATE POLICY "Allow team creator to update"
  ON public.teams FOR UPDATE USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Allow team creator to delete" ON public.teams;
CREATE POLICY "Allow team creator to delete"
  ON public.teams FOR DELETE USING (auth.uid() = created_by);

-- Team members RLS
DROP POLICY IF EXISTS "Allow public read on team members" ON public.team_members;
CREATE POLICY "Allow public read on team members"
  ON public.team_members FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to join teams" ON public.team_members;
CREATE POLICY "Allow authenticated users to join teams"
  ON public.team_members FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow users to leave teams" ON public.team_members;
CREATE POLICY "Allow users to leave teams"
  ON public.team_members FOR DELETE USING (auth.uid() = user_id);

-- Allow team creator to also delete members (for accepting requests or removing)
DROP POLICY IF EXISTS "Allow creator to manage members" ON public.team_members;
CREATE POLICY "Allow creator to manage members"
  ON public.team_members FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND created_by = auth.uid())
    OR auth.uid() = user_id
  );

-- Join Requests RLS
ALTER TABLE public.team_join_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow users to view own requests or creator to view team requests" ON public.team_join_requests;
CREATE POLICY "Allow users to view own requests or creator to view team requests"
  ON public.team_join_requests FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND created_by = auth.uid())
  );

DROP POLICY IF EXISTS "Allow authenticated users to send join requests" ON public.team_join_requests;
CREATE POLICY "Allow authenticated users to send join requests"
  ON public.team_join_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow creator to update request status" ON public.team_join_requests;
CREATE POLICY "Allow creator to update request status"
  ON public.team_join_requests FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND created_by = auth.uid())
    OR auth.uid() = user_id
  );

DROP POLICY IF EXISTS "Allow user to cancel own request" ON public.team_join_requests;
CREATE POLICY "Allow user to cancel own request"
  ON public.team_join_requests FOR DELETE USING (auth.uid() = user_id);

-- 5. Messages (Chat) Policies
DROP POLICY IF EXISTS "Allow authenticated users to view messages" ON public.messages;
CREATE POLICY "Allow authenticated users to view messages"
  ON public.messages FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to post messages" ON public.messages;
CREATE POLICY "Allow authenticated users to post messages"
  ON public.messages FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 6. Submissions Policies
DROP POLICY IF EXISTS "Allow authenticated users to view submissions" ON public.submissions;
CREATE POLICY "Allow authenticated users to view submissions"
  ON public.submissions FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to create submissions" ON public.submissions;
CREATE POLICY "Allow authenticated users to create submissions"
  ON public.submissions FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ==============================================================================
-- ENABLE REALTIME FOR CHAT (SAFELY)
-- ==============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;

-- ==============================================================================
-- STORAGE BUCKETS SETUP
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('submissions', 'submissions', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Allow public avatar downloads" ON storage.objects;
CREATE POLICY "Allow public avatar downloads"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Allow authenticated avatar uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow avatar uploads" ON storage.objects;
CREATE POLICY "Allow avatar uploads"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Allow authenticated avatar updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow avatar updates" ON storage.objects;
CREATE POLICY "Allow avatar updates"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Allow public submission downloads" ON storage.objects;
CREATE POLICY "Allow public submission downloads"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'submissions');

DROP POLICY IF EXISTS "Allow authenticated submission uploads" ON storage.objects;
CREATE POLICY "Allow authenticated submission uploads"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'submissions' AND auth.role() = 'authenticated');

-- ==============================================================================
-- SCHEMA READY (CLEAN SLATE - NO DEFAULT SEED EVENTS)
-- ==============================================================================

-- ==============================================================================
-- 8. USER SESSIONS (ANALYTICS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INT DEFAULT 0,
  pages_visited TEXT[] DEFAULT '{}',
  user_agent TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can insert/update their own sessions
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.user_sessions;
CREATE POLICY "Users can insert own sessions"
  ON public.user_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own sessions" ON public.user_sessions;
CREATE POLICY "Users can update own sessions"
  ON public.user_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins (and self) can read sessions — using public profiles role
DROP POLICY IF EXISTS "Allow read on user_sessions" ON public.user_sessions;
CREATE POLICY "Allow read on user_sessions"
  ON public.user_sessions FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

