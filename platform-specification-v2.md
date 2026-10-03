> **Update (v3):** the database has since moved from MongoDB back to PostgreSQL (plain SQL via `pg`). References to MongoDB/Mongoose and embedded subdocuments below describe the v2 design; the current schema is `backend/db/schema.sql` and the README's "Fourth pass" section lists what changed.

# Sira English — E-Learning Platform Specification (v2: Node/Mongo Migration)

**Academy:** Sira English (logo: navy laurel-wreath emblem, serif wordmark)

This revises the original Django/PostgreSQL specification. All product requirements (2.1–2.8) are unchanged; this document covers what changes at the implementation level, and records the migration decisions made so far. Nothing in this document has been coded yet — it's the plan.

## 1. Why migrate

Move the backend from Python/Django/DRF/PostgreSQL to Node.js/Express/MongoDB, and restructure the frontend to follow Sira-lms-2-main's conventions (Redux Toolkit, Tailwind 4, feature-folder layout) — while keeping siraacademy's feature set, security model, and Sira English branding intact. This is a stack swap, not a feature change.

## 2. What ports over unchanged

- **Video pipeline**: FFmpeg → Shaka Packager (AES-128 HLS) stays exactly as designed — these are external binaries invoked via `child_process`, not Django code.
- **Security model**: server-side-only lesson unlocking, short-lived signed tokens gating video keys, teachers blocked from content access, admin-only dashboard.
- **Paymob checkout**: auth → order → payment key → hosted iframe → HMAC-verified webhook. Just becomes an axios client instead of Python `requests`.
- **Sira English branding**: navy `#16304F` / parchment `#F8F3E8` / brass `#A8823E`, Playfair Display + Inter, laurel-sprig divider motif — carried over as-is. Sira-lms-2-main's own visual identity is *not* adopted; only its code structure and patterns are.

## 3. Technology stack (updated)

| Layer | Was (Django) | Now (Node) |
|---|---|---|
| Backend | Django REST Framework | Node.js + Express |
| Database | PostgreSQL | MongoDB + Mongoose |
| Auth | `djangorestframework-simplejwt`, 10/min throttle | `jsonwebtoken` + `bcryptjs`, `express-rate-limit` |
| Video token signing | Django `TimestampSigner` | short-expiry JWT (same 5-min window) |
| File uploads | Django `FileField`/`ImageField` + validators | `multer` (disk storage) with equivalent extension/size validators |
| Frontend state | React Context (`AuthContext`) | Redux Toolkit — one slice per domain |
| Frontend styling | Tailwind 3 | Tailwind 4 |
| Frontend structure | pages/ + a few shared components | feature folders, mirroring Sira-lms-2-main (`Auth/`, `Courses/`, `Course/`, `Payment/`, `Teacher/`, `Admin/`, `Navbar/`, `Footer/`) |
| Video processing | `scripts/process_video.py` | same script, ported to Node or kept as a Python subprocess called from Express (see open question below) |
| Payments | Python Paymob client | Node/axios Paymob client |
| Deployment | nginx + Cloudflare Tunnel | unchanged |

