import { useQuery } from '@tanstack/react-query'
import { listJobs } from '../api/jobApi'
import type { JobStatus } from '../types/job'
import { isActiveJobStatus, jobProgressSummary, pickPrimaryActiveJob } from '../utils/jobProgress'

function isActive(status: JobStatus) {
  return isActiveJobStatus(status)
}

export function useJobsQuery() {
  return useQuery({
    queryKey: ['jobs'],
    queryFn: () => listJobs({ limit: 15 }),
    refetchInterval: (query) => {
      const rows = query.state.data
      if (rows?.some((j) => isActive(j.status))) return 1000
      return false
    },
  })
}

export function useActiveJobs() {
  const query = useJobsQuery()
  const activeJobs = (query.data ?? []).filter((j) => isActive(j.status))
  const activeJob = pickPrimaryActiveJob(query.data ?? [])
  return {
    ...query,
    activeJobs,
    activeJob,
    busy: activeJobs.length > 0,
    activeLabel: activeJob?.label ?? null,
    activeProgress: jobProgressSummary(activeJob),
  }
}
