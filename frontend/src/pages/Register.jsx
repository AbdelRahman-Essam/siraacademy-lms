import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/Logo'

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white p-8 rounded-lg shadow">
        <div className="flex justify-center mb-6">
          <Logo size={56} />
        </div>
        <h1 className="text-xl font-medium mb-6 text-center">Create account</h1>

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <label className="block text-sm mb-1">Username</label>
        <input className="w-full border rounded px-3 py-2 mb-4" value={username}
          onChange={(e) => setUsername(e.target.value)} required />

        <label className="block text-sm mb-1">Email</label>
        <input type="email" className="w-full border rounded px-3 py-2 mb-4" value={email}
          onChange={(e) => setEmail(e.target.value)} required />

        <label className="block text-sm mb-1">Password</label>
        <input type="password" className="w-full border rounded px-3 py-2 mb-6" value={password}
          onChange={(e) => setPassword(e.target.value)} required minLength={8} />

        <button className="w-full bg-brand hover:bg-brand-light text-white rounded py-2" type="submit">
          Create account
        </button>

        <p className="text-sm text-center mt-4">
          Already have an account? <Link to="/login" className="underline">Log in</Link>
        </p>
      </form>
    </div>
  )
}
