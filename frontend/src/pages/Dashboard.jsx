import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/Logo'
import { getRole, isAdmin } from '../utils/jwt'

export default function Dashboard() {
  const [courses, setCourses] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const { user, fetchMe, logout } = useAuth()
  const role = getRole()
  const admin = isAdmin()

  useEffect(() => {
    if (!user) fetchMe()
    client.get('/courses/').then((res) => setCourses(res.data))
    client.get('/enrollments/me/').then((res) => setEnrollments(res.data))
  }, [])

  const enrolledCourseIds = new Set(enrollments.map((e) => e.course))

  async function enroll(courseId) {
    await client.post('/enrollments/enroll/', { course_id: courseId })
    const { data } = await client.get('/enrollments/me/')
    setEnrollments(data)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <Logo size={36} />
        <div className="flex items-center gap-4">
          {admin && (
            <Link to="/admin" className="text-sm underline text-brand">Admin Dashboard</Link>
          )}
          {(role === 'teacher' || admin) && (
            <Link to="/teacher" className="text-sm underline text-brand">Teacher Panel</Link>
          )}
          <span className="text-sm text-gray-600">Hi, {user?.username || '...'}</span>
          <button onClick={logout} className="text-sm underline">Log out</button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6">
        <h2 className="text-lg font-medium mb-4">Courses</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {courses.map((course) => (
            <div key={course.id} className="bg-white rounded-lg shadow p-4">
              <h3 className="font-medium mb-1">{course.title}</h3>
              <p className="text-sm text-gray-500 mb-4">{course.description}</p>

              {enrolledCourseIds.has(course.id) ? (
                <Link to={`/courses/${course.id}`} className="text-sm underline text-brand">
                  Continue learning
                </Link>
              ) : (
                <button
                  onClick={() => enroll(course.id)}
                  className="text-sm bg-brand hover:bg-brand-light text-white rounded px-3 py-1.5"
                >
                  Enroll
                </button>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
