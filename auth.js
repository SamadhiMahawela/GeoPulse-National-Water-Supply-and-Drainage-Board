// Very simple shared-secret auth: every request to a protected route must
// send a header "x-api-key: <the same key as in .env>". This is enough for
// a small internal team sharing one server. If you later need per-person
// logins/permissions, this is the file to replace with something like JWT
// or session-based auth.

module.exports = function requireApiKey(req, res, next) {
  const key = req.header("x-api-key");
  if (!key || key !== process.env.API_KEY) {
    return res.status(401).json({ error: "Invalid or missing API key" });
  }
  next();
};
