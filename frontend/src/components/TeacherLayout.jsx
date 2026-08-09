import { NavLink, Outlet } from 'react-router-dom'
import Logo from './Logo'
import { useAuth } from '../context/AuthContext'

const tabs = [
  { to: '/teacher/live-sessions', label: 'Live Sessions' },
  { to: '/teacher/records', label: 'Student Records' },
  { to: '/teacher/grading', label: 'Grading' },
]

export default function TeacherLayout() {
  const { logout } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <Logo size={32} />
          <nav className="flex gap-1">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  `text-sm px-3 py-1.5 rounded ${isActive ? 'bg-brand text-white' : 'text-gray-600 hover:bg-gray-100'}`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <button onClick={logout} className="text-sm underline">Log out</button>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
