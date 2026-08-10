import { useEffect, useState } from 'react'
import client from '../../api/client'

/**
 * Teachers manage ONLY the live-session meeting link here — they have
 * no access to uploaded video content, encryption keys, or lesson
 * structure. That's admin-only, via the Admin Dashboard.
 */
export default function TeacherLiveSessions() {
  const [lessons, setLessons] = useState([])
  const [savingId, setSavingId] = useState(null)
  const [savedId, setSavedId] = useState(null)

  useEffect(() => {
    client.get('/courses/teacher/lessons/').then((res) => setLessons(res.data))
  }, [])

  function updateField(id, value) {
    setLessons((prev) => prev.map((l) => (l.id === id ? { ...l, meeting_link: value } : l)))
  }

  async function save(lesson) {
    setSavingId(lesson.id)
    try {
      await client.patch(`/courses/teacher/lessons/${lesson.id}/`, {
        meeting_link: lesson.meeting_link,
      })
      setSavedId(lesson.id)
      setTimeout(() => setSavedId(null), 2000)
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-medium">Live session links</h1>
      <p className="text-sm text-ink/50">
        Set the Zoom/Google Meet link for each lesson's live session. Video content and
        course structure are managed by an admin.
      </p>

      {lessons.map((lesson) => (
        <div key={lesson.id} className="paper-card p-4 space-y-3">
          <p className="text-sm font-medium">
            {lesson.course_title} — {lesson.order}. {lesson.title}
          </p>

          <div>
            <label className="block text-xs text-ink/50 mb-1">Live session meeting link</label>
            <input
              className="w-full border rounded px-3 py-1.5 text-sm"
              value={lesson.meeting_link || ''}
              onChange={(e) => updateField(lesson.id, e.target.value)}
              placeholder="https://meet.google.com/..."
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => save(lesson)}
              disabled={savingId === lesson.id}
              className="bg-brand hover:bg-brand-light text-white rounded px-4 py-1.5 text-sm"
            >
              {savingId === lesson.id ? 'Saving...' : 'Save'}
            </button>
            {savedId === lesson.id && <span className="text-sm text-green-700">Saved ✓</span>}
          </div>
        </div>
      ))}
    </div>
  )
}
