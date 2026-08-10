import { useEffect, useState } from 'react'
import client from '../api/client'
import NavBar from '../components/NavBar'
import LaurelDivider from '../components/LaurelDivider'
import CourseCard from '../components/CourseCard'

export default function Courses() {
  const [courses, setCourses] = useState(null)
  const [enrollingId, setEnrollingId] = useState(null)

  function loadCatalog() {
    client.get('/courses/catalog/').then((res) => setCourses(res.data))
  }

  useEffect(() => {
    loadCatalog()
  }, [])

  async function handleEnroll(courseId) {
    const course = courses.find((c) => c.id === courseId)
    setEnrollingId(courseId)
    try {
      if (course && Number(course.price) > 0) {
        const { data } = await client.post('/payments/checkout/', { course_id: courseId })
        window.location.href = data.iframe_url
        return
      }
      await client.post('/enrollments/enroll/', { course_id: courseId })
      loadCatalog()
    } catch (err) {
      alert(err.response?.data?.detail || 'Something went wrong.')
    } finally {
      setEnrollingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-parchment">
      <NavBar />

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-[0.2em] text-brass-dark font-mono mb-3">
            Sira English Academy
          </p>
          <h1 className="font-display text-4xl text-ink mb-3">Our courses</h1>
          <LaurelDivider className="mx-auto" />
          <p className="text-ink/60 mt-4 max-w-xl mx-auto">
            English and programming courses, taught step by step with live sessions,
            protected video lessons, and guided speaking practice.
          </p>
        </div>

        {!courses ? (
          <p className="text-center text-ink/50">Loading courses...</p>
        ) : courses.length === 0 ? (
          <p className="text-center text-ink/50">No courses published yet — check back soon.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onEnroll={handleEnroll}
                enrolling={enrollingId === course.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
