import { useEffect, useState } from 'react'
import client from '../../api/client'

export default function TeacherRecords() {
  const [records, setRecords] = useState([])

  useEffect(() => {
    client.get('/enrollments/teacher/records/').then((res) => setRecords(res.data))
  }, [])

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-medium">Student records</h1>
      <p className="text-sm text-gray-500">Read-only — progress is unlocked automatically or by an admin.</p>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-2">Student</th>
              <th className="px-4 py-2">Course</th>
              <th className="px-4 py-2">Progress</th>
              <th className="px-4 py-2">Enrolled</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2">
                  {r.student_username}
                  <span className="text-gray-400"> · {r.student_email}</span>
                </td>
                <td className="px-4 py-2">{r.course_title}</td>
                <td className="px-4 py-2">
                  {r.unlocked_lesson_order} / {r.total_lessons} lessons
                </td>
                <td className="px-4 py-2 text-gray-500">
                  {new Date(r.enrolled_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
