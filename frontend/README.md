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
| `/courses` | Student | Full catalog — thumbnail, price, promo video, enroll |
| `/dashboard`, `/courses/:id` | Student | My enrolled courses, watch unlocked lessons, join live sessions, submit homework recordings |
| `/teacher` | Teacher, Admin | Live session links, student records (read-only), grading — **no content access** |
| `/admin` | Admin only | Single dashboard: add/delete courses, add/delete lessons, edit video URL + encryption keys + meeting link, upload video/photo/attachments |

Role is read from the JWT (`getRole()` / `isAdmin()` in `src/utils/jwt.js`) —
this is a UI convenience only; every permission is re-checked server-side.

## What's implemented

- Login / Register, JWT stored in localStorage, auto-refresh on 401
- Shared `NavBar` across student pages, design tokens in `tailwind.config.js`
  (navy/parchment/brass palette, Playfair Display + Inter type pairing —
  see `src/index.css` for the `paper-card` / `brass-rule` motifs)
- **Courses page** (`/courses`): every course with thumbnail, price, promo
  video preview, and enroll status — the main catalog
- Dashboard (`/dashboard`): "My Courses" — only what the student is enrolled in
- Course detail: lesson list reflecting server-side lock state, live-session join
  button, `AudioRecorder` wired to the active lesson's assignment
- `VideoPlayer`: signed-token fetch, HLS playback via hls.js, moving watermark
- **Admin Dashboard** (`/admin`), two tabs in one screen:
  - **Courses & Lessons** — add/delete courses (with thumbnail/promo video/price
    upload), add/delete lessons, edit content URL / meeting link / encryption
    keys, upload video/photo/attachment files per lesson
  - **Enroll Students** — manually enroll a student into a course by username
    (free path, or as a manual override) and see/remove all enrollments platform-wide
- **Teacher Panel** (`/teacher`): Live Sessions (meeting link only), Student
  Records (read-only), Grading — content management intentionally excluded
- **Payment flow (Paymob)**: on the Courses page, paid courses show
  "Purchase for X EGP" instead of "Enroll now" — clicking it calls
  `/api/payments/checkout/` and redirects to Paymob's hosted checkout.
  `/payments/result` (where Paymob redirects back to) polls the backend
  until the webhook confirms payment, then links into the course. Free
  courses still self-enroll instantly.

## Not yet wired up

- Real HLS encrypted streaming — `VideoPlayer` works once the backend serves
  actual encrypted `.m3u8`/`.ts` files from `content_url`
- Attachment unlock-gating — attachments are served as plain files today,
  regardless of lesson lock state (video stays protected via the token flow)
- Paymob's HMAC field order in the backend should be double-checked against
  the current Paymob docs before accepting real payments — see the backend
  README's Payments section
