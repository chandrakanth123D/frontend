import { createContext, useContext, useState } from 'react'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
  })

  const signIn = (data) => {
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data))
    setUser(data)
  }
  const signOut = () => {
    localStorage.clear()
    setUser(null)
  }
  return <Ctx.Provider value={{ user, signIn, signOut }}>{children}</Ctx.Provider>
}

export const homeFor = (role) => ({ PATIENT: '/patient', DOCTOR: '/doctor', ADMIN: '/admin' }[role] || '/login')
