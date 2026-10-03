const jwt = require("jsonwebtoken");
const { google } = require("googleapis");
const StorageAccount = require("../models/StorageAccount");
const { encrypt } = require("../utils/crypto");

// The piece that was missing: an actual way for the admin to connect a real
// Google account, instead of the StorageAccount endpoint requiring a refresh
// token they'd already have to have obtained some other way.
//
// Flow: admin clicks "Connect Google account" (label passed as ?label=...) ->
// GET /start redirects to Google's consent screen -> Google redirects back to
// GOOGLE_REDIRECT_URI (this app's /callback) with a one-time code -> we
// exchange it for a refresh token and create the StorageAccount.

function oauthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

// Reached by direct browser navigation (a clicked link/button), so there's
// no Authorization header to check — the frontend appends the admin's
// current access token as a query param instead, verified here manually.
function start(req, res) {
  try {
    const payload = jwt.verify(req.query.token, process.env.JWT_ACCESS_SECRET);
    if (payload.role !== "admin") throw new Error("not admin");
  } catch {
    return res.status(403).json({ detail: "Admin authentication required to connect a storage account." });
  }

  const client = oauthClient();
  const label = req.query.label || "Untitled account";
  const url = client.generateAuthUrl({
    access_type: "offline", // required to get a refresh_token back
    prompt: "consent", // forces a refresh_token even on a repeat connection
    scope: ["https://www.googleapis.com/auth/drive.file"], // only files this app creates, not the whole Drive
    state: Buffer.from(JSON.stringify({ label })).toString("base64url"),
  });
  res.redirect(url);
}

async function callback(req, res) {
  const { code, state } = req.query;
  if (!code) return res.status(400).json({ detail: "Missing authorization code." });

  let label = "Untitled account";
  try {
    label = JSON.parse(Buffer.from(state, "base64url").toString("utf8")).label;
  } catch { /* fall back to default label */ }

  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    // Happens if the admin had already granted consent before and Google
    // didn't re-issue a refresh_token — resolved by prompt: "consent" above,
    // but surfaced clearly here in case it still happens.
    return res.status(400).json({
      detail: "Google did not return a refresh token. Revoke the app's existing access at https://myaccount.google.com/permissions and try connecting again.",
    });
  }

  client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const { data: profile } = await oauth2.userinfo.get();

  const account = await StorageAccount.create({
    label,
    ownerEmail: profile.email,
    refreshTokenEnc: encrypt(tokens.refresh_token),
  });

  // Redirect back into the admin UI rather than leaving the admin on a bare JSON page.
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  res.redirect(`${frontendUrl}/admin?connected=${account._id}`);
}

module.exports = { start, callback };
