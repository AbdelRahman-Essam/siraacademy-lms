-- Sira English LMS — PostgreSQL schema (replaces the Mongoose models).
-- Idempotent: safe to run repeatedly (npm run migrate).
-- gen_random_uuid() is built in on PostgreSQL 13+.

CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username      text NOT NULL UNIQUE,
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role          text NOT NULL DEFAULT 'student' CHECK (role IN ('student','teacher','admin')),
  device_id     text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS storage_accounts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label             text NOT NULL,
  owner_email       text NOT NULL,
  refresh_token_enc text NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS courses (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title               text NOT NULL,
  description         text NOT NULL DEFAULT '',
  thumbnail_url       text NOT NULL DEFAULT '',
  promo_video_url     text NOT NULL DEFAULT '',
  price               numeric(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  discount_percent    integer NOT NULL DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 100),
  drive_folder_id     text NOT NULL DEFAULT '',
  storage_account_id  uuid REFERENCES storage_accounts(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lessons (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id               uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title                   text NOT NULL,
  lesson_order            integer NOT NULL,
  playlist_drive_file_id  text NOT NULL DEFAULT '',
  encryption_key_id       text NOT NULL DEFAULT '',
  encryption_key          text NOT NULL DEFAULT '',
  meeting_link            text NOT NULL DEFAULT '',
  drive_lesson_folder_id  text NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS lessons_course_idx ON lessons(course_id, lesson_order);

-- HLS segments for a lesson (was an embedded array).
CREATE TABLE IF NOT EXISTS lesson_segments (
  lesson_id     uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  idx           integer NOT NULL,
  drive_file_id text NOT NULL,
  PRIMARY KEY (lesson_id, idx)
);

CREATE TABLE IF NOT EXISTS attachments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id         uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  file_url          text,
  kind              text NOT NULL DEFAULT 'other' CHECK (kind IN ('photo','video','document','other')),
  original_filename text,
  uploaded_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS attachments_lesson_idx ON attachments(lesson_id);

-- One homework prompt per lesson (was an embedded subdocument).
CREATE TABLE IF NOT EXISTS assignments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id        uuid NOT NULL UNIQUE REFERENCES lessons(id) ON DELETE CASCADE,
  audio_prompt_url text,
  instructions     text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS enrollments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id            uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id             uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  unlocked_lesson_order integer NOT NULL DEFAULT 1,
  source                text NOT NULL DEFAULT 'self' CHECK (source IN ('self','admin','purchase')),
  enrolled_at           timestamptz NOT NULL DEFAULT now(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, course_id)
);
CREATE INDEX IF NOT EXISTS enrollments_course_idx ON enrollments(course_id);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id              uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  amount_cents           integer NOT NULL,
  currency               text NOT NULL DEFAULT 'EGP',
  status                 text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed')),
  paymob_order_id        text NOT NULL DEFAULT '',
  paymob_transaction_id  text NOT NULL DEFAULT '',
  paid_at                timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS purchase_orders_student_idx ON purchase_orders(student_id);
CREATE INDEX IF NOT EXISTS purchase_orders_paymob_idx ON purchase_orders(paymob_order_id);

CREATE TABLE IF NOT EXISTS student_submissions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id        uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id        uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  assignment_id    uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  audio_file_url   text NOT NULL,
  submitted_at     timestamptz NOT NULL DEFAULT now(),
  status           text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','graded')),
  teacher_feedback text NOT NULL DEFAULT '',
  grade            text NOT NULL DEFAULT '',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, assignment_id)
);
CREATE INDEX IF NOT EXISTS submissions_status_idx ON student_submissions(status);
