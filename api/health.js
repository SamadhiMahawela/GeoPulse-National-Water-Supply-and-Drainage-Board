// GET /api/health — public. Tells you if the server is up AND if it can reach
// the Supabase database. Open it in a browser to check everything is wired up.

const { route } = require("../lib/http");
const { query } = require("../lib/db");

module.exports = route(async (req, res) => {
  let database = "connected";
  try {
    await query("SELECT 1");
  } catch (err) {
    console.error("Health check: database error:", err.message);
    database = "error";
  }
  res.status(database === "connected" ? 200 : 503).json({
    ok: database === "connected",
    database,
    time: Date.now(),
    hint: database === "error"
      ? "Server is running but cannot reach Supabase. Check DATABASE_URL in Vercel settings, then look at Vercel -> Logs."
      : undefined
  });
}, { public: true });
