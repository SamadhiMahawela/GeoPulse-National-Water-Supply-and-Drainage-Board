require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const requireApiKey = require("./middleware/auth");
const surveysRouter = require('./routes/surveys');

const app = express();

app.use(cors());               // allow the front-end (any origin/device) to call this API
app.use(express.json({ limit: process.env.BODY_LIMIT || "20mb" }));

// ---------------------------------------------------------------------
// Optional simple login gate for the web pages (the app itself and the
// admin dashboard) — NOT for the API, which is already protected by the
// x-api-key header. This is just a username/password prompt your browser
// shows automatically, so only people you've given the password to can
// even open the app's web address. It only turns on if you set both
// APP_USER and APP_PASSWORD in .env — leave them blank to disable it.
// ---------------------------------------------------------------------
function requireLogin(req, res, next) {
  const user = process.env.APP_USER;
  const pass = process.env.APP_PASSWORD;
  if (!user || !pass) return next(); // gate disabled — nothing set

  const header = req.headers.authorization || "";
  const token = header.split(" ")[1] || "";
  const decoded = Buffer.from(token, "base64").toString("utf8");
  const sep = decoded.indexOf(":");
  const u = decoded.slice(0, sep);
  const p = decoded.slice(sep + 1);

  if (u === user && p === pass) return next();

  res.set("WWW-Authenticate", 'Basic realm="VES Field Tool"');
  return res.status(401).send("Login required.");
}

// Public health check — no login/API key needed, useful for "is the server up?" checks
app.get("/api/health", (req, res) => {
  res.json({ ok: true, time: Date.now() });
});

// All survey data endpoints require the shared API key (see .env → API_KEY)
app.use("/api/surveys", requireApiKey, surveysRouter);

// The field app itself, served at the site's root address.
// Anyone who opens this URL gets the same app as the downloadable HTML file —
// except it's already pointed at this server, so there's nothing to configure.
app.use("/", requireLogin, express.static(path.join(__dirname, "app")));

// A small dashboard at /admin (see public/admin.html) for viewing every
// survey from every device, behind the same login gate.
app.use("/admin", requireLogin, express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log("VES backend listening on port " + PORT);
});
