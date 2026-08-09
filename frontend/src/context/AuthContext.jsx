import { createContext, useContext, useState } from 'react'
import client from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)

  async function login(username, password) {
    const { data } = await client.post('/auth/login/', { username, password })
    localStorage.setItem('access_token', data.access)
    localStorage.setItem('refresh_token', data.refresh)
    await fetchMe()
  }

  async function register(username, email, password) {
    await client.post('/auth/register/', { username, email, password })
    await login(username, password)
  }

  async function fetchMe() {
    setLoading(true)
    try {
      const { data } = await client.get('/auth/me/')
      setUser(data)
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setUser(null)
    window.location.replace('/login')
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, fetchMe }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
