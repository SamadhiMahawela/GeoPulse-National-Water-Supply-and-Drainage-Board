// lib/survey.js — converts between database rows (snake_case) and the
// JSON shape the app uses (camelCase).

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
    createdAt: row.created_at != null ? Number(row.created_at) : null,
    updatedAt: row.updated_at != null ? Number(row.updated_at) : null,
    deviceId: row.device_id
  };
}

module.exports = { rowToSurvey };
