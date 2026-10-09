const { Pool } = require("pg");

// Get raw connection string from environment or use direct fallback
const rawUrl =
  process.env.DATABASE_URL ||
  "postgresql://postgres:4YTph6RN6MJkvqKv@db.wanrornvxyfapvmpflwd.supabase.co:5432/postgres";

// Sanitize connection string to avoid ERR_INVALID_URL errors
const connectionString = rawUrl.trim().replace(/^['"]|['"]$/g, "");

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

const ready = pool
  .query(SCHEMA_SQL)
  .then(() => console.log("Database ready (surveys table checked/created)."))
  .catch((err) => {
    console.error("Could not set up the database:", err.message);
  });

module.exports = {
  query: (text, params) => pool.query(text, params),
  ready
};