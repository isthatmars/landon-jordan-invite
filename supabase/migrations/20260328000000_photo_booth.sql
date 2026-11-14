-- 80s Photo Booth tables (also applied via Supabase MCP).
-- Guests remain RSVPs; booth tables optionally FK to rsvps.

CREATE TABLE IF NOT EXISTS public.booth_otp_challenges (
  id text PRIMARY KEY,
  email text NOT NULL,
  first_name text NOT NULL DEFAULT '',
  code_hash text NOT NULL,
  purpose text NOT NULL DEFAULT 'verify',
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 5,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.booth_sessions (
  id text PRIMARY KEY,
  token_hash text NOT NULL UNIQUE,
  email text NOT NULL,
  first_name text NOT NULL DEFAULT '',
  rsvp_id text REFERENCES public.rsvps(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.booth_photos (
  id text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('ai', 'throwback')),
  guest_email text NOT NULL,
  guest_first_name text NOT NULL DEFAULT '',
  rsvp_id text REFERENCES public.rsvps(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'private'
    CHECK (status IN ('private', 'pending', 'approved', 'rejected', 'failed')),
  consent_at timestamptz,
  source_path text,
  raw_path text,
  branded_path text,
  mime text NOT NULL DEFAULT 'image/jpeg',
  width int,
  height int,
  error_message text,
  submitted_to_gallery_at timestamptz,
  moderated_at timestamptz,
  moderated_by text,
  generation_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.booth_generations (
  id text PRIMARY KEY,
  photo_id text REFERENCES public.booth_photos(id) ON DELETE CASCADE,
  guest_email text NOT NULL,
  rsvp_id text REFERENCES public.rsvps(id) ON DELETE SET NULL,
  ip_hash text,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'ready', 'failed')),
  model text,
  prompt text,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.booth_temp_uploads (
  id text PRIMARY KEY,
  guest_email text,
  session_id text,
  path text NOT NULL,
  mime text NOT NULL,
  bytes int NOT NULL DEFAULT 0,
  purpose text NOT NULL DEFAULT 'ai_source'
    CHECK (purpose IN ('ai_source', 'throwback')),
  expires_at timestamptz NOT NULL,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.booth_rate_events (
  id bigserial PRIMARY KEY,
  guest_email text,
  ip_hash text,
  kind text NOT NULL DEFAULT 'ai_gen',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.booth_otp_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booth_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booth_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booth_temp_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booth_rate_events ENABLE ROW LEVEL SECURITY;
