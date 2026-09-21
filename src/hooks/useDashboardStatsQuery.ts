import { useQuery } from '@tanstack/react-query'
import { fetchDashboardStats } from '../api/statsApi'

/** Poll while the 1면 is open; also refresh on focus / reconnect when a new Daily appears. */
const IDLE_POLL_MS = 60_000
const BUSY_POLL_MS = 5_000

export function useDashboardStatsQuery(crawlBusy = false) {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
    refetchInterval: crawlBusy ? BUSY_POLL_MS : IDLE_POLL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })
}
