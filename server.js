require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const requireApiKey = require("./middleware/auth");
const surveysRouter = require("./routes/surveys");

const app = express();

app.use(cors());
app.use(express.json({ limit: process.env.BODY_LIMIT || "20mb" }));

// 1. PUBLIC UPLOADS ROUTE (Fixes Sign In Modal & Cannot GET /uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.get('/uploads', (req, res) => {
  res.status(200).send('Uploads directory is active.');
});

// Explicit fallback for root index page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Authentication function (requireLogin) remains unchanged
function requireLogin(req, res, next) {
  const user = process.env.APP_USER;
  const pass = process.env.APP_PASSWORD;
  if (!user || !pass) return next();

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

// Public health check
app.get("/api/health", (req, res) => {
  res.json({ ok: true, time: Date.now() });
});

// Survey data endpoints
app.use("/api/surveys", requireApiKey, surveysRouter);

// Serve main app statically
app.use("/", express.static(path.join(__dirname, "app")));

// Keep login protection ONLY for admin dashboard
app.use("/admin", requireLogin, express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log("VES backend listening on port " + PORT);
});
