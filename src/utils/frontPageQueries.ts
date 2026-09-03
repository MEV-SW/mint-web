import type { QueryClient } from '@tanstack/react-query'

/** Invalidate all queries that feed the home / 1면 dashboard. */
export function invalidateFrontPageQueries(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
  void qc.invalidateQueries({ queryKey: ['edition-report'] })
  void qc.invalidateQueries({ queryKey: ['editorial-feed'] })
}
