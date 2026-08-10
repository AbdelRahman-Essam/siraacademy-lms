import { Link, useLocation } from 'react-router-dom'
import Logo from './Logo'
import { useAuth } from '../context/AuthContext'
import { getRole, isAdmin } from '../utils/jwt'

const links = [
  { to: '/dashboard', label: 'My Courses' },
  { to: '/courses', label: 'Courses' },
]

export default function NavBar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const role = getRole()
  const admin = isAdmin()

  return (
    <header className="bg-white border-b border-brand/10">
      <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-8">
          <Logo size={34} />
          <nav className="hidden sm:flex gap-1">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm px-3 py-1.5 rounded font-medium ${
                  location.pathname === link.to
                    ? 'bg-brand text-white'
                    : 'text-ink/70 hover:bg-parchment-dark'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {admin && (
            <Link to="/admin" className="text-sm underline text-brass-dark">Admin Dashboard</Link>
          )}
          {(role === 'teacher' || admin) && (
            <Link to="/teacher" className="text-sm underline text-brass-dark">Teacher Panel</Link>
          )}
          <span className="text-sm text-ink/60 hidden sm:inline">Hi, {user?.username || '...'}</span>
          <button onClick={logout} className="text-sm underline text-ink/60">Log out</button>
        </div>
      </div>
    </header>
  )
}
