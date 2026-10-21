import { useQuery } from '@tanstack/react-query'
import { listJobs } from '../api/jobApi'
import type { JobStatus } from '../types/job'
import { isActiveJobStatus, jobProgressSummary, pickPrimaryActiveJob } from '../utils/jobProgress'

/** #127: poll interval while a job runs — shared by every jobs query. */
export const ACTIVE_JOB_POLL_MS = 5_000

function isActive(status: JobStatus) {
  return isActiveJobStatus(status)
}

export function useJobsQuery(enabled = true) {
  return useQuery({
    queryKey: ['jobs'],
    queryFn: () => listJobs({ limit: 15 }),
    enabled,
    // #127: 5s while a job runs (was 1s); this is the only query that polls faster during a crawl.
    refetchInterval: (query) => {
      const rows = query.state.data
      if (rows?.some((j) => isActive(j.status))) return ACTIVE_JOB_POLL_MS
      return false
    },
  })
}

export function useActiveJobs(enabled = true) {
  const query = useJobsQuery(enabled)
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
