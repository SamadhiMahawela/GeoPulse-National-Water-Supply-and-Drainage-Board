// GET /api/surveys — list every survey, newest first.
//
// To keep responses small (Vercel limits a response to ~4.5 MB), the list
// leaves out the heavy photo/file data inside "attachments" — it still sends
// each file's name, size and "include in report" flag. The app fetches a
// survey's full content with GET /api/surveys/:id when it needs it.

const { route } = require("../../lib/http");
const { query } = require("../../lib/db");
const { rowToSurvey } = require("../../lib/survey");

module.exports = route(async (req, res) => {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const result = await query(`
    SELECT
      id, site_name, client_name, chart_id, lat, lng, date, ves_no, operator,
      array_type, remarks, readings, created_at, updated_at, device_id,
      COALESCE(
        (SELECT jsonb_agg(a - 'dataUrl') FROM jsonb_array_elements(attachments) AS a),
        '[]'::jsonb
      ) AS attachments
    FROM surveys
    ORDER BY updated_at DESC NULLS LAST
  `);
  res.status(200).json(result.rows.map(rowToSurvey));
});
