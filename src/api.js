import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (error) => {
    const onAuthPage = window.location.pathname === '/login'
    if (error.response?.status === 401 && !onAuthPage) {
      localStorage.clear()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const errMsg = (e) =>
  e?.response?.data?.message || (e?.response ? 'Request failed' : 'Cannot reach the server. Is the backend running on port 8080?')

export default api
