import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
import NavBar from '../components/NavBar'
import LaurelDivider from '../components/LaurelDivider'

export default function Dashboard() {
  const [enrollments, setEnrollments] = useState(null)
  const { user, fetchMe } = useAuth()

  useEffect(() => {
    if (!user) fetchMe()
    client.get('/enrollments/me/').then((res) => setEnrollments(res.data))
  }, [])

  return (
    <div className="min-h-screen bg-parchment">
      <NavBar />

      <main className="max-w-5xl mx-auto p-6">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-brass-dark font-mono mb-2">
            Welcome back
          </p>
          <h1 className="font-display text-3xl text-ink">{user?.username || '...'}</h1>
          <LaurelDivider className="mt-3" />
        </div>

        <h2 className="text-sm font-medium text-ink/50 uppercase tracking-wide mb-4">My Courses</h2>

        {!enrollments ? (
          <p className="text-sm text-ink/50">Loading...</p>
        ) : enrollments.length === 0 ? (
          <div className="paper-card p-8 text-center">
            <p className="text-ink/60 mb-4">You're not enrolled in any course yet.</p>
            <Link
              to="/courses"
              className="inline-block bg-brand hover:bg-brand-light text-white rounded px-5 py-2 text-sm"
            >
              Browse courses
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {enrollments.map((enrollment) => (
              <Link
                key={enrollment.id}
                to={`/courses/${enrollment.course}`}
                className="paper-card p-5 hover:border-brand/30 transition-colors"
              >
                <h3 className="font-display text-lg text-ink mb-1">{enrollment.course_title}</h3>
                <p className="text-xs text-ink/40">
                  Enrolled {new Date(enrollment.enrolled_at).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
