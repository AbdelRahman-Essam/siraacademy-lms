import { Outlet, Link } from 'react-router-dom'
import Logo from './Logo'
import { useAuth } from '../context/AuthContext'

export default function AdminLayout() {
  const { logout } = useAuth()

  return (
    <div className="min-h-screen bg-parchment">
      <header className="bg-white border-b border-brand/10 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <Logo size={32} />
          <span className="text-sm font-medium text-ink/50 font-mono uppercase tracking-wide">Admin Dashboard</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="text-sm underline text-ink/60">Student view</Link>
          <button onClick={logout} className="text-sm underline text-ink/60">Log out</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
