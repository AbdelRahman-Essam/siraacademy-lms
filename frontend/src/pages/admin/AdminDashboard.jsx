import { useEffect, useState } from 'react'
import client, { API_BASE_URL } from '../../api/client'

const MEDIA_BASE = API_BASE_URL.replace('/api', '')

export default function AdminDashboard() {
  const [courses, setCourses] = useState([])
  const [selectedCourseId, setSelectedCourseId] = useState(null)

  const [newCourseTitle, setNewCourseTitle] = useState('')
  const [newCourseDesc, setNewCourseDesc] = useState('')
  const [addingCourse, setAddingCourse] = useState(false)

  const [newLessonTitle, setNewLessonTitle] = useState('')
  const [newLessonOrder, setNewLessonOrder] = useState('')
  const [addingLesson, setAddingLesson] = useState(false)

  function loadCourses() {
    client.get('/courses/admin/courses/').then((res) => setCourses(res.data))
  }

  useEffect(() => {
    loadCourses()
  }, [])

  const selectedCourse = courses.find((c) => c.id === selectedCourseId)

  async function addCourse(e) {
    e.preventDefault()
    setAddingCourse(true)
    try {
      const { data } = await client.post('/courses/admin/courses/', {
        title: newCourseTitle,
        description: newCourseDesc,
      })
      setNewCourseTitle('')
      setNewCourseDesc('')
      loadCourses()
      setSelectedCourseId(data.id)
    } finally {
      setAddingCourse(false)
    }
  }

  async function deleteCourse(courseId) {
    if (!confirm('Delete this course and all its lessons? This cannot be undone.')) return
    await client.delete(`/courses/admin/courses/${courseId}/`)
    if (selectedCourseId === courseId) setSelectedCourseId(null)
    loadCourses()
  }

  async function addLesson(e) {
    e.preventDefault()
    if (!selectedCourseId) return
    setAddingLesson(true)
    try {
      await client.post('/courses/admin/lessons/', {
        course: selectedCourseId,
        title: newLessonTitle,
        order: Number(newLessonOrder),
      })
      setNewLessonTitle('')
      setNewLessonOrder('')
      loadCourses()
    } finally {
      setAddingLesson(false)
    }
  }

  return (
    <div className="grid gap-6 sm:grid-cols-[280px_1fr]">
      {/* ── Courses column ────────────────────────────────────────── */}
      <aside className="space-y-4">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Courses</h2>

        <div className="bg-white rounded-lg shadow divide-y">
          {courses.map((course) => (
            <button
              key={course.id}
              onClick={() => setSelectedCourseId(course.id)}
              className={`w-full text-left px-4 py-3 text-sm ${
                selectedCourseId === course.id ? 'bg-brand text-white' : 'hover:bg-gray-50'
              }`}
            >
              {course.title}
              <span className={`block text-xs ${selectedCourseId === course.id ? 'text-white/70' : 'text-gray-400'}`}>
                {course.lessons.length} lesson{course.lessons.length !== 1 ? 's' : ''}
              </span>
            </button>
          ))}
        </div>

        <form onSubmit={addCourse} className="bg-white rounded-lg shadow p-4 space-y-2">
          <p className="text-sm font-medium">+ Add course</p>
          <input
            required
            placeholder="Course title"
            className="w-full border rounded px-3 py-1.5 text-sm"
            value={newCourseTitle}
            onChange={(e) => setNewCourseTitle(e.target.value)}
          />
          <textarea
            placeholder="Description (optional)"
            className="w-full border rounded px-3 py-1.5 text-sm"
            rows={2}
            value={newCourseDesc}
            onChange={(e) => setNewCourseDesc(e.target.value)}
          />
          <button
            type="submit"
            disabled={addingCourse}
            className="w-full bg-brand hover:bg-brand-light text-white rounded py-1.5 text-sm"
          >
            {addingCourse ? 'Adding...' : 'Add course'}
          </button>
        </form>
      </aside>

      {/* ── Lessons column ────────────────────────────────────────── */}
      <section className="space-y-4">
        {!selectedCourse ? (
          <p className="text-sm text-gray-500">Select a course to manage its lessons.</p>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-medium">{selectedCourse.title}</h2>
                <p className="text-sm text-gray-500">{selectedCourse.description}</p>
              </div>
              <button
                onClick={() => deleteCourse(selectedCourse.id)}
                className="text-sm text-red-600 underline"
              >
                Delete course
              </button>
            </div>

            {selectedCourse.lessons
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((lesson) => (
                <LessonEditor
                  key={lesson.id}
                  lesson={lesson}
                  onChanged={loadCourses}
                />
              ))}

            <form onSubmit={addLesson} className="bg-white rounded-lg shadow p-4 space-y-2">
              <p className="text-sm font-medium">+ Add lesson</p>
              <div className="flex gap-2">
                <input
                  required
                  placeholder="Lesson title"
                  className="flex-1 border rounded px-3 py-1.5 text-sm"
                  value={newLessonTitle}
                  onChange={(e) => setNewLessonTitle(e.target.value)}
                />
                <input
                  required
                  type="number"
                  min="1"
                  placeholder="Order"
                  className="w-24 border rounded px-3 py-1.5 text-sm"
                  value={newLessonOrder}
                  onChange={(e) => setNewLessonOrder(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={addingLesson}
                className="w-full bg-brand hover:bg-brand-light text-white rounded py-1.5 text-sm"
              >
                {addingLesson ? 'Adding...' : 'Add lesson'}
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  )
}

function LessonEditor({ lesson, onChanged }) {
  const [fields, setFields] = useState({
    content_url: lesson.content_url || '',
    meeting_link: lesson.meeting_link || '',
    encryption_key_id: lesson.encryption_key_id || '',
    encryption_key: lesson.encryption_key || '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)

  function update(field, value) {
    setFields((prev) => ({ ...prev, [field]: value }))
  }

  async function save() {
    setSaving(true)
    try {
      await client.patch(`/courses/admin/lessons/${lesson.id}/`, fields)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  async function deleteLesson() {
    if (!confirm(`Delete lesson "${lesson.title}"?`)) return
    await client.delete(`/courses/admin/lessons/${lesson.id}/`)
    onChanged()
  }

  async function uploadFile(e, kind) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append('lesson', lesson.id)
    formData.append('file', file)
    formData.append('kind', kind)
    try {
      await client.post('/courses/admin/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      onChanged()
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function deleteAttachment(id) {
    await client.delete(`/courses/admin/attachments/${id}/`)
    onChanged()
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm font-medium">{lesson.order}. {lesson.title}</p>
        <button onClick={deleteLesson} className="text-xs text-red-600 underline">Delete lesson</button>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Video content URL (encrypted HLS playlist)</label>
        <input
          className="w-full border rounded px-3 py-1.5 text-sm"
          value={fields.content_url}
          onChange={(e) => update('content_url', e.target.value)}
          placeholder="/media/lessons/lesson1/master.m3u8"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Live session meeting link</label>
        <input
          className="w-full border rounded px-3 py-1.5 text-sm"
          value={fields.meeting_link}
          onChange={(e) => update('meeting_link', e.target.value)}
          placeholder="https://meet.google.com/..."
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Encryption key ID</label>
          <input
            className="w-full border rounded px-3 py-1.5 text-sm font-mono"
            value={fields.encryption_key_id}
            onChange={(e) => update('encryption_key_id', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Encryption key</label>
          <input
            className="w-full border rounded px-3 py-1.5 text-sm font-mono"
            value={fields.encryption_key}
            onChange={(e) => update('encryption_key', e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="bg-brand hover:bg-brand-light text-white rounded px-4 py-1.5 text-sm"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        {saved && <span className="text-sm text-green-700">Saved ✓</span>}
      </div>

      {/* ── Media upload buttons ────────────────────────────────── */}
      <div className="border-t pt-3 space-y-2">
        <p className="text-xs text-gray-500">
          Upload a raw video, photo, or attachment for this lesson. Raw video uploads are
          NOT encrypted automatically — run <code>scripts/process_video.py</code> separately
          and paste the resulting URL + key above for protected playback.
        </p>
        <div className="flex flex-wrap gap-2">
          <UploadButton label="Upload video" kind="video" disabled={uploading} onFile={uploadFile} />
          <UploadButton label="Upload photo" kind="photo" disabled={uploading} onFile={uploadFile} />
          <UploadButton label="Upload attachment" kind="document" disabled={uploading} onFile={uploadFile} />
        </div>

        {lesson.attachments?.length > 0 && (
          <ul className="text-sm space-y-1 pt-2">
            {lesson.attachments.map((a) => (
              <li key={a.id} className="flex justify-between items-center">
                <a
                  href={a.file?.startsWith('http') ? a.file : `${MEDIA_BASE}${a.file}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-brand"
                >
                  [{a.kind}] {a.original_filename || a.file}
                </a>
                <button onClick={() => deleteAttachment(a.id)} className="text-xs text-red-600 underline">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function UploadButton({ label, kind, disabled, onFile }) {
  return (
    <label className="text-xs bg-gray-100 hover:bg-gray-200 rounded px-3 py-1.5 cursor-pointer">
      {disabled ? 'Uploading...' : label}
      <input type="file" className="hidden" disabled={disabled} onChange={(e) => onFile(e, kind)} />
    </label>
  )
}
