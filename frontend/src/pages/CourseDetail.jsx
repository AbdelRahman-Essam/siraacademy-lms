import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import client, { API_BASE_URL } from '../api/client'
import NavBar from '../components/NavBar'
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

  if (!course) return (
    <div className="min-h-screen bg-parchment">
      <NavBar />
      <p className="p-6 text-ink/50">Loading...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-parchment">
      <NavBar />

      <div className="max-w-5xl mx-auto px-6 pt-6">
        <Link to="/dashboard" className="text-sm text-ink/50 hover:text-ink">← My Courses</Link>
        <h1 className="font-display text-2xl text-ink mt-2 mb-6">{course.title}</h1>
      </div>

      <main className="max-w-5xl mx-auto px-6 pb-6 grid gap-6 sm:grid-cols-[220px_1fr]">
        <aside className="paper-card p-3 h-fit">
          {course.lessons.map((lesson) => (
            <button
              key={lesson.id}
              disabled={!lesson.is_unlocked}
              onClick={() => setActiveLesson(lesson)}
              className={`w-full text-left px-3 py-2 rounded text-sm mb-1 ${
                activeLesson?.id === lesson.id ? 'bg-brand text-white' : ''
              } ${!lesson.is_unlocked ? 'text-ink/30 cursor-not-allowed' : 'hover:bg-parchment-dark text-ink/80'}`}
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
            <p className="text-sm text-ink/50">No lessons unlocked yet.</p>
          )}
        </section>
      </main>
    </div>
  )
}
