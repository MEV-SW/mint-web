import { useQuery } from '@tanstack/react-query'
import { fetchDashboardStats } from '../api/statsApi'

/**
 * Poll while the 1면 is open; also refresh on focus / reconnect when a new Daily appears.
 * #127: no faster polling during a crawl — JobStatusPanel invalidates the 1면 queries once the job ends.
 */
const POLL_MS = 60_000

export function useDashboardStatsQuery() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })
}
