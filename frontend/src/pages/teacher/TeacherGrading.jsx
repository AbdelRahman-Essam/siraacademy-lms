import { useEffect, useState } from 'react'
import client, { API_BASE_URL } from '../../api/client'

const MEDIA_BASE = API_BASE_URL.replace('/api', '')

export default function TeacherGrading() {
  const [submissions, setSubmissions] = useState([])
  const [drafts, setDrafts] = useState({}) // { [id]: { feedback, grade } }
  const [savingId, setSavingId] = useState(null)

  useEffect(() => {
    client.get('/assignments/review/').then((res) => setSubmissions(res.data))
  }, [])

  function updateDraft(id, field, value) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
  }

  async function submitGrade(sub) {
    const draft = drafts[sub.id] || {}
    setSavingId(sub.id)
    try {
      const { data } = await client.patch(`/assignments/review/${sub.id}/`, {
        teacher_feedback: draft.teacher_feedback ?? sub.teacher_feedback,
        grade: draft.grade ?? sub.grade,
      })
      setSubmissions((prev) => prev.map((s) => (s.id === sub.id ? data : s)))
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-medium">Grade submissions</h1>

      {submissions.map((sub) => (
        <div key={sub.id} className="bg-white rounded-lg shadow p-4 space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium">{sub.student_name}</p>
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                sub.status === 'graded' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              }`}
            >
              {sub.status}
            </span>
          </div>

          <audio
            src={sub.audio_file?.startsWith('http') ? sub.audio_file : `${MEDIA_BASE}${sub.audio_file}`}
            controls
            className="w-full"
          />

          <div>
            <label className="block text-xs text-gray-500 mb-1">Feedback</label>
            <textarea
              className="w-full border rounded px-3 py-2 text-sm"
              rows={2}
              defaultValue={sub.teacher_feedback}
              onChange={(e) => updateDraft(sub.id, 'teacher_feedback', e.target.value)}
            />
          </div>

          <div className="flex items-end gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Grade</label>
              <input
                className="border rounded px-3 py-1.5 text-sm w-24"
                defaultValue={sub.grade}
                onChange={(e) => updateDraft(sub.id, 'grade', e.target.value)}
              />
            </div>
            <button
              onClick={() => submitGrade(sub)}
              disabled={savingId === sub.id}
              className="bg-brand hover:bg-brand-light text-white rounded px-4 py-1.5 text-sm"
            >
              {savingId === sub.id ? 'Saving...' : 'Save grade'}
            </button>
          </div>
        </div>
      ))}

      {submissions.length === 0 && <p className="text-sm text-gray-500">No submissions yet.</p>}
    </div>
  )
}
