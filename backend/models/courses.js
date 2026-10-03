const db = require("../config/db");
const { collect } = require("./_util");
const q = db.query;

// Course/Lesson data access. Lessons, segments, attachments and assignments
// are normalized tables (lessons, lesson_segments, attachments, assignments), but
// every function returns the same JSON shape the API always exposed
// (including `_id`, nested `lessons`, `segments`, `attachments`, `assignment`)
// so controllers and the frontend see no difference.

const COURSE_FIELDS = {
  title: "title",
  description: "description",
  thumbnailUrl: "thumbnail_url",
  promoVideoUrl: "promo_video_url",
  price: "price",
  discountPercent: "discount_percent",
  driveFolderId: "drive_folder_id",
  storageAccount: "storage_account_id",
};

const LESSON_FIELDS = {
  title: "title",
  order: "lesson_order",
  meetingLink: "meeting_link",
};

const finalPriceOf = (price, discountPercent) =>
  discountPercent ? Math.round(price * (100 - discountPercent)) / 100 : price;

function mapCourseRow(r) {
  const price = Number(r.price);
  return {
    _id: r.id,
    id: r.id,
    title: r.title,
    description: r.description,
    thumbnailUrl: r.thumbnail_url,
    promoVideoUrl: r.promo_video_url,
    price,
    discountPercent: r.discount_percent,
    finalPrice: finalPriceOf(price, r.discount_percent),
    driveFolderId: r.drive_folder_id,
    storageAccount: r.storage_account_id, // id here; swapped for {_id,label,ownerEmail} when populated
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// Loads segments/attachments/assignment for a set of lesson rows (3 queries total).
async function hydrateLessons(lessonRows) {
  if (!lessonRows.length) return [];
  const ids = lessonRows.map((l) => l.id);
  const [segs, atts, assigns] = await Promise.all([
    q("SELECT lesson_id, idx, drive_file_id FROM lesson_segments WHERE lesson_id = ANY($1::uuid[]) ORDER BY idx", [ids]),
    q("SELECT * FROM attachments WHERE lesson_id = ANY($1::uuid[]) ORDER BY uploaded_at, id", [ids]),
    q("SELECT * FROM assignments WHERE lesson_id = ANY($1::uuid[])", [ids]),
  ]);

  const group = (rows, key) => {
    const m = new Map();
    for (const r of rows) {
      if (!m.has(r[key])) m.set(r[key], []);
      m.get(r[key]).push(r);
    }
    return m;
  };
  const segBy = group(segs.rows, "lesson_id");
  const attBy = group(atts.rows, "lesson_id");
  const asgBy = new Map(assigns.rows.map((a) => [a.lesson_id, a]));

  return lessonRows.map((l) => {
    const a = asgBy.get(l.id);
    return {
      _id: l.id,
      id: l.id,
      title: l.title,
      order: l.lesson_order,
      playlistDriveFileId: l.playlist_drive_file_id,
      segments: (segBy.get(l.id) || []).map((s) => ({ index: s.idx, driveFileId: s.drive_file_id })),
      encryptionKeyId: l.encryption_key_id,
      encryptionKey: l.encryption_key,
      meetingLink: l.meeting_link,
      driveLessonFolderId: l.drive_lesson_folder_id,
      attachments: (attBy.get(l.id) || []).map((x) => ({
        _id: x.id,
        fileUrl: x.file_url,
        kind: x.kind,
        originalFilename: x.original_filename,
        uploadedAt: x.uploaded_at,
      })),
      assignment: a ? { _id: a.id, audioPromptUrl: a.audio_prompt_url, instructions: a.instructions } : undefined,
    };
  });
}

async function hydrateCourses(courseRows, { populateStorage = false } = {}) {
  if (!courseRows.length) return [];
  const courses = courseRows.map(mapCourseRow);

  const { rows: lessonRows } = await q(
    "SELECT * FROM lessons WHERE course_id = ANY($1::uuid[]) ORDER BY lesson_order, id",
    [courseRows.map((r) => r.id)]
  );
  const lessons = await hydrateLessons(lessonRows);
  const byCourse = new Map(courses.map((c) => [c._id, (c.lessons = [])]));
  lessonRows.forEach((row, i) => byCourse.get(row.course_id).push(lessons[i]));

  if (populateStorage) {
    const ids = [...new Set(courses.map((c) => c.storageAccount).filter(Boolean))];
    if (ids.length) {
      const { rows } = await q("SELECT id, label, owner_email FROM storage_accounts WHERE id = ANY($1::uuid[])", [ids]);
      const sa = new Map(rows.map((r) => [r.id, { _id: r.id, label: r.label, ownerEmail: r.owner_email }]));
      for (const c of courses) if (c.storageAccount) c.storageAccount = sa.get(c.storageAccount) || null;
    }
  }
  return courses;
}

// ---- Courses ----

async function list(opts) {
  const { rows } = await q("SELECT * FROM courses ORDER BY created_at, id");
  return hydrateCourses(rows, opts);
}

async function getById(id, opts) {
  const { rows } = await q("SELECT * FROM courses WHERE id = $1", [id]);
  if (!rows[0]) return null;
  return (await hydrateCourses(rows, opts))[0];
}

// Public catalog: no lesson bodies, just a count.
async function catalog() {
  const { rows } = await q(
    `SELECT c.*, (SELECT count(*) FROM lessons l WHERE l.course_id = c.id)::int AS lesson_count
       FROM courses c ORDER BY c.created_at, c.id`
  );
  return rows.map((r) => ({ ...mapCourseRow(r), lessonCount: r.lesson_count }));
}

function normalizeCourseBody(body = {}) {
  const b = { ...body };
  if (b.storageAccount !== undefined) {
    const s = b.storageAccount;
    b.storageAccount = s && typeof s === "object" ? s._id || s.id || null : s || null; // "" -> null
  }
  return b;
}

async function create(body) {
  const { cols, vals } = collect(COURSE_FIELDS, normalizeCourseBody(body));
  const sql = cols.length
    ? `INSERT INTO courses (${cols.join(", ")}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(", ")}) RETURNING id`
    : "INSERT INTO courses DEFAULT VALUES RETURNING id"; // fails on NOT NULL title -> 400
  const { rows } = await q(sql, vals);
  return getById(rows[0].id, { populateStorage: true });
}

// Returns null when the course doesn't exist.
async function update(id, body) {
  const { cols, vals } = collect(COURSE_FIELDS, normalizeCourseBody(body));
  if (cols.length) {
    const set = cols.map((c, i) => `${c} = $${i + 2}`).join(", ");
    await q(`UPDATE courses SET ${set}, updated_at = now() WHERE id = $1`, [id, ...vals]);
  }
  return getById(id, { populateStorage: true });
}

async function remove(id) {
  await q("DELETE FROM courses WHERE id = $1", [id]); // lessons/segments/enrollments/etc. cascade
}

// ---- Lessons ----

async function upsertAssignment(lessonId, a) {
  await q(
    `INSERT INTO assignments (lesson_id, audio_prompt_url, instructions)
     VALUES ($1, $2, COALESCE($3, ''))
     ON CONFLICT (lesson_id) DO UPDATE SET
       audio_prompt_url = COALESCE($2, assignments.audio_prompt_url),
       instructions     = COALESCE($3, assignments.instructions)`,
    [lessonId, a.audioPromptUrl ?? null, a.instructions ?? null]
  );
}

async function getLesson(courseId, lessonId) {
  const { rows } = await q("SELECT * FROM lessons WHERE id = $1 AND course_id = $2", [lessonId, courseId]);
  return (await hydrateLessons(rows))[0] || null;
}

// Lesson lookup for the video endpoints, which only know the lesson id.
// Returns the lesson plus the owning course id and its storage account id.
async function findLessonContext(lessonId) {
  const { rows } = await q(
    `SELECT l.*, c.storage_account_id FROM lessons l JOIN courses c ON c.id = l.course_id WHERE l.id = $1`,
    [lessonId]
  );
  if (!rows[0]) return null;
  const [lesson] = await hydrateLessons(rows);
  return { course: { _id: rows[0].course_id, storageAccount: rows[0].storage_account_id }, lesson };
}

// Everything the video-upload pipeline needs, or null if course/lesson missing.
async function getUploadContext(courseId, lessonId) {
  const { rows } = await q(
    `SELECT l.title AS lesson_title, c.drive_folder_id, c.storage_account_id
       FROM lessons l JOIN courses c ON c.id = l.course_id
      WHERE l.id = $1 AND c.id = $2`,
    [lessonId, courseId]
  );
  const r = rows[0];
  return r && { lessonTitle: r.lesson_title, driveFolderId: r.drive_folder_id, storageAccountId: r.storage_account_id };
}

// Returns null when the course doesn't exist.
async function addLesson(courseId, body = {}) {
  const exists = await q("SELECT 1 FROM courses WHERE id = $1", [courseId]);
  if (!exists.rowCount) return null;
  const { cols, vals } = collect(LESSON_FIELDS, body);
  const allCols = ["course_id", ...cols];
  const { rows } = await q(
    `INSERT INTO lessons (${allCols.join(", ")}) VALUES (${allCols.map((_, i) => `$${i + 1}`).join(", ")}) RETURNING id`,
    [courseId, ...vals]
  );
  if (body.assignment) await upsertAssignment(rows[0].id, body.assignment);
  return getLesson(courseId, rows[0].id);
}

// Returns null when the lesson doesn't exist in that course.
async function updateLesson(courseId, lessonId, body = {}) {
  const { cols, vals } = collect(LESSON_FIELDS, body);
  if (cols.length) {
    const set = cols.map((c, i) => `${c} = $${i + 3}`).join(", ");
    const res = await q(`UPDATE lessons SET ${set} WHERE id = $1 AND course_id = $2`, [lessonId, courseId, ...vals]);
    if (!res.rowCount) return null;
  } else if (!(await getLesson(courseId, lessonId))) {
    return null;
  }
  if (body.assignment) await upsertAssignment(lessonId, body.assignment);
  return getLesson(courseId, lessonId);
}

async function removeLesson(courseId, lessonId) {
  await q("DELETE FROM lessons WHERE id = $1 AND course_id = $2", [lessonId, courseId]);
}

async function setMeetingLink(courseId, lessonId, meetingLink) {
  const { rowCount } = await q("UPDATE lessons SET meeting_link = $3 WHERE id = $1 AND course_id = $2", [
    lessonId, courseId, meetingLink,
  ]);
  return rowCount > 0;
}

// ---- Attachments ----

async function addAttachment(courseId, lessonId, { fileUrl, kind, originalFilename }) {
  if (!(await getLesson(courseId, lessonId))) return null;
  const { rows } = await q(
    `INSERT INTO attachments (lesson_id, file_url, kind, original_filename)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [lessonId, fileUrl ?? null, kind || "other", originalFilename || ""]
  );
  const x = rows[0];
  return { _id: x.id, fileUrl: x.file_url, kind: x.kind, originalFilename: x.original_filename, uploadedAt: x.uploaded_at };
}

async function removeAttachment(courseId, lessonId, attachmentId) {
  await q(
    `DELETE FROM attachments a USING lessons l
      WHERE a.id = $1 AND a.lesson_id = l.id AND l.id = $2 AND l.course_id = $3`,
    [attachmentId, lessonId, courseId]
  );
}

// ---- Video pipeline result: saved atomically once everything is on Drive ----

async function saveLessonVideo(lessonId, { driveLessonFolderId, playlistDriveFileId, segments, encryptionKeyId, encryptionKey }) {
  await db.tx(async (c) => {
    await c.query(
      `UPDATE lessons SET
         drive_lesson_folder_id = COALESCE($2, drive_lesson_folder_id),
         playlist_drive_file_id = COALESCE($3, playlist_drive_file_id),
         encryption_key_id      = COALESCE($4, encryption_key_id),
         encryption_key         = COALESCE($5, encryption_key)
       WHERE id = $1`,
      [lessonId, driveLessonFolderId ?? null, playlistDriveFileId ?? null, encryptionKeyId ?? null, encryptionKey ?? null]
    );
    await c.query("DELETE FROM lesson_segments WHERE lesson_id = $1", [lessonId]);
    if (segments?.length) {
      await c.query(
        `INSERT INTO lesson_segments (lesson_id, idx, drive_file_id)
         SELECT $1, * FROM unnest($2::int[], $3::text[])`,
        [lessonId, segments.map((s) => s.index), segments.map((s) => s.driveFileId)]
      );
    }
  });
}

// ---- Teacher view: meeting links only, no content ----

async function listMeetingLinks() {
  const { rows: courses } = await q("SELECT id, title FROM courses ORDER BY created_at, id");
  const { rows: lessons } = await q(
    "SELECT id, course_id, title, lesson_order, meeting_link FROM lessons ORDER BY lesson_order, id"
  );
  const byCourse = new Map(courses.map((c) => [c.id, { _id: c.id, title: c.title, lessons: [] }]));
  for (const l of lessons) {
    byCourse.get(l.course_id).lessons.push({ _id: l.id, title: l.title, order: l.lesson_order, meetingLink: l.meeting_link });
  }
  return [...byCourse.values()];
}

module.exports = {
  finalPriceOf,
  list, getById, catalog, create, update, remove,
  getLesson, findLessonContext, getUploadContext,
  addLesson, updateLesson, removeLesson, setMeetingLink,
  addAttachment, removeAttachment,
  saveLessonVideo, listMeetingLinks,
};
