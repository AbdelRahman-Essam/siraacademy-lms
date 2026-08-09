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
| GET | `/api/assignments/<id>/` | Get an assignment's prompt audio (403 if lesson locked) | Authenticated |
| POST | `/api/assignments/submit/` | Submit final voice recording | Authenticated |
| GET | `/api/assignments/me/` | My submissions + grades | Authenticated |
| GET | `/api/assignments/review/` | List all submissions to grade | Teacher/Admin |
| PATCH | `/api/assignments/review/<id>/` | Add feedback + grade | Teacher/Admin |

## Demo data

```bash
python manage.py seed_demo            # creates demo users, courses, lessons, enrollments
python manage.py seed_demo --reset    # wipes and recreates the demo data
```

Creates `admin` / `Admin123!` (superuser), teachers `emma` / `james` (password
`Teacher123!`), and 6 demo students (password `Student123!`) already enrolled
with varying progress, plus sample assignments and graded submissions.

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
