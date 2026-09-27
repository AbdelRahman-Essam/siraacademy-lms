# Sira English LMS — Node/Mongo Port (v2)

Ported from `siraacademy-lms-master` (Django/DRF/PostgreSQL) to Node/Express/MongoDB,
with the frontend restructured around Sira-lms-2-main's Redux Toolkit + Tailwind 4
conventions. Full decision history is in `platform-specification-v2.md` (also in this
zip) — read that alongside this README.

## What's implemented and working end-to-end (logic-complete, untested against a real DB/Drive/Paymob)
- Auth: register/login/refresh with JWT + bcrypt, rate-limited (`backend/controllers/auth.controller.js`)
- Role-based access control mirroring the original DRF permission classes (`middleware/roles.js`)
- Course/Lesson schema with embedded lessons/attachments/assignments + top-level Enrollment/PurchaseOrder/StudentSubmission (`backend/models/`)
- Server-side progressive lesson unlocking (`Enrollment.unlockedLessonOrder`)
- Video token → rewritten HLS playlist → per-segment redirect flow, matching the Drive-hybrid design in the spec (`controllers/lessons.controller.js`)
- Homework module: assignment fetch + final submission, gated by lesson-unlock (`controllers/assignments.controller.js`)
- Admin dashboard API: course/lesson CRUD, media upload, lesson-video upload pipeline with a live progress tracker, storage-account management, manual enrollment (`controllers/admin.controller.js`)
- Teacher API: meeting-link-only access, read-only student records, grading (`controllers/teacher.controller.js`)
- Paymob checkout + HMAC-verified webhook, enrollment created only from the webhook (`controllers/payments.controller.js`, `utils/paymob.js`)
- Frontend: Redux Toolkit slices per domain, axios client with auto-refresh, Sira English theme ported to Tailwind 4, VideoPlayer (hls.js + watermark), AudioRecorder (MediaRecorder), upload progress bar
- `scripts/seed_demo.js` — same demo dataset as the original (9 users, 5 courses × 10 lessons, 7 enrollments, graded submissions), rewritten for the embedded Course/Lesson schema. Run with `npm run seed` or `npm run seed -- --reset`.

## What's stubbed or needs real credentials/testing before it works
- **`utils/drive.js`** — structurally complete (folder creation, segment upload, signed-redirect URL) but never run against a real Google account. Needs: a Google Cloud OAuth app, a way for the admin to actually complete the OAuth consent flow and hand the resulting refresh token to `POST /api/admin/storage-accounts` (there's no OAuth *callback* route/UI yet — the endpoint just accepts a token you already have), and a real test of the CORS/throttling questions flagged in the spec.
- **`utils/paymob.js`** — ported logic, but the HMAC field order needs to be checked against Paymob's current dashboard docs before going live (flagged in the original spec too).
- **`scripts/process_video.py`** — copied over unchanged, kept in Python per the earlier decision; `utils/videoProcessing.js` shells out to it via `python3`. Needs FFmpeg/Shaka Packager installed on the host.
- **Frontend pages** — Login and the core Course/Admin *components* are built, but full pages (Courses catalog, CourseDetail, Dashboard, Admin tabs UI, Teacher Panel UI, PaymentResult) are left as placeholders in `App.jsx` — the pieces (`CourseCard`, `VideoPlayer`, `AudioRecorder`, `UploadProgressBar`) are ready to be assembled into them.
- No test suite yet (the Django apps had `tests.py` per app; nothing Node-side yet).

## Running it
```
cd backend && npm install && cp .env.example .env   # fill in real secrets
npm run seed    # optional: populate demo users/courses/enrollments
npm start

cd ../frontend && npm install
npm run dev
```
