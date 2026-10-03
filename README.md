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

## Second pass — review fixes + continued porting
- **Fixed:** `payments.controller.js` was reading `req.user.email`, which the JWT never carries (only `id`/`role`) — every real checkout was silently using a placeholder email. Now looks the buyer up from the DB.
- **Fixed:** `AudioRecorder.jsx` was submitting a local, browser-only `blob:` URL as the homework answer — unusable server-side. Added a student-facing `POST /api/assignments/:courseId/:lessonId/upload-audio` endpoint (Cloudinary-backed) and wired the recorder to upload for real before submitting.
- **Added:** centralized Express error handler + 404 handler (`middleware/errorHandler.js`) — previously any thrown error fell through to Express's default HTML error page.
- **Added:** `helmet`, and CORS now restricted to `FRONTEND_URL` instead of allowing all origins.
- **Added:** the Google OAuth consent flow that was the biggest flagged gap — `GET /api/admin/drive/oauth/start` and `/callback` (`controllers/driveOAuth.controller.js`), so an admin can actually connect a Google account from the UI instead of needing a refresh token obtained some other way. Wired into a "Connect Google account" button on the new Admin page.
- **Added:** `pages/` — Home, Courses catalog, CourseDetail (lesson list + video + homework), Dashboard (my enrollments), Admin (storage accounts + video upload + enrollment list), Teacher (grading queue), PaymentResult (polls the real payment status rather than trusting the redirect). `App.jsx` now routes to all of them.

## Third pass — course creation finalized (payment intentionally untouched)
- **Added:** `GET /api/admin/courses` and `GET /api/admin/courses/:id` — full admin-facing course data (pricing, Drive folder/account, every lesson field), separate from the public catalog/student-detail endpoints which strip that out.
- **Added:** `CourseForm` — create/edit a course with title, description, price, discount % (with a live final-price preview matching the backend's `finalPrice` virtual), thumbnail and promo-video upload, and the Drive folder ID + storage account a course needs before video upload works.
- **Added:** `LessonManager` — per-course lesson list with inline add/edit/delete, and the video-upload and attachment-upload flows now hang off an actual selected lesson instead of requiring the admin to type in raw Mongo IDs.
- **Added:** `ADMIN-GUIDE.md` — step-by-step usage guide (connect Drive → create course → add lessons → upload video → enroll students) for whoever runs the admin side day-to-day.
- Payment/checkout was left exactly as-is this pass, per your instruction — course pricing is captured at creation, but completing an actual purchase still goes through the (separately flagged, not-yet-live-tested) Paymob flow from the second pass. Manual enrollment (`POST /api/admin/enroll`) is the way to get a student into a course for now.

## Still stubbed or needs real-world testing
- **`utils/drive.js`** — now reachable end-to-end via the OAuth flow above, but still never run against a real Google account. The CORS-for-direct-browser-download and throttling-under-load questions from the spec still need a hands-on spike.
- **`utils/paymob.js`** — HMAC field order needs checking against Paymob's current docs before going live. Also: the exact query params Paymob appends to its redirect URL (for `PaymentResultPage` to read `purchaseOrderId` from) need confirming against a real Paymob integration dashboard — `merchant_order_id` was set to the purchase order's id, but this hasn't been tested against a live redirect.
- **`scripts/process_video.py`** — copied over unchanged, kept in Python per the earlier decision; `utils/videoProcessing.js` shells out to it via `python3`. Needs FFmpeg/Shaka Packager installed on the host.
- **Admin course/lesson CRUD UI** — the API (`/api/admin/courses`, `/lessons`, `/attachments`) is complete, but the Admin page doesn't yet have the forms for creating/editing courses and lessons — currently you'd call those endpoints directly (e.g. via curl/Postman) to set up a course before using the video-upload and enrollment UI.
- **Teacher meeting-link management & read-only student records UI** — same situation: `/api/teacher/meeting-links` and `/api/teacher/student-records` work, but only the grading queue has a page built for it so far.
- No test suite yet.

## Running it
```
cd backend && npm install && cp .env.example .env   # fill in real secrets
npm run seed    # optional: populate demo users/courses/enrollments
npm start        # also set FRONTEND_URL in .env so CORS + the OAuth callback redirect work

cd ../frontend && npm install
npm run dev
```
