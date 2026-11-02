// lib/http.js — small helpers shared by every API route:
// CORS headers, the API-key check, and tidy error handling.
 
function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");
}
 
// Wrap a route so it handles CORS preflight, checks the API key, and never
// crashes without a clear JSON error. Pass { public: true } to skip the key check.
function route(handler, options) {
  const isPublic = options && options.public;
  return async function (req, res) {
    setCors(res);
    res.setHeader("Cache-Control", "no-store");
    if (req.method === "OPTIONS") return res.status(204).end();
 
    if (!isPublic) {
      const expected = process.env.API_KEY;
      if (!expected) {
        return res.status(500).json({ error: "The server has no API key configured. In Vercel add the environment variable API_KEY (Settings -> Environment Variables), then Redeploy." });
      }
      if (req.headers["x-api-key"] !== expected) {
        return res.status(401).json({ error: "Invalid or missing API key" });
      }
    }
 
    try {
      await handler(req, res);
    } catch (err) {
      console.error(err);
      // The caller already passed the API-key check, so it is safe to show the real reason.
      res.status(500).json({ error: "Server error: " + (err && err.message ? err.message : String(err)) });
    }
  };
}
 
function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body.length) {
    try { return JSON.parse(req.body); } catch (e) { return {}; }
  }
  return {};
}
 
module.exports = { route, readBody };
