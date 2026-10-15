-- THE ONLY TABLE THE APP NEEDS: "surveys"
--
-- How to run it: Supabase dashboard -> SQL Editor -> New query ->
-- paste this whole file -> click Run. Safe to run more than once.
-- (The app would also create the table by itself on first use, but running
-- this yourself lets you SEE it exist before anything else happens.)

CREATE TABLE IF NOT EXISTS public.surveys (
  id          TEXT PRIMARY KEY,           -- unique ID of the survey (made on the phone)
  site_name   TEXT,                       -- Site / location name
  client_name TEXT,                       -- Client name
  chart_id    TEXT,                       -- auto Chart/VES ID, e.g. VES-20261013-4F2A
  lat         TEXT,                       -- GPS latitude
  lng         TEXT,                       -- GPS longitude
  date        TEXT,                       -- survey date
  ves_no      TEXT,                       -- VES / Station no.
  operator    TEXT,                       -- Recorded by
  array_type  TEXT,                       -- Schlumberger / Wenner / Other
  remarks     TEXT,                       -- field notes
  readings    JSONB DEFAULT '[]'::jsonb,  -- the AB/2 + resistivity table
  attachments JSONB DEFAULT '[]'::jsonb,  -- uploaded photos/files
  created_at  BIGINT,                     -- first created (millisecond timestamp)
  updated_at  BIGINT,                     -- last edited (used by sync)
  device_id   TEXT                        -- which phone/laptop last saved it
);

CREATE INDEX IF NOT EXISTS idx_surveys_updated_at ON public.surveys(updated_at);

-- SECURITY: Supabase automatically exposes tables through its own public web
-- API. Turning on Row Level Security with NO policies locks that door
-- completely. Our app does not use that door — it talks to the database
-- through its own /api routes using the DATABASE_URL — so nothing breaks.
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
