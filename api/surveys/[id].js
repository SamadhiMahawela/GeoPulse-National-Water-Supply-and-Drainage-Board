// /api/surveys/:id
//   GET    — one full survey (including photo/file data)
//   PUT    — create or update (upsert) a survey
//   DELETE — remove a survey

const { route, readBody } = require("../../lib/http");
const { query } = require("../../lib/db");
const { rowToSurvey } = require("../../lib/survey");

module.exports = route(async (req, res) => {
  const id = String(req.query.id || "");
  if (!id) return res.status(400).json({ error: "Missing survey id" });

  if (req.method === "GET") {
    const result = await query("SELECT * FROM surveys WHERE id = $1", [id]);
    if (!result.rows[0]) return res.status(404).json({ error: "Not found" });
    return res.status(200).json(rowToSurvey(result.rows[0]));
  }

  if (req.method === "PUT") {
    const b = readBody(req);
    const now = Date.now();

    const existing = await query("SELECT created_at FROM surveys WHERE id = $1", [id]);
    const createdAt = existing.rows[0] && existing.rows[0].created_at != null
      ? Number(existing.rows[0].created_at)
      : (b.createdAt || now);

    const result = await query(
      `INSERT INTO surveys
        (id, site_name, client_name, chart_id, lat, lng, date, ves_no, operator, array_type, remarks, readings, attachments, created_at, updated_at, device_id)
       VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,$14,$15,$16)
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
        updated_at  = EXCLUDED.updated_at,
        device_id   = EXCLUDED.device_id
       RETURNING *`,
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
        createdAt,
        b.updatedAt || now,
        b.deviceId || null
      ]
    );
    return res.status(200).json(rowToSurvey(result.rows[0]));
  }

  if (req.method === "DELETE") {
    await query("DELETE FROM surveys WHERE id = $1", [id]);
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: "Method not allowed" });
});
