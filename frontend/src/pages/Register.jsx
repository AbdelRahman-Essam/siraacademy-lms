import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/Logo'
import LaurelDivider from '../components/LaurelDivider'

export default function Register() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { register } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      await register(username, email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.password?.[0] || 'Could not create account.')
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
          <h2 className="font-display text-lg text-ink mb-6 text-center">Create account</h2>

          {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

          <label className="block text-sm text-ink/70 mb-1">Username</label>
          <input className="w-full border border-ink/15 rounded px-3 py-2 mb-4 bg-white focus:outline-none focus:border-brand"
            value={username} onChange={(e) => setUsername(e.target.value)} required />

          <label className="block text-sm text-ink/70 mb-1">Email</label>
          <input type="email" className="w-full border border-ink/15 rounded px-3 py-2 mb-4 bg-white focus:outline-none focus:border-brand"
            value={email} onChange={(e) => setEmail(e.target.value)} required />

          <label className="block text-sm text-ink/70 mb-1">Password</label>
          <input type="password" className="w-full border border-ink/15 rounded px-3 py-2 mb-6 bg-white focus:outline-none focus:border-brand"
            value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />

          <button className="w-full bg-brand hover:bg-brand-light text-white rounded py-2 transition-colors" type="submit">
            Create account
          </button>

          <p className="text-sm text-center mt-4 text-ink/60">
            Already have an account? <Link to="/login" className="underline text-brass-dark">Log in</Link>
          </p>
        </div>
      </form>
    </div>
  )
}
