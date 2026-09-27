const { google } = require("googleapis");
const { decrypt } = require("./crypto");

/**
 * Google Drive integration — STUB / SCAFFOLD.
 *
 * This wraps the calls the platform needs (create a lesson subfolder, upload a
 * segment, mint a short-lived download redirect). It is structurally complete
 * but NOT tested end-to-end yet — see platform-specification-v2.md section 4
 * for the open questions (CORS behavior on direct browser downloads, and
 * Drive's throttling under concurrent load) that need a real spike before
 * this is relied on in production.
 *
 * Drive has no native presigned URL. The pattern used here: mint a fresh
 * short-lived OAuth access token server-side, then redirect the browser to
 * Google's own alt=media download URL with that token attached. The
 * entitlement check happens in the route handler BEFORE this is called —
 * this file only knows how to talk to Drive, not who's allowed to ask.
 */

function oauthClientFor(storageAccount) {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  client.setCredentials({ refresh_token: decrypt(storageAccount.refreshTokenEnc) });
  return client;
}

async function createLessonFolder(storageAccount, parentCourseFolderId, lessonTitle) {
  const auth = oauthClientFor(storageAccount);
  const drive = google.drive({ version: "v3", auth });
  const res = await drive.files.create({
    requestBody: {
      name: lessonTitle,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentCourseFolderId],
    },
    fields: "id",
  });
  return res.data.id;
}

async function uploadSegment(storageAccount, folderId, filename, fileStream, mimeType) {
  const auth = oauthClientFor(storageAccount);
  const drive = google.drive({ version: "v3", auth });
  const res = await drive.files.create({
    requestBody: { name: filename, parents: [folderId] },
    media: { mimeType, body: fileStream },
    fields: "id",
  });
  return res.data.id;
}

// Mints a short-lived access token and returns the direct Google download URL
// for one file. The caller (routes/lessons.route redirect handler) 302s here
// — the browser then pulls the actual bytes straight from Google, not through
// this server, which is the actual bandwidth win described in the spec.
async function getSignedSegmentUrl(storageAccount, driveFileId) {
  const auth = oauthClientFor(storageAccount);
  const { token } = await auth.getAccessToken();
  return `https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media&access_token=${token}`;
}

module.exports = { createLessonFolder, uploadSegment, getSignedSegmentUrl };
