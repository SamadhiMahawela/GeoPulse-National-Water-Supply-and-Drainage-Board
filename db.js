// db.js — connects to Railway's Postgres database and makes sure the
// "surveys" table exists. Everything else in the app talks to the database
// only through db.query(...), so this is the one file that knows it's Postgres.

const { Pool } = require("pg");

const connectionString = "postgresql://postgres:YOUR_PASSWORD@YOUR_PUBLIC_HOST.proxy.rlwy.net:PORT/railway";

if (!connectionString) {
  console.error(
    "Missing DATABASE_URL. Add a Postgres database in Railway and set " +
    "DATABASE_URL in this service's Variables (see backend/README.md)."
  );
}

// Railway's public Postgres connection needs SSL; a plain local Postgres on
// your own laptop usually doesn't. This just guesses sensibly from the URL.
const isLocal = /localhost|127\.0\.0\.1/.test(connectionString || "");

const pool = new Pool({
    connectionString: "postgresql://postgres:YOUR_PASSWORD@YOUR_HOST.proxy.rlwy.net:PORT/railway",
    ssl: { rejectUnauthorized: false }
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

// Runs once when the server starts. server.js waits for this before it
// starts accepting requests, so nothing hits the database before the table
// exists.
const ready = pool.query(SCHEMA_SQL)
  .then(() => console.log("Database ready (surveys table checked/created)."))
  .catch((err) => {
    console.error("Could not set up the database:", err.message);
    throw err;
  });

module.exports = {
  query: (text, params) => pool.query(text, params),
  ready
};