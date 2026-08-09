import axios from 'axios'

// Change this to your Cloudflare Tunnel domain once deployed,
// e.g. "https://academy.yourdomain.com/api"
export const API_BASE_URL = '/api'

const client = axios.create({ baseURL: API_BASE_URL })

// Attach the access token to every request automatically.
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// If a request fails with 401, try refreshing the token once, then retry.
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const { data } = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, { refresh })
          localStorage.setItem('access_token', data.access)
          originalRequest.headers.Authorization = `Bearer ${data.access}`
          return client(originalRequest)
        } catch {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export default client
