# Sira English — Admin Guide

How to set up a course from scratch in the admin dashboard (`/admin`), log in as `admin`.
Payment/checkout is intentionally skipped here — pricing is set during course creation, but
finishing the purchase flow itself is a separate piece of work.

## 1. Connect a Google Drive storage account (do this first)

Lesson video is stored as encrypted segments in Google Drive, and every course needs an
account attached before you can upload video to it.

1. Go to **Admin → Google Drive storage accounts**.
2. Type a label (e.g. "Course storage #1" — useful once you have several, since each free
   Google account only gives you 15GB).
3. Click **Connect Google account** → you'll be sent to Google's consent screen → approve it
   → you're redirected back to `/admin` and the account appears in the list.
4. In that Google account's actual Drive (in your browser, separately), create a folder for
   the course and copy its folder ID out of the URL
   (`drive.google.com/drive/folders/`**`THIS_PART`**).

You'll need that folder ID in step 2. Repeat this for each Google account you want to use —
you can connect as many as you like and assign a different one per course.

## 2. Create the course

Go to **Admin → Courses → + New course** and fill in:

| Field | What it's for |
|---|---|
| Title / Description | Shown on the public catalog page |
| Price / Discount % | Set in EGP. Leave price at 0 for a free course. The final price (after discount) is shown live as you type. |
| Thumbnail image | Uploaded straight from this form — shows on the course card |
| Promo video | Optional, public (not DRM-protected) — a trailer, not actual lesson content |
| Course Drive folder ID | Paste the folder ID from step 1.4 |
| Storage account | Pick the Google account that folder belongs to |

Click **Create course**. The folder ID and storage account are both required before you can
upload any lesson video for this course — skip them for now if you're only setting up
structure, but come back before uploading video.

## 3. Add lessons

Click the course title in the list to expand it, then **+ Add lesson** for each one:

- **Title** and **Order** (1, 2, 3…) — order controls both display order and the
  progressive-unlock sequence (a student can't reach lesson 3 until lesson 2 is unlocked).
- **Live meeting link** — optional, shown to students once the lesson is unlocked.
- **Homework instructions** — optional. Leave blank for a lesson with no speaking assignment.
  Filling it in creates the assignment; students will see it and can record/submit an audio
  answer once the lesson is unlocked.

Repeat for all lessons, then come back to any lesson to:
- **Upload video** — pick a file, click **Start upload**, and watch the status bar: it moves
  through *uploading to server → encrypting → creating Drive folder → uploading to Drive →
  done*. This can take a while for long videos (FFmpeg encryption + the Drive upload both run
  server-side) — you can leave the page and come back, or check back later.
- **Attachment** — upload a PDF/worksheet to go with that lesson.

## 4. Enroll students

Since checkout is out of scope for now, enroll students manually:
- Call `POST /api/admin/enroll` with `{ "username": "...", "courseId": "..." }` (e.g. via
  Postman/curl) — there's no form for this in the UI yet.
- They'll start with lesson 1 unlocked. To progress them, a student unlocks their own next
  lesson via `POST /api/enrollments/:courseId/unlock-next` once you build that trigger into
  the student UI (e.g. "mark lesson complete") — right now that's an API-only capability.

You can see everyone's current unlock status at the bottom of the Admin page under
**Enrollments**.

## What's not covered by this guide (yet)

- **Payment/checkout** — the Paymob flow exists in the API but is out of scope here per your
  instruction; course pricing is captured, but students currently can only be enrolled
  manually (step 4) rather than through a real purchase.
- **Teacher-side meeting-link editing and student records** — these work via
  `/api/teacher/meeting-links` and `/api/teacher/student-records`, but only the grading queue
  has a page built in the Teacher panel so far; meeting links are set from the admin Lesson
  form instead for now.
- **Editing lesson order after the fact** — if you need to reorder lessons, edit each one's
  Order field individually; there's no drag-and-drop yet.
