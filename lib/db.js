// lib/db.js — connects to your Supabase Postgres database.
//
// DATABASE_URL must be Supabase's "Transaction pooler" connection string
// (port 6543). Vercel runs your code as many short-lived "serverless
// functions", and the pooler is what stops them from opening too many
// connections to the database at once.

const { Pool } = require("pg");

let pool;

function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set (add it in Vercel -> Settings -> Environment Variables)");
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
      max: 1,                       // one connection per serverless instance is plenty
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 8000
    });
  }
  return pool;
}

// Safety net: creates the "surveys" table if you forgot to run supabase/schema.sql.
// Runs at most once per warm function instance, and does nothing if the table exists.
let tableReady;
function ensureTable() {
  if (!tableReady) {
    tableReady = getPool()
      .query(`
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
        ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
      `)
      .catch((err) => { tableReady = null; throw err; });
  }
  return tableReady;
}

async function query(text, params) {
  await ensureTable();
  return getPool().query(text, params);
}

module.exports = { query, getPool, ensureTable };
