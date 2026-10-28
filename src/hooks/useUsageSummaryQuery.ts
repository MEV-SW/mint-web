import { useQuery } from '@tanstack/react-query'
import { getUsageSummary } from '../api/statsApi'
import { usePermissions } from './usePermissions'

/** mint-server#213 — last 7 days of screen visits; admins only (others would get 403). */
export function useUsageSummaryQuery() {
  const { isAdmin } = usePermissions()
  return useQuery({
    queryKey: ['usage-summary', 7],
    queryFn: () => getUsageSummary(7),
    enabled: isAdmin,
    staleTime: 5 * 60_000,
    retry: false,
  })
}
