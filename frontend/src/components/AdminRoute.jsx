import { Navigate } from 'react-router-dom'
import { decodeToken } from '../utils/jwt'

export default function AdminRoute({ children }) {
  const token = localStorage.getItem('access_token')
  if (!token) return <Navigate to="/login" replace />

  const payload = decodeToken(token)
  const isAdmin = payload?.role === 'admin' || payload?.is_staff || payload?.is_superuser
  if (!isAdmin) return <Navigate to="/dashboard" replace />

  return children
}
