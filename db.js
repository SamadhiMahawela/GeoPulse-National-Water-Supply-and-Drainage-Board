// db.js — connects to Postgres (Supabase) database and ensures schema exists.

const { Pool } = require("pg");

// Read from process.env.DATABASE_URL, or fallback to live Supabase connection
const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:4YTph6RN6MJkvqKv@db.wanrornvxyfapvmpflwd.supabase.co:5432/postgres";

const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);

const pool = new Pool({
  connectionString: connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false }
});

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS surveys (
    id          TEXT PRIMARY KEY,
    site_name   TEXT,
    client_name TEXT,
    chart_id    TEXT,
    lat         TEXT,
    lng         TEXT,
    date        TEXT,
    ves_no      TEXT,
    operator    TEXT,
    array_type  TEXT,
    remarks     TEXT,
    readings    JSONB DEFAULT '[]'::jsonb,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at  BIGINT,
    updated_at  BIGINT,
    device_id   TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_surveys_updated_at ON surveys(updated_at);
`;

// Runs once when the server starts.
const ready = pool
  .query(SCHEMA_SQL)
  .then(() => console.log("Database ready (surveys table checked/created)."))
  .catch((err) => {
    console.error("Could not set up the database:", err.message);
    throw err;
  });

module.exports = {
  query: (text, params) => pool.query(text, params),
  ready
};