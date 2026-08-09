/** Decodes a JWT's payload without verifying the signature — fine for
 * client-side UI decisions (show/hide a nav link), since the backend
 * re-checks every permission on every request regardless of this. */
export function decodeToken(token) {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

export function getRole() {
  const token = localStorage.getItem('access_token')
  if (!token) return null
  return decodeToken(token)?.role || null
}

export function isAdmin() {
  const token = localStorage.getItem('access_token')
  if (!token) return false
  const payload = decodeToken(token)
  return Boolean(payload && (payload.role === 'admin' || payload.is_staff || payload.is_superuser))
}
