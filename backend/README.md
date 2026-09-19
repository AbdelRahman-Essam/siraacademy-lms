# Academy Backend (Django + DRF)

## Setup

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# edit .env with your real DB password / secret key

# create the PostgreSQL database + user first (in psql):
#   CREATE DATABASE academy_db;
#   CREATE USER academy_user WITH PASSWORD 'changeme';
#   GRANT ALL PRIVILEGES ON DATABASE academy_db TO academy_user;

python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser   # creates your admin/teacher account
python manage.py runserver
```

Server runs at `http://127.0.0.1:8000/`. Admin panel at `/admin/` — use it to
add Courses, Lessons, and Assignments without building an admin UI yourself.

## Roles & permissions

| Role | Access |
|---|---|
| `admin` (or Django superuser) | Everything — full course/lesson CRUD, media uploads, plus every teacher endpoint below, via the Admin Dashboard (frontend) or Django Admin panel |
| `teacher` | **No access to uploaded content.** Only: live-session meeting link per lesson, student records (read-only), assignments (view + grade) |
| `student` | Own enrollments, unlocked lesson content, own submissions |

Set a user's role from the Django Admin panel (`/admin/` → Users → role field)
or via `python manage.py seed_demo` for ready-made demo accounts. `createsuperuser`
/ `is_staff` accounts pass every admin check automatically regardless of `role`.

## Endpoints implemented so far

| Method | URL | Purpose | Access |
|---|---|---|---|
| POST | `/api/auth/register/` | Create a student account | Public |
| POST | `/api/auth/login/` | Get JWT access + refresh tokens | Public |
| POST | `/api/auth/token/refresh/` | Refresh an expired access token | Public |
| GET | `/api/auth/me/` | Current logged-in user profile | Authenticated |
| GET | `/api/courses/` | List all courses | Authenticated |
| GET | `/api/courses/catalog/` | Rich catalog: cost, thumbnail, promo video, enrollment status | Authenticated |
| GET | `/api/courses/<id>/` | Course detail with per-lesson lock status + meeting link (if unlocked) | Authenticated |
| GET | `/api/courses/lessons/<id>/video-token/` | Get signed token to play a lesson's video (403 if locked) | Authenticated |
| GET | `/api/courses/lessons/<id>/verify-token/` | Internal: verify a video token (for a key server / nginx auth_request) | Public |
| GET | `/api/courses/lessons/<id>/decryption-key/` | Returns the AES key — only if the token is valid | Public (token-gated) |
| GET | `/api/courses/teacher/lessons/` | List lessons — **meeting_link only**, no content | Teacher/Admin |
| PATCH | `/api/courses/teacher/lessons/<id>/` | Update `meeting_link` only | Teacher/Admin |
| GET/POST | `/api/courses/admin/courses/` | List / create courses | Admin only |
| GET/PATCH/DELETE | `/api/courses/admin/courses/<id>/` | Edit / delete a course | Admin only |
| GET/POST | `/api/courses/admin/lessons/` | List (`?course=<id>`) / create lessons | Admin only |
| GET/PATCH/DELETE | `/api/courses/admin/lessons/<id>/` | Full lesson edit (content, keys, meeting link) / delete | Admin only |
| POST | `/api/courses/admin/upload/` | Upload video/photo/attachment (multipart: `lesson`, `file`, `kind`) | Admin only |
| DELETE | `/api/courses/admin/attachments/<id>/` | Remove an attachment | Admin only |
| GET | `/api/enrollments/me/` | List my enrollments | Authenticated |
| POST | `/api/enrollments/enroll/` | Enroll in a course | Authenticated |
| POST | `/api/enrollments/<id>/unlock-next/` | Unlock the next lesson | Authenticated |
| GET | `/api/enrollments/teacher/records/` | Read-only student progress records (`?course=<id>` optional) | Teacher/Admin |
| POST | `/api/enrollments/admin/enroll/` | Enroll any student into a course by username | Admin only |
| GET | `/api/enrollments/admin/list/` | List every enrollment platform-wide (`?course=<id>` optional) | Admin only |
| DELETE | `/api/enrollments/admin/<id>/` | Remove a student's enrollment | Admin only |
| GET | `/api/assignments/<id>/` | Get an assignment's prompt audio (403 if lesson locked) | Authenticated |
| POST | `/api/assignments/submit/` | Submit final voice recording | Authenticated |
| GET | `/api/assignments/me/` | My submissions + grades | Authenticated |
| GET | `/api/assignments/review/` | List all submissions to grade | Teacher/Admin |
| PATCH | `/api/assignments/review/<id>/` | Add feedback + grade | Teacher/Admin |
| POST | `/api/payments/checkout/` | Start a Paymob checkout for a paid course | Authenticated |
| POST | `/api/payments/webhook/` | Paymob's payment-confirmation callback (HMAC-verified) | Public (signed) |
| GET | `/api/payments/me/` | My purchase history | Authenticated |
| GET | `/api/payments/<id>/` | Poll a specific purchase's status | Authenticated |

