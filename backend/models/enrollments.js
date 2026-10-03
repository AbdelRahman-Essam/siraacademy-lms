const { query: q } = require("../config/db");

const map = (r, extra = {}) =>
  r && {
    _id: r.id,
    id: r.id,
    student: r.student_id,
    course: r.course_id,
    unlockedLessonOrder: r.unlocked_lesson_order,
    source: r.source,
    enrolledAt: r.enrolled_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    ...extra,
  };

async function findOne(studentId, courseId) {
  const { rows } = await q("SELECT * FROM enrollments WHERE student_id = $1 AND course_id = $2", [studentId, courseId]);
  return map(rows[0]);
}

// Idempotent: an existing enrollment is returned untouched (like $setOnInsert).
async function ensure(studentId, courseId, { source = "self", unlockedLessonOrder = 1 } = {}) {
  const { rows } = await q(
    `INSERT INTO enrollments (student_id, course_id, source, unlocked_lesson_order)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (student_id, course_id) DO UPDATE SET updated_at = enrollments.updated_at
     RETURNING *`,
    [studentId, courseId, source, unlockedLessonOrder]
  );
  return map(rows[0]);
}

async function listByStudent(studentId) {
  const { rows } = await q(
    `SELECT e.*, c.title AS course_title, c.thumbnail_url AS course_thumb
       FROM enrollments e JOIN courses c ON c.id = e.course_id
      WHERE e.student_id = $1 ORDER BY e.created_at, e.id`,
    [studentId]
  );
  return rows.map((r) => map(r, { course: { _id: r.course_id, title: r.course_title, thumbnailUrl: r.course_thumb } }));
}

async function listAll() {
  const { rows } = await q(
    `SELECT e.*, u.username, u.email, c.title AS course_title
       FROM enrollments e
       JOIN users u ON u.id = e.student_id
       JOIN courses c ON c.id = e.course_id
      ORDER BY e.created_at, e.id`
  );
  return rows.map((r) =>
    map(r, {
      student: { _id: r.student_id, username: r.username, email: r.email },
      course: { _id: r.course_id, title: r.course_title },
    })
  );
}

// Teacher read-only progress view.
async function listRecords() {
  const { rows } = await q(
    `SELECT u.username, c.title, e.unlocked_lesson_order,
            (SELECT count(*) FROM lessons l WHERE l.course_id = c.id)::int AS total
       FROM enrollments e
       JOIN users u ON u.id = e.student_id
       JOIN courses c ON c.id = e.course_id
      ORDER BY e.created_at, e.id`
  );
  return rows.map((r) => ({
    student: r.username,
    course: r.title,
    unlockedLessonOrder: r.unlocked_lesson_order,
    totalLessons: r.total,
  }));
}

async function remove(id) {
  await q("DELETE FROM enrollments WHERE id = $1", [id]);
}

// Atomic: bumps by one, but never past the course's lesson count.
async function unlockNext(studentId, courseId) {
  await q(
    `UPDATE enrollments SET unlocked_lesson_order = unlocked_lesson_order + 1, updated_at = now()
      WHERE student_id = $1 AND course_id = $2
        AND unlocked_lesson_order < (SELECT count(*) FROM lessons WHERE course_id = $2)`,
    [studentId, courseId]
  );
  return findOne(studentId, courseId);
}

module.exports = { findOne, ensure, listByStudent, listAll, listRecords, remove, unlockNext };
