import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { fetchMe } from '../api/authApi'
import { useAuthStore } from '../store/authStore'

export function ProtectedRoute() {
  const token = useAuthStore((s) => s.token)
  const setUser = useAuthStore((s) => s.setUser)
  const logout = useAuthStore((s) => s.logout)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!token) {
      setReady(true)
      return
    }
    let cancelled = false
    fetchMe()
      .then((user) => {
        if (!cancelled) setUser(user)
      })
      .catch(() => {
        if (!cancelled) logout()
      })
      .finally(() => {
        if (!cancelled) setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [token, setUser, logout])

  if (!token) return <Navigate to="/login" replace />
  if (!ready) return null
  return <Outlet />
}
