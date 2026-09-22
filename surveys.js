const express = require("express");
const router = express.Router();
const db = require("../db");

// Convert a database row (snake_case columns) into the JSON shape the
// front-end app already uses (camelCase, readings as a real array).
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
    readings: JSON.parse(row.readings || "[]"),
    attachments: JSON.parse(row.attachments || "[]"),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deviceId: row.device_id
  };
}

// GET /api/surveys — every survey, most recently updated first
router.get("/", (req, res) => {
  const rows = db.prepare("SELECT * FROM surveys ORDER BY updated_at DESC").all();
  res.json(rows.map(rowToSurvey));
});

// GET /api/surveys/:id — a single survey
router.get("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM surveys WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(rowToSurvey(row));
});

// PUT /api/surveys/:id — create or update (upsert) a survey.
// The front-end always knows the survey's id (it's generated on the device),
// so create-vs-update is decided here by whether that id already exists.
router.put("/:id", (req, res) => {
  const id = req.params.id;
  const b = req.body || {};
  const now = Date.now();

  const existing = db.prepare("SELECT id, created_at FROM surveys WHERE id = ?").get(id);
  const createdAt = existing ? existing.created_at : (b.createdAt || now);

  const stmt = db.prepare(`
    INSERT INTO surveys
      (id, site_name, client_name, chart_id, lat, lng, date, ves_no, operator, array_type, remarks, readings, attachments, created_at, updated_at, device_id)
    VALUES
      (@id, @siteName, @clientName, @chartId, @lat, @lng, @date, @vesNo, @operator, @array, @remarks, @readings, @attachments, @createdAt, @updatedAt, @deviceId)
    ON CONFLICT(id) DO UPDATE SET
      site_name   = excluded.site_name,
      client_name = excluded.client_name,
      chart_id    = excluded.chart_id,
      lat         = excluded.lat,
      lng         = excluded.lng,
      date        = excluded.date,
      ves_no      = excluded.ves_no,
      operator    = excluded.operator,
      array_type  = excluded.array_type,
      remarks     = excluded.remarks,
      readings    = excluded.readings,
      attachments = excluded.attachments,
      updated_at  = excluded.updated_at,
      device_id   = excluded.device_id
  `);

  stmt.run({
    id,
    siteName: b.siteName || "",
    clientName: b.clientName || "",
    chartId: b.chartId || "",
    lat: b.lat || "",
    lng: b.lng || "",
    date: b.date || "",
    vesNo: b.vesNo || "",
    operator: b.operator || "",
    array: b.array || "",
    remarks: b.remarks || "",
    readings: JSON.stringify(b.readings || []),
    attachments: JSON.stringify(b.attachments || []),
    createdAt,
    updatedAt: b.updatedAt || now,
    deviceId: b.deviceId || null
  });

  const row = db.prepare("SELECT * FROM surveys WHERE id = ?").get(id);
  res.json(rowToSurvey(row));
});

// DELETE /api/surveys/:id
router.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM surveys WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
