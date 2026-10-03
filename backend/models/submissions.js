const { query: q } = require("../config/db");

const map = (r, extra = {}) =>
  r && {
    _id: r.id,
    id: r.id,
    student: r.student_id,
    course: r.course_id,
    lessonId: r.lesson_id,
    assignmentId: r.assignment_id,
    audioFileUrl: r.audio_file_url,
    submittedAt: r.submitted_at,
    status: r.status,
    teacherFeedback: r.teacher_feedback,
    grade: r.grade,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    ...extra,
  };

// One submission per (student, assignment) — a repeat throws pg error 23505.
async function create({ studentId, courseId, lessonId, assignmentId, audioFileUrl, status, teacherFeedback, grade }) {
  const { rows } = await q(
    `INSERT INTO student_submissions
       (student_id, course_id, lesson_id, assignment_id, audio_file_url, status, teacher_feedback, grade)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'submitted'), COALESCE($7, ''), COALESCE($8, ''))
     RETURNING *`,
    [studentId, courseId, lessonId, assignmentId, audioFileUrl, status ?? null, teacherFeedback ?? null, grade ?? null]
  );
  return map(rows[0]);
}

// Grading queue.
async function listPending() {
  const { rows } = await q(
    `SELECT s.*, u.username, c.title AS course_title
       FROM student_submissions s
       JOIN users u ON u.id = s.student_id
       JOIN courses c ON c.id = s.course_id
      WHERE s.status = 'submitted' ORDER BY s.created_at, s.id`
  );
  return rows.map((r) =>
    map(r, {
      student: { _id: r.student_id, username: r.username },
      course: { _id: r.course_id, title: r.course_title },
    })
  );
}

// Returns null when the submission doesn't exist.
async function grade(id, { teacherFeedback, grade }) {
  const { rows } = await q(
    `UPDATE student_submissions
        SET teacher_feedback = $2, grade = $3, status = 'graded', updated_at = now()
      WHERE id = $1 RETURNING *`,
    [id, teacherFeedback || "", grade || ""]
  );
  return map(rows[0]);
}

async function count() {
  const { rows } = await q("SELECT count(*)::int AS n FROM student_submissions");
  return rows[0].n;
}

module.exports = { create, listPending, grade, count };
