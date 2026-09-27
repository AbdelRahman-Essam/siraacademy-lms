# Sira English — E-Learning Platform Specification

**Academy:** Sira English (logo: navy laurel-wreath emblem, serif wordmark)

## 1. Project Overview

Build a self-hosted e-learning platform for Sira English, an academy teaching English and Programming. The platform must be:
- Hosted on a local server (owner's own machine, planned to run on Linux), accessible remotely over the internet
- Responsive: works on desktop and mobile browsers from a single codebase
- Built around protected, drip-fed course content, role-based accounts, and a listening/speaking homework module

The developer/owner has working experience in Python, C, C++, and Flutter. Flutter is reserved for a future native mobile app (out of scope for this phase — web only).

**Status: backend and frontend scaffolds are implemented and functional locally (not yet deployed).** See section 8 for what's built vs. still pending.

## 2. Core Features (Required)

### 2.1 Roles & Accounts

Three roles, enforced server-side via DRF permission classes (never trusted from the frontend):

| Role | Access |
|---|---|
| **Admin** | Full functionality — single in-app Admin Dashboard to create/edit/delete courses and lessons, upload video/photo/attachment files, manage encryption keys and meeting links; everything teachers can do too |
| **Teacher** | **No access to uploaded content whatsoever.** Scoped to: live-session meeting link per lesson, read-only student records/progress, assignments (view + grade submissions) |
| **Student** | Own enrollments, unlocked lesson content, own homework submissions |

Each student has an account (email/password authentication). A student enrolls in a course and only sees/unlocks lessons progressively (part by part), not all at once. Lesson unlocking logic is enforced server-side only. Optional: single-device binding per account to reduce account sharing.

### 2.2 Content Protection (Video)
Realistic goal: raise the cost/difficulty of piracy and enable traceability — not "100% unrecordable" (no such thing exists; screen recording with a second camera can never be fully blocked).

Required implementation:
- Convert video to HLS format (segmented .ts chunks) using FFmpeg — never serve a single downloadable video file
- Encrypt segments with AES-128 using Shaka Packager (free, open-source, Google)
- Decryption keys served only via short-lived signed tokens (JWT, ~5 minute expiry) validated server-side against: is this student enrolled? Is this lesson unlocked for them?
- Dynamic on-screen watermark showing student email/ID, repositioning periodically, rendered client-side over the video player (deters sharing by making leaks traceable to the source student)
- Playback via hls.js or Shaka Player in the browser
- Secondary deterrents (not strong security, just extra friction): disable right-click/Ctrl+S via JS, detect DevTools open and pause playback, force in-player fullscreen instead of native browser fullscreen

### 2.3 Listening & Speaking Homework Module
- Teacher uploads an audio prompt attached to an assignment
- Student plays the prompt audio in-browser
- Student records their own voice response using the browser's native `MediaRecorder` API (no extra plugin required)
- Student can preview and **re-record multiple times** before submitting (draft state lives client-side only, not saved to server until final submit)
- On final submit, audio uploads to server and locks (no further edits)
- Grading is fully manual — teacher listens via a dashboard, writes text feedback, assigns a grade. No AI-based automatic pronunciation scoring in this phase.

### 2.4 Live Session Meeting Links
- Each lesson can have a `meeting_link` (Zoom/Google Meet/etc.)
- **Teachers manage only this field** — via a scoped "Live Sessions" tab that exposes nothing else about the lesson
- Revealed to a student only once that lesson is unlocked for them — same server-side gating rule as video content

### 2.5 Admin Dashboard — Course, Lesson & Media Management
- Single in-app dashboard (not just the Django Admin panel), two tabs in one screen:
  - **Courses & Lessons**: add/delete courses (with thumbnail photo, description, and promo video upload), add/delete lessons within a course, edit a lesson's video content URL, encryption key fields, and meeting link, and upload a video/photo/attachment file per lesson
  - **Enroll Students**: manually enroll any student into any course by username — the primary enrollment path today (see 2.6 below) — and view/remove enrollments platform-wide
- Raw video uploads are stored as-is; they still need to go through the FFmpeg + Shaka Packager pipeline (section 2.3) for actual encrypted protected delivery — the upload button is for convenience/raw files and supplementary materials, not a replacement for that pipeline
- This entire area is admin-only; teachers cannot reach it

### 2.6 Enrollment, Course Catalog & Payments
- A public-style **Courses page** lists every course with its cost, thumbnail ("offer photo"), promo video, and lesson count — the main catalog a student browses
- Enrollment records a `source`: `self` (free courses, immediate), `admin` (enrolled manually via the Admin Dashboard), or `purchase` (created automatically once Paymob confirms payment)
- **Paid courses go through a real Paymob checkout** (Egyptian Pound): student clicks Purchase → backend registers an order with Paymob and returns a hosted checkout URL → student pays on Paymob's page → Paymob calls a server-to-server webhook (HMAC-verified) → the platform marks the order paid and creates the enrollment → the student is redirected back to a result page that confirms once the webhook has landed
- The enrollment is only ever created from the verified webhook, never from the browser redirect — a student can't fake a successful payment by editing the URL Paymob sends them back to
- Free courses skip Paymob entirely and still self-enroll instantly

### 2.7 Remote Access
- Server runs locally but must be reachable from anywhere (students access from home)
- Use Cloudflare Tunnel (free) instead of opening router ports — provides free HTTPS, hides real server IP, no port forwarding needed
- Server should ideally run 24/7 for consistent student access

### 2.8 Frontend Requirements
- Fully responsive (desktop + mobile browsers), single codebase — NOT Flutter Web (too heavy/poor performance for this use case)
- Dynamic single-page application feel
- Branded as Sira English with a deliberate design system (not default template styling): navy (#16304F), warm parchment background (#F8F3E8), and a brass accent (#A8823E) echoing the seal's laurel wreath; Playfair Display for headings paired with Inter for body text; a recurring laurel-sprig divider motif ties every page back to the logo

## 3. Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React + Tailwind CSS | Responsive, lightweight, works on all screen sizes |
| Backend | Python — Django REST Framework or FastAPI | Leverages existing Python experience |
| Database | PostgreSQL | Relational data: students, courses, enrollments |
| Video processing | FFmpeg | Transcoding to HLS segments |
| Video encryption | Shaka Packager (Google, open-source) | AES-128 segment encryption |
| Video playback | hls.js or Shaka Player | Browser-side HLS playback |
| Web server | nginx | Reverse proxy, static file serving |
| Remote access | Cloudflare Tunnel | Free HTTPS tunnel, no port forwarding |
| Audio recording | MediaRecorder API (native browser) | No external library needed for capture |
| Audio/video format conversion | FFmpeg | Same tool reused for audio format conversion if needed |
| Image handling | Pillow | Required by Django for the course thumbnail ImageField |
| Payment gateway | Paymob (Accept) | Egyptian Pound checkout — auth token → order → payment key → hosted iframe, confirmed via HMAC-verified webhook |

## 4. Database Schema (Core Tables)

```
Student (User)
  id, email, password_hash, role (student/teacher/admin),
  device_id (optional), created_at

Course
  id, title, description, thumbnail, promo_video, price

Lesson
  id, course_id, order, content_url, meeting_link, is_locked

Attachment
  id, lesson_id, file, kind (photo/video/document/other), uploaded_at

Enrollment
  id, student_id, course_id, progress, unlocked_lesson_order,
  source (self/admin/purchase)

PurchaseOrder
  id, student_id, course_id, amount_cents, currency, status (pending/paid/failed),
  paymob_order_id, paymob_transaction_id, created_at, paid_at

Assignment
  id, lesson_id, audio_prompt_url, instructions

StudentSubmission
  id, student_id, assignment_id, audio_file_url,
  submitted_at, status (submitted/graded),
  teacher_feedback (text), grade
```

## 5. System Architecture (Data Flow)

```
Student browser (React frontend)
        ↓
Cloudflare Tunnel (secure remote access, HTTPS, hides real IP)
        ↓
Local server (owner's machine):
  ├── Nginx (reverse proxy)
  ├── Backend API (Django/FastAPI) — auth, enrollment logic,
  │     token issuing, lesson unlock rules, submission handling
  ├── PostgreSQL — students, courses, enrollments, grades
  └── Media storage — encrypted HLS video segments + audio submissions
```

All unlock/permission decisions happen in the backend. The frontend only displays what the backend allows — it must never independently decide what a student can access.

## 6. Implementation Steps (Recommended Order)

1. **Backend foundation**: Set up Django/FastAPI project structure, PostgreSQL connection, and the database schema above.
2. **Authentication system**: Student registration/login, JWT-based session tokens.
3. **Enrollment & progressive unlock logic**: APIs for enrolling in a course, checking/unlocking next lesson, all server-validated.
4. **Video pipeline**: FFmpeg → HLS conversion script, Shaka Packager encryption, signed-token endpoint for key delivery.
5. **Frontend core**: React app — login/register pages, student dashboard showing unlocked/locked lessons, protected video player component (hls.js + watermark overlay).
6. **Listening & Speaking module**: Audio prompt playback component, MediaRecorder-based recording component with re-record/preview, submission API, teacher grading dashboard (list submissions, play audio, submit feedback/grade).
7. **Deployment**: nginx configuration, Cloudflare Tunnel setup, connect domain, test end-to-end from an external network.

## 7. Explicit Non-Goals / Realistic Expectations

- No system can prevent screen/audio recording with an external device (phone camera) — do not promise this to stakeholders. The goal is deterrence + traceability via watermarking, not absolute prevention.
- No AI-based pronunciation/speaking auto-grading in this phase — grading is 100% manual by the teacher.
- Flutter mobile app is a separate, later phase — this spec covers the web platform only, though the backend APIs should be designed to be reusable by a future Flutter app.

## 8. Implementation Status

### Done (backend — Django + DRF)
- Custom User model with `role` (student/teacher/admin) + optional `device_id`
- JWT auth: register, login, token refresh, throttled at 10/min to slow brute-force; token payload now also carries `is_staff`/`is_superuser` so the frontend recognizes Django superusers as admins too
- Course/Lesson models with server-side progressive unlock (`Enrollment.unlocked_lesson_order`)
- Signed, short-lived (5 min) video-access tokens via Django's `TimestampSigner` — no video URL is ever permanently valid
- Decryption-key endpoint that only releases the AES key after re-verifying the same token — closes the loop between `process_video.py`'s output and actual playback
- Listening & speaking homework: `Assignment` + `StudentSubmission` models, an assignment-detail endpoint gated by lesson-unlock, and a submission endpoint that re-validates lesson-unlock server-side before accepting a recording
- **Teacher access to uploaded content fully removed.** Teachers now only reach a meeting-link-only endpoint (`TeacherMeetingLinkListView`/`UpdateView`), plus read-only student records and assignment grading
- **New Admin Dashboard API**: full course CRUD (`admin/courses/`), full lesson CRUD (`admin/lessons/`) including content URL, encryption keys, and meeting link, plus a generic media-upload endpoint (`admin/upload/`) and attachment deletion — all admin-only
- New `Attachment` model for supplementary photos/documents/raw videos per lesson
- **Course now has `thumbnail`, `promo_video`, and `price`**; new `CourseCatalogView` (`/api/courses/catalog/`) powers the public-style Courses page
- **Admin-driven enrollment**: `Enrollment.source` (`self`/`admin`/`purchase`) plus `AdminEnrollView`, `AdminEnrollmentListView`, `AdminUnenrollView` — admins can enroll any student by username
- **New `payments` app — real Paymob (Egypt) checkout**: `PurchaseOrder` model, `paymob.py` client wrapping the auth → order → payment-key flow, `CheckoutView` (starts checkout, redirects to Paymob's hosted iframe), `PaymobWebhookView` (HMAC-verified, creates the `purchase`-sourced enrollment only after payment is confirmed — never trusts the browser redirect), `MyPurchasesView` / `PurchaseStatusView` for history and polling. `EnrollView` now rejects paid courses, forcing them through checkout instead
- `seed_demo` management command (contributed while testing locally) seeding realistic demo users, courses, lessons, enrollments, assignments, and graded submissions — `python manage.py seed_demo [--reset]`
- Video processing script (`scripts/process_video.py`) wrapping FFmpeg + Shaka Packager for AES-128 encrypted HLS output

### Done (frontend — React + Vite + Tailwind)
- **New design system**: navy/parchment/brass palette and Playfair Display + Inter typography replacing default styling, applied consistently via `NavBar`, `LaurelDivider`, and the `paper-card`/`brass-rule` CSS motifs (see `tailwind.config.js`, `src/index.css`)
- Login / Register pages wired to the API, JWT stored client-side with auto-refresh, redesigned around the seal/certificate identity
- **New Courses page** (`/courses`): full catalog with thumbnail, price, promo-video preview, and enroll status per course, via `CourseCard`
- Dashboard now focuses on "My Courses" (enrollments only), with a clear path to the full catalog
- Course detail page: lesson list reflecting server-side lock state, live-session join button, homework recorder wired to the active lesson's assignment
- `VideoPlayer`: fetches signed token, plays HLS via hls.js, renders a moving watermark with the student's identity
- `AudioRecorder`: native `MediaRecorder`-based recording with unlimited re-record before final submit, embedded directly in the lesson view
- **Teacher Panel** (role-gated, content access removed):
  - **Live Sessions** — meeting link only, nothing else about the lesson
  - **Student Records** — read-only progress table
  - **Grading** — listen to submissions, write feedback, assign a grade
- **Admin Dashboard** (`/admin`, admin-only via `AdminRoute`), two tabs:
  - **Courses & Lessons** — add/delete courses (with thumbnail/promo-video/price upload), add/delete lessons, inline editing of content URL, encryption keys, meeting link, and per-lesson video/photo/attachment uploads
  - **Enroll Students** — enroll any student by username into any course, and view/remove enrollments platform-wide
- **Real Paymob checkout**: `CourseCard` shows "Purchase for X EGP" on paid courses, redirecting to Paymob's hosted checkout via `/api/payments/checkout/`; the new `/payments/result` page (`PaymentResult.jsx`) polls the backend until the webhook confirms payment, then links straight into the course
- Sira English branding: logo, favicon, and the full design system applied across every page

### Still pending
- nginx-level integration for real encrypted segment delivery (API layer is complete; connecting it to an actual reverse-proxy `auth_request` is a deployment-time step)
- Attachment unlock-gating — attachments currently serve as plain files regardless of lesson lock state (only the main video is token-gated)
- **Paymob HMAC field order needs a final check against Paymob's current dashboard docs** before accepting real payments — implemented from the long-documented "Transaction Processed Callback" field list, but this is exactly the kind of detail that can drift; verify before going live (flagged prominently in the backend README)
- Deployment: nginx config, Cloudflare Tunnel, and testing from the owner's Linux machine (deferred until that machine is available)
- Native Flutter mobile app (separate future phase, will reuse these same backend APIs)
