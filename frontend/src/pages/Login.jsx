import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/Logo'
import LaurelDivider from '../components/LaurelDivider'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      await login(username, password)
      navigate('/dashboard')
    } catch {
      setError('Invalid username or password.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-parchment px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Logo size={64} showName={false} />
          <h1 className="font-display text-2xl text-ink mt-4">Sira English</h1>
          <LaurelDivider className="mt-2" />
        </div>

        <div className="paper-card p-8">
          <h2 className="font-display text-lg text-ink mb-6 text-center">Log in</h2>

          {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

          <label className="block text-sm text-ink/70 mb-1">Username</label>
          <input
            className="w-full border border-ink/15 rounded px-3 py-2 mb-4 bg-white focus:outline-none focus:border-brand"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <label className="block text-sm text-ink/70 mb-1">Password</label>
          <input
            type="password"
            className="w-full border border-ink/15 rounded px-3 py-2 mb-6 bg-white focus:outline-none focus:border-brand"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button className="w-full bg-brand hover:bg-brand-light text-white rounded py-2 transition-colors" type="submit">
            Log in
          </button>

          <p className="text-sm text-center mt-4 text-ink/60">
            No account? <Link to="/register" className="underline text-brass-dark">Register</Link>
          </p>
        </div>
      </form>
    </div>
  )
}
