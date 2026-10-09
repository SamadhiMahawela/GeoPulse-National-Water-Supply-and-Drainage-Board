require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const requireApiKey = require("./middleware/auth");
const surveysRouter = require("./routes/surveys");

const app = express();

app.use(cors());
app.use(express.json({ limit: process.env.BODY_LIMIT || "20mb" }));

// Explicit static file serving from root directory
app.use(express.static(path.join(__dirname)));

// Explicit static asset routes to prevent Vercel 404 routing issues
app.get("/styles.css", (req, res) => {
  res.sendFile(path.join(__dirname, "styles.css"));
});

app.get("/app.js", (req, res) => {
  res.sendFile(path.join(__dirname, "app.js"));
});

app.get("/manifest.json", (req, res) => {
  res.sendFile(path.join(__dirname, "manifest.json"));
});

app.get("/sw.js", (req, res) => {
  res.sendFile(path.join(__dirname, "sw.js"));
});

app.get("/service-worker.js", (req, res) => {
  res.sendFile(path.join(__dirname, "service-worker.js"));
});

// Serve uploaded files publicly with automatic URI decoding
app.use(
  "/uploads",
  (req, res, next) => {
    try {
      req.url = decodeURIComponent(req.url);
    } catch (e) {}
    next();
  },
  express.static(path.join(__dirname, "uploads"))
);

app.get("/uploads", (req, res) => {
  res.status(200).send("Uploads directory is active.");
});

// Explicit route for index page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Basic Auth middleware for Admin routes
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

// Admin portal protected routes
app.get("/admin.html", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

app.get("/admin", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

// Listen locally when not running on Vercel
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log("VES backend listening on port " + PORT);
  });
}

// Export Express app instance for Vercel Serverless Function execution
module.exports = app;