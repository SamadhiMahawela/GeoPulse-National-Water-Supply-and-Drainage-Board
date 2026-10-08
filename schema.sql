-- This is the ONE table the app uses. You do NOT need to run this by hand —
-- db.js runs it automatically every time the server starts (CREATE TABLE IF
-- NOT EXISTS is safe to re-run — it does nothing if the table already
-- exists). This file exists purely so you can see exactly what's in your
-- database, or paste it into Railway's Postgres "Query" tab yourself if
-- you ever want to look around.

CREATE TABLE IF NOT EXISTS surveys (
  id          TEXT PRIMARY KEY,          -- unique ID for this survey (generated on the device)
  site_name   TEXT,                      -- "Site / location name"
  client_name TEXT,                      -- "Client name"
  chart_id    TEXT,                      -- auto-generated Chart/VES ID, e.g. VES-20260921-4F2A
  lat         TEXT,                      -- GPS latitude captured on the phone
  lng         TEXT,                      -- GPS longitude
  date        TEXT,                      -- survey date
  ves_no      TEXT,                      -- "VES / Station no." — your own numbering
  operator    TEXT,                      -- "Recorded by"
  array_type  TEXT,                      -- "Schlumberger" / "Wenner" / "Other"
  remarks     TEXT,                      -- free-text field notes
  readings    JSONB DEFAULT '[]'::jsonb, -- the AB/2 + resistivity table, as a JSON list
  attachments JSONB DEFAULT '[]'::jsonb, -- uploaded photos/files, as a JSON list
  created_at  BIGINT,                    -- when first created (millisecond timestamp)
  updated_at  BIGINT,                    -- when last edited — this is what sync compares
  device_id   TEXT                       -- which phone/laptop last saved it
);

CREATE INDEX IF NOT EXISTS idx_surveys_updated_at ON surveys(updated_at);

-- Why one table instead of several (e.g. a separate "readings" table)?
-- Readings and attachments are lists that only ever belong to one survey
-- and are never queried by themselves — Postgres's JSONB type stores them
-- as real, structured JSON right in the row. That keeps things simple now,
-- without losing the option to query inside them later if you ever need to
-- (e.g. `SELECT * FROM surveys WHERE readings @> '[{"ab2":"10"}]'`).