## Payments (Paymob) — Egyptian Pound checkout

Paid courses go through a real Paymob "Accept" checkout — the classic
3-step flow (auth token → order → payment key → iframe redirect) plus a
webhook that confirms payment server-side before creating the enrollment.

### Setup

1. Create a Paymob account at [paymob.com](https://paymob.com) (or your
   region's Accept portal) and complete verification.
2. In the dashboard, get:
   - **API key** — Settings → Account Info
   - **Integration ID** — Developers → Payment Integrations (use your
     "Online Card" / Accept integration)
   - **Iframe ID** — Developers → iframes
   - **HMAC secret** — Settings → Account Info
3. Add them to `.env`:
   ```
   PAYMOB_API_KEY=...
   PAYMOB_INTEGRATION_ID=...
   PAYMOB_IFRAME_ID=...
   PAYMOB_HMAC_SECRET=...
   ```
4. In the integration's settings on Paymob's dashboard, set:
   - **Transaction processed callback** → `https://<your-domain>/api/payments/webhook/`
   - **Transaction response callback** → `https://<your-frontend-domain>/payments/result`

### ⚠️ Verify the HMAC field order before going live

`payments/paymob.py`'s `verify_hmac()` recomputes Paymob's signature
over an ordered list of transaction fields — this is what proves a
webhook actually came from Paymob and wasn't forged. The field order
implemented matches Paymob's long-documented "Transaction Processed
Callback" list, but **payment-gateway APIs are exactly the kind of
detail that can drift over time** — double-check the current field
order against your Paymob dashboard's docs (Developers → Webhooks)
before accepting real payments. Getting this wrong either accepts
forged payment confirmations or silently rejects real ones.

### Flow

1. Student clicks "Purchase" on a paid course → `POST /api/payments/checkout/`
2. Backend creates a `pending` `PurchaseOrder`, registers it with Paymob, returns an iframe URL
3. Frontend redirects the browser to that iframe URL — student pays on Paymob's hosted page
4. Paymob calls our webhook server-to-server → HMAC verified → `PurchaseOrder` marked `paid` → `Enrollment` created with `source='purchase'`
5. Paymob also redirects the student's browser back to `/payments/result` — that page polls `GET /api/payments/<id>/` until the webhook has landed, since the redirect itself isn't proof of payment

## Course commerce fields (enrollment roadmap)

`Course` now has `thumbnail`, `promo_video`, and `price` — used by the
public-style Courses catalog page. `Enrollment.source` distinguishes
`self` (free courses, student clicked Enroll), `admin` (enrolled
manually via the Admin Dashboard), and `purchase` (created automatically
by the Paymob webhook — see the Payments section above).

Requires `Pillow` (added to requirements.txt) for the thumbnail `ImageField`.

## Demo data

```bash
python manage.py seed_demo            # creates demo users, courses, lessons, enrollments
python manage.py seed_demo --reset    # wipes and recreates the demo data
```

Creates `admin` / `Admin123!` (superuser), teachers `emma` / `james` (password
`Teacher123!`), and 6 demo students (password `Student123!`) already enrolled
with varying progress, plus sample assignments and graded submissions.

## Testing

A basic test suite covers the two most security-sensitive areas —
nothing exhaustive, but it locks down the invariants that actually
matter:

```bash
python manage.py test
```

- **`courses/tests.py`** — a student can never get a video token/decryption
  key for a locked lesson, a token for one lesson can't be reused on
  another, a tampered token is rejected, and teachers genuinely cannot
  reach any content-management endpoint (verified by asserting `content_url`/
  encryption keys never even appear in the teacher-facing response, not
  just that the fields are blank)
- **`payments/tests.py`** — checkout refuses free/already-enrolled courses,
  cleans up abandoned pending orders, and marks orders `failed` if the
  Paymob API call itself errors; the webhook rejects a missing HMAC, a
  forged HMAC, and one signed with the wrong secret, only creates the
  enrollment on a genuinely successful (non-voided, non-refunded)
  transaction, and is idempotent if Paymob retries delivery
- **`enrollments/tests.py`** — self-enroll rejects paid courses (the guard
  against bypassing checkout), admin-enroll is admin-only, and a student
  can't unlock another student's enrollment by guessing its id

Uses `force_authenticate()` rather than real JWTs — standard DRF testing
practice, doesn't weaken what's being tested since auth itself isn't
what these tests are checking. Needs a real Postgres available for the
test runner to create/drop its `test_` database (same credentials as
`.env`); no SQLite fallback is configured.

## Code review fixes (latest pass)

Found and fixed while reviewing the pushed repo:
- **No production security settings** — `SECURE_SSL_REDIRECT`, `SESSION_COOKIE_SECURE`, HSTS, etc. now activate automatically when `DEBUG=False`, including `SECURE_PROXY_SSL_HEADER` for sitting behind Cloudflare Tunnel
- **Checkout had no rate limiting** — added a `checkout: 5/min` throttle scope so `/api/payments/checkout/` can't be hammered to spam Paymob's API
- **Abandoned checkouts piled up** — `CheckoutView` now clears a student's earlier `pending` orders for the same course before creating a new one
- **Duplicate lesson order caused a raw 500** — `AdminLessonSerializer` now validates order uniqueness within a course itself and returns a clean 400 instead of an `IntegrityError`
- **No file type/size limits anywhere** — `Course.thumbnail`/`promo_video` now validate extension + size (5MB / 200MB); `AttachmentSerializer` validates extension + size per `kind` (photo/video/document), since that one field accepts several file types. Nothing previously stopped an oversized file or a renamed executable from being uploaded.

Run `python manage.py makemigrations` after pulling — the new file validators don't change the DB schema, but Django tracks them in migration state.

## Not yet implemented (next steps)

- nginx-level integration of `LessonDecryptionKeyView` for real segment
  serving (the API endpoint exists and is fully permission-checked; wiring
  it into an actual nginx `auth_request` or HLS key URI is a deployment step)
- Deployment itself (nginx, Cloudflare Tunnel) — deferred until the Linux
  server is available
- Large video uploads: Django itself doesn't cap file size by default, but
  once behind nginx you'll want `client_max_body_size 2G;` (or similar) in
  your nginx config, or the reverse proxy will reject big uploads first

## Video processing pipeline

`scripts/process_video.py` wraps FFmpeg + Shaka Packager to turn a raw
lesson video into encrypted HLS:

```bash
python scripts/process_video.py raw_lesson1.mp4 media/lessons/lesson1
```

Requires `ffmpeg` and `packager` (Shaka Packager) installed and on PATH.
See the script's docstring for what each step does and how to connect
the resulting key to the video-token flow.

## Branding

This backend serves the API for **Sira English**. There's nothing
academy-specific hardcoded in the backend — branding (logo, name, colors)
lives entirely in the frontend (`academy_frontend/public/logo.png`).
