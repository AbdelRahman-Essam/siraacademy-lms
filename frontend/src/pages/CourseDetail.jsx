import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import client, { API_BASE_URL } from '../api/client'
import VideoPlayer from '../components/VideoPlayer'
import AudioRecorder from '../components/AudioRecorder'

export default function CourseDetail() {
  const { courseId } = useParams()
  const [course, setCourse] = useState(null)
  const [activeLesson, setActiveLesson] = useState(null)
  const [assignment, setAssignment] = useState(null)

  useEffect(() => {
    client.get(`/courses/${courseId}/`).then((res) => {
      setCourse(res.data)
      const firstUnlocked = res.data.lessons.find((l) => l.is_unlocked)
      setActiveLesson(firstUnlocked || null)
    })
  }, [courseId])

  useEffect(() => {
    setAssignment(null)
    if (activeLesson?.assignment_id) {
      client.get(`/assignments/${activeLesson.assignment_id}/`).then((res) => setAssignment(res.data))
    }
  }, [activeLesson])

  if (!course) return <p className="p-6">Loading...</p>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <Link to="/dashboard" className="text-sm underline">← Back to dashboard</Link>
        <h1 className="text-lg font-medium mt-2">{course.title}</h1>
      </header>

      <main className="max-w-5xl mx-auto p-6 grid gap-6 sm:grid-cols-[220px_1fr]">
        <aside className="bg-white rounded-lg shadow p-3 h-fit">
          {course.lessons.map((lesson) => (
            <button
              key={lesson.id}
              disabled={!lesson.is_unlocked}
              onClick={() => setActiveLesson(lesson)}
              className={`w-full text-left px-3 py-2 rounded text-sm mb-1 ${
                activeLesson?.id === lesson.id ? 'bg-brand text-white' : ''
              } ${!lesson.is_unlocked ? 'text-gray-400 cursor-not-allowed' : 'hover:bg-gray-100'}`}
            >
              {lesson.order}. {lesson.title} {!lesson.is_unlocked && '🔒'}
            </button>
          ))}
        </aside>

        <section className="space-y-6">
          {activeLesson ? (
            <>
              <VideoPlayer lessonId={activeLesson.id} />

              {activeLesson.meeting_link && (
                <a
                  href={activeLesson.meeting_link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block bg-brand hover:bg-brand-light text-white rounded px-4 py-2 text-sm"
                >
                  Join live session
                </a>
              )}

              {assignment && (
                <AudioRecorder
                  assignmentId={assignment.id}
                  promptUrl={
                    assignment.audio_prompt?.startsWith('http')
                      ? assignment.audio_prompt
                      : `${API_BASE_URL.replace('/api', '')}${assignment.audio_prompt}`
                  }
                />
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500">No lessons unlocked yet.</p>
          )}
        </section>
      </main>
    </div>
  )
}
