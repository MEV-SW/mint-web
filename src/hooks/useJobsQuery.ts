import { useQuery } from '@tanstack/react-query'
import { listJobs } from '../api/jobApi'
import type { JobStatus } from '../types/job'

function isActive(status: JobStatus) {
  return status === 'pending' || status === 'running'
}

export function useJobsQuery() {
  return useQuery({
    queryKey: ['jobs'],
    queryFn: () => listJobs({ limit: 15 }),
    refetchInterval: (query) => {
      const rows = query.state.data
      if (rows?.some((j) => isActive(j.status))) return 2500
      return false
    },
  })
}

export function useActiveJobs() {
  const query = useJobsQuery()
  const activeJobs = (query.data ?? []).filter((j) => isActive(j.status))
  return {
    ...query,
    activeJobs,
    busy: activeJobs.length > 0,
    activeLabel: activeJobs[0]?.label ?? null,
  }
}