**Open question carried forward:** `process_video.py` can either be rewritten in Node or left as a standalone Python script that Express shells out to (it only runs at upload time, not per-request, so language purity doesn't matter much here). Recommend leaving it in Python unless you want a pure-Node repo — flag if that matters to you.

## 4. Video storage & serving — decision: Google Drive as segment storage, same HLS/token security model (revised)

Encrypted HLS segments (the output of FFmpeg → Shaka Packager, still AES-128) are no longer stored on local disk — they're stored in a Google Drive folder instead, to move the heavy byte traffic off the home server's upload bandwidth (the server sits behind a Cloudflare Tunnel on a home connection, per section 2.7; that upload pipe is the real bottleneck, not the encryption or the app logic).

The security model is otherwise **unchanged from the original spec**:
- A student requests a lesson → Express re-validates enrollment + `unlockedLessonOrder` → issues a short-lived (5-min) signed JWT, exactly as before.
- The decryption **key is still only ever released by Express** after re-checking that same token — Drive never holds anything usable on its own.
- Playback stays fully segmented and seekable via hls.js — this is explicitly *not* the earlier "download one big encrypted file and decrypt it in the browser" idea, which was considered and rejected.
- Cloudinary is still not used for protected lesson video (only optionally for thumbnails/promo clips, which aren't security-sensitive).

**Folder structure — decision:** the admin pastes a Google Drive folder link into the course editor (a "course folder"). The system then auto-creates one subfolder per lesson inside it via the Drive API, and uploads that lesson's encrypted segments (plus its master playlist) into the matching subfolder.

**Signed link per segment — decision, with an important caveat:** Drive has no native S3-style presigned URL. The way this actually gets built:
- The `.m3u8` playlist itself is **not** served as a static Drive file with fixed segment URLs (a fixed link per segment would either have to be public — defeating the point — or embed a token that can't be refreshed once handed out). Instead, Express serves a **dynamically rewritten playlist**: every segment line points back to Express (e.g. `/api/lessons/:id/segments/:index`), not directly to Drive.
- When hls.js requests one of those segment URLs, Express re-checks entitlement (same as the key check), then mints a short-lived Drive access token server-side and responds with an **HTTP 302 redirect** to Google's actual file-download URL for that segment. The browser's next request goes straight to Google's servers — so the segment bytes never pass through the home server, which is the actual bandwidth win — while every single request still passes through your entitlement check first.
- This needs testing: (a) Google's OAuth access tokens are normally ~1hr lived, longer than the 5-min window used elsewhere — mitigated by only ever minting one right before each redirect, not caching it; (b) cross-origin fetches from hls.js to `googleapis.com` need to actually receive CORS headers Google is willing to send for this pattern — untested until built.

**Free-tier, per-course accounts — decision:** rather than one Drive account for the whole platform, different courses can live under different Google accounts/folders, to work around the free tier's 15GB-per-account cap. This means the platform needs to track *which* Google account owns *which* course's folder, which adds a small new piece to the data model:
```
StorageAccount { label, ownerEmail, oauthRefreshToken (encrypted at rest), createdAt }
Course += { driveFolderId, storageAccount (ref) }
Lesson (embedded) += { driveLessonFolderId, segments: [ { index, driveFileId } ] }
```
`oauthRefreshToken` is a credential, not video content — it must be encrypted at rest (e.g. via a server-side secret/KMS), never stored or logged in plaintext.

**New requirement — upload status bar:** the Admin Dashboard's video upload flow gets a real progress indicator, driven by Google Drive's resumable upload API, which reports progress natively and handles large files well.

**Open questions this adds:**
- An admin UI is needed to connect/manage multiple Google accounts (OAuth flow) and assign one to each course — not just paste a folder link, since the system also needs write access to create lesson subfolders and upload into them.
- Manual (for now) tracking of each account's 15GB usage so an account doesn't silently fill up mid-course.
- Confirming Drive's CORS behavior for direct browser downloads, and its rate-limit/throttling behavior under a realistic concurrent-student load — both need hands-on testing, not just API docs, before relying on this in production.

## 5. Database schema — decision: denormalize, with two deliberate exceptions

Per your call to denormalize where natural, most of the structure embeds cleanly. Two collections stay separate rather than embedded — flagging why, since it's a partial exception to "denormalize everywhere":

**Embedded (bounded, admin-owned, low write frequency):**
```
Course
  title, description, thumbnailUrl, promoVideoUrl, price, discountPercent, createdAt
  lessons: [
    {
      title, order, contentUrl, encryptionKeyId, encryptionKey, meetingLink,
      attachments: [ { fileUrl, kind, originalFilename, uploadedAt } ],
      assignment: { audioPromptUrl, instructions }   // optional, 1 per lesson
    }
  ]
```
A course's lessons, attachments, and assignment prompts are only ever edited by an admin, rarely change, and never grow unbounded — embedding them means one query fetches an entire course for the student view or admin editor, no joins needed.

**Kept as separate top-level collections (unbounded, per-student, independently queried):**
```
Enrollment      { student (ref), course (ref), unlockedLessonOrder, source, enrolledAt }
                 unique index: (student, course)

PurchaseOrder   { student (ref), course (ref), amountCents, currency, status,
                   paymobOrderId, paymobTransactionId, createdAt, paidAt }

StudentSubmission { student (ref), course (ref), lessonId, assignmentId,
                     audioFileUrl, submittedAt, status, teacherFeedback, grade }
                   unique index: (student, assignmentId)
```
Why these three stay separate despite the denormalize decision: they're generated per-student, at scale, independently of the course's own lifecycle. Embedding submissions inside the (already-embedded) assignment object would mean every homework submission writes into the parent Course document — with enough students, that risks MongoDB's 16 MB document cap and turns every submission into lock contention on the whole course. Enrollment and PurchaseOrder are junction/ledger data queried from both directions ("my enrollments," "students in this course," "payment history") and have their own lifecycle (created/cancelled independent of the course), which top-level collections handle more naturally than an embedded array would. `lessonId`/`assignmentId` above refer to the auto-generated `_id` Mongoose gives every embedded subdocument, so these can still be referenced normally.

`User` also stays top-level and unchanged in shape: `username, email, passwordHash, role, deviceId`.

## 6. Frontend — decision: one Redux slice per domain

Following Sira-lms-2-main's `userSlice` / `courseSlice` pattern, extended with:
- `enrollmentSlice` — a student's own enrollments + unlock state
- `adminSlice` — admin dashboard: course/lesson CRUD, attachment uploads, manual enrollment
- `paymentSlice` — checkout flow + purchase history/polling
- `teacherSlice` — meeting-link management, student records, grading queue

Folder structure mirrors Sira-lms-2-main's `components/` split (feature folders like `Courses/`, `Course/`, `Payment/`, `Teacher/`, `Auth/`), but the actual pages/components carry over siraacademy's existing feature list (Admin Dashboard, VideoPlayer with watermark, AudioRecorder, PaymentResult, etc.) restyled under the same design system already built (`NavBar`, `LaurelDivider`, `paper-card`/`brass-rule` motifs), upgraded to Tailwind 4.

## 7. Everything else

Sections 2 (roles), 2.3 (homework module), 2.4 (live sessions), 2.5 (admin dashboard scope), 2.6 (enrollment/catalog/payments), 2.7 (remote access), and 7 (non-goals) from the original spec are unchanged — only the implementation language moves, not the requirements.

## 8. Still open before implementation starts

- `process_video.py`: rewrite in Node, or keep as a Python subprocess called from Express?
- File storage path convention for `multer` uploads (mirroring Django's `upload_to='...'` paths) — thumbnails, promo videos, attachments, submissions, encrypted HLS output.
- Whether to port the existing `seed_demo` management command's logic into an equivalent Node/Mongoose seed script.
