const express = require("express");
const router = express.Router();
const db = require("../db");

// Convert a database row (snake_case columns) into the JSON shape the
// front-end app already uses (camelCase). readings/attachments come back
// from Postgres already parsed as real arrays (JSONB), no JSON.parse needed.
function rowToSurvey(row) {
  return {
    id: row.id,
    siteName: row.site_name,
    clientName: row.client_name,
    chartId: row.chart_id,
    lat: row.lat,
    lng: row.lng,
    date: row.date,
    vesNo: row.ves_no,
    operator: row.operator,
    array: row.array_type,
    remarks: row.remarks,
    readings: row.readings || [],
    attachments: row.attachments || [],
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    deviceId: row.device_id
  };
}

// GET /api/surveys — every survey, most recently updated first
router.get("/", async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM surveys ORDER BY updated_at DESC");
    res.json(rows.map(rowToSurvey));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/surveys/:id — a single survey
router.get("/:id", async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM surveys WHERE id = $1", [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(rowToSurvey(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/surveys/:id — create or update (upsert) a survey.
// The front-end always knows the survey's id (generated on the device), so
// create-vs-update is just whether that id already exists — Postgres's
// ON CONFLICT handles both in one query. "created_at = surveys.created_at"
// deliberately keeps the ORIGINAL created_at on an update, instead of
// overwriting it with whatever the device sent.
router.put("/:id", async (req, res) => {
  const id = req.params.id;
  const b = req.body || {};
  const now = Date.now();

  try {
    const { rows } = await db.query(
      `
      INSERT INTO surveys
        (id, site_name, client_name, chart_id, lat, lng, date, ves_no, operator, array_type, remarks, readings, attachments, created_at, updated_at, device_id)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (id) DO UPDATE SET
        site_name   = EXCLUDED.site_name,
        client_name = EXCLUDED.client_name,
        chart_id    = EXCLUDED.chart_id,
        lat         = EXCLUDED.lat,
        lng         = EXCLUDED.lng,
        date        = EXCLUDED.date,
        ves_no      = EXCLUDED.ves_no,
        operator    = EXCLUDED.operator,
        array_type  = EXCLUDED.array_type,
        remarks     = EXCLUDED.remarks,
        readings    = EXCLUDED.readings,
        attachments = EXCLUDED.attachments,
        created_at  = surveys.created_at,
        updated_at  = EXCLUDED.updated_at,
        device_id   = EXCLUDED.device_id
      RETURNING *
      `,
      [
        id,
        b.siteName || "",
        b.clientName || "",
        b.chartId || "",
        b.lat || "",
        b.lng || "",
        b.date || "",
        b.vesNo || "",
        b.operator || "",
        b.array || "",
        b.remarks || "",
        JSON.stringify(b.readings || []),
        JSON.stringify(b.attachments || []),
        b.createdAt || now,
        b.updatedAt || now,
        b.deviceId || null
      ]
    );
    res.json(rowToSurvey(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/surveys/:id
router.delete("/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM surveys WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;