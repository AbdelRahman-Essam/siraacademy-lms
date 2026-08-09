import { Navigate } from 'react-router-dom'

export default function ProtectedRoute({ children }) {
  const hasToken = Boolean(localStorage.getItem('access_token'))
  if (!hasToken) return <Navigate to="/login" replace />
  return children
}
