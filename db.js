// db.js — opens (and creates, if missing) the SQLite database file and
// makes sure the "surveys" table exists. better-sqlite3 is synchronous,
// which keeps the rest of the code simple (no async/await needed just to
// talk to the database).

const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "data", "ves.db");

// make sure the folder for the database file exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// WAL mode = better performance with multiple devices reading/writing at once
db.pragma("journal_mode = WAL");

db.exec(`
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
    readings    TEXT,    -- JSON array of {ab2, mn2, rho}, stored as text
    attachments TEXT,    -- JSON array of {name, kind, mime, size, dataUrl, includeInReport}, stored as text
    created_at  INTEGER,
    updated_at  INTEGER,
    device_id   TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_surveys_updated_at ON surveys(updated_at);
`);

// Lightweight migration: add columns that didn't exist in earlier versions
// of this schema, so upgrading in place doesn't lose an existing database.
var existingCols = db.prepare("PRAGMA table_info(surveys)").all().map(function(c){ return c.name; });
if (existingCols.indexOf("client_name") === -1) {
  db.exec("ALTER TABLE surveys ADD COLUMN client_name TEXT");
}
if (existingCols.indexOf("chart_id") === -1) {
  db.exec("ALTER TABLE surveys ADD COLUMN chart_id TEXT");
}
if (existingCols.indexOf("attachments") === -1) {
  db.exec("ALTER TABLE surveys ADD COLUMN attachments TEXT");
}

module.exports = db;
