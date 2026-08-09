import { Outlet, Link } from 'react-router-dom'
import Logo from '../components/Logo'
import { useAuth } from '../context/AuthContext'

export default function AdminLayout() {
  const { logout } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <Logo size={32} />
          <span className="text-sm font-medium text-gray-500">Admin Dashboard</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="text-sm underline">Student view</Link>
          <button onClick={logout} className="text-sm underline">Log out</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
