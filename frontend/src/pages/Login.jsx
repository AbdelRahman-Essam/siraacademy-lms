import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/Logo'

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white p-8 rounded-lg shadow">
        <div className="flex justify-center mb-6">
          <Logo size={56} />
        </div>
        <h1 className="text-xl font-medium mb-6 text-center">Log in</h1>

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <label className="block text-sm mb-1">Username</label>
        <input
          className="w-full border rounded px-3 py-2 mb-4"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        <label className="block text-sm mb-1">Password</label>
        <input
          type="password"
          className="w-full border rounded px-3 py-2 mb-6"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button className="w-full bg-brand hover:bg-brand-light text-white rounded py-2" type="submit">
          Log in
        </button>

        <p className="text-sm text-center mt-4">
          No account? <Link to="/register" className="underline">Register</Link>
        </p>
      </form>
    </div>
  )
}
