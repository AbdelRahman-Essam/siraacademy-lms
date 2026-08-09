import { Navigate } from 'react-router-dom'
import { getRole } from '../utils/jwt'

export default function TeacherRoute({ children }) {
  const hasToken = Boolean(localStorage.getItem('access_token'))
  if (!hasToken) return <Navigate to="/login" replace />

  const role = getRole()
  if (role !== 'teacher' && role !== 'admin') return <Navigate to="/dashboard" replace />

  return children
}
