import { useQuery } from '@tanstack/react-query'
import { getAdminSummary } from '../api/statsApi'
import { usePermissions } from './usePermissions'

const REFRESH_MS = 60_000

/** mint-server#174 summary — admins and edition editors only (others would get 403). */
export function useAdminSummaryQuery() {
  const { canEditAny } = usePermissions()
  return useQuery({
    queryKey: ['admin-summary'],
    queryFn: getAdminSummary,
    enabled: canEditAny,
    refetchInterval: REFRESH_MS,
    retry: false,
  })
}
