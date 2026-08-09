import { useEffect, useState } from 'react'
import client from '../../api/client'

export default function TeacherContent() {
  const [lessons, setLessons] = useState([])
  const [savingId, setSavingId] = useState(null)
  const [savedId, setSavedId] = useState(null)

  useEffect(() => {
    client.get('/courses/teacher/lessons/').then((res) => setLessons(res.data))
  }, [])

  function updateField(id, field, value) {
    setLessons((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)))
  }

  async function save(lesson) {
    setSavingId(lesson.id)
    try {
      await client.patch(`/courses/teacher/lessons/${lesson.id}/`, {
        content_url: lesson.content_url,
        meeting_link: lesson.meeting_link,
        encryption_key_id: lesson.encryption_key_id,
        encryption_key: lesson.encryption_key,
      })
      setSavedId(lesson.id)
      setTimeout(() => setSavedId(null), 2000)
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-medium">Content management</h1>
      <p className="text-sm text-gray-500">
        Update the video location, live-session meeting link, and encryption key for each lesson.
        Lesson titles and order are managed by an admin.
      </p>

      {lessons.map((lesson) => (
        <div key={lesson.id} className="bg-white rounded-lg shadow p-4 space-y-3">
          <p className="text-sm font-medium">
            {lesson.course_title} — {lesson.order}. {lesson.title}
          </p>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Video content URL (HLS playlist)</label>
            <input
              className="w-full border rounded px-3 py-1.5 text-sm"
              value={lesson.content_url || ''}
              onChange={(e) => updateField(lesson.id, 'content_url', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Live session meeting link</label>
            <input
              className="w-full border rounded px-3 py-1.5 text-sm"
              value={lesson.meeting_link || ''}
              onChange={(e) => updateField(lesson.id, 'meeting_link', e.target.value)}
              placeholder="https://meet.google.com/..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Encryption key ID</label>
              <input
                className="w-full border rounded px-3 py-1.5 text-sm font-mono"
                value={lesson.encryption_key_id || ''}
                onChange={(e) => updateField(lesson.id, 'encryption_key_id', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Encryption key</label>
              <input
                className="w-full border rounded px-3 py-1.5 text-sm font-mono"
                value={lesson.encryption_key || ''}
                onChange={(e) => updateField(lesson.id, 'encryption_key', e.target.value)}
              />
            </div>
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
