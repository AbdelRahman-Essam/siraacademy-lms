# Sira English — Frontend (React + Vite + Tailwind)

## Setup

```bash
npm install
npm run dev
```

Runs at `http://localhost:5173`. Make sure the Django backend is running first
(see `src/api/client.js` for `API_BASE_URL` — update it to match your backend's
address, e.g. `http://192.168.1.3:8000/api` on your LAN).

## Roles & routes

| Route | Who | What |
|---|---|---|
| `/dashboard`, `/courses/:id` | Student | Enroll, watch unlocked lessons, join live sessions, submit homework recordings |
| `/teacher` | Teacher, Admin | Live session links, student records (read-only), grading — **no content access** |
| `/admin` | Admin only | Single dashboard: add/delete courses, add/delete lessons, edit video URL + encryption keys + meeting link, upload video/photo/attachments |

Role is read from the JWT (`getRole()` / `isAdmin()` in `src/utils/jwt.js`) —
this is a UI convenience only; every permission is re-checked server-side.

## What's implemented

- Login / Register, JWT stored in localStorage, auto-refresh on 401
- Dashboard: course catalog, enrollment, role-aware nav links to Admin/Teacher areas
- Course detail: lesson list reflecting server-side lock state, live-session join
  button, `AudioRecorder` wired to the active lesson's assignment
- `VideoPlayer`: signed-token fetch, HLS playback via hls.js, moving watermark
- **Admin Dashboard** (`/admin`): courses + lessons management in one screen —
  add/delete courses, add/delete lessons, edit content URL / meeting link /
  encryption keys, and upload video/photo/attachment files per lesson
- **Teacher Panel** (`/teacher`): Live Sessions (meeting link only), Student
  Records (read-only), Grading — content management intentionally excluded

## Not yet wired up

- Real HLS encrypted streaming — `VideoPlayer` works once the backend serves
  actual encrypted `.m3u8`/`.ts` files from `content_url`
- Attachment unlock-gating — attachments are served as plain files today,
  regardless of lesson lock state (video stays protected via the token flow)
