import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { recordVisit } from '../api/statsApi'
import { screenKey } from '../utils/screenKey'

// Gates and index routes may redirect right after the first render; count where the user lands.
const SETTLE_MS = 400

/** mint-server#213 — one visit per route change (query-only changes on a screen are not counted). */
export function useVisitTracker() {
  const { pathname, search } = useLocation()
  const screen = screenKey(pathname, search)
  useEffect(() => {
    if (!screen) return
    const timer = window.setTimeout(() => recordVisit(screen), SETTLE_MS)
    return () => window.clearTimeout(timer)
  }, [pathname, screen])
}
