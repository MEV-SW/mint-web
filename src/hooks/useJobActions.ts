import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cancelJob, clearFinishedJobs, deleteJob } from '../api/jobApi'
import { useToast } from '../components/common/Toast'
import { useConfirm } from '../components/common/useConfirm'
import type { BackgroundJob } from '../types/job'
import { apiErrorDetail } from '../utils/apiError'

/** Cancel / delete / "완료 정리" for background jobs — shared by the job popover and the job log page. */
export function useJobActions() {
  const qc = useQueryClient()
  const toast = useToast()
  const confirm = useConfirm()

  // Prefix match: refreshes both the popover (['jobs']) and the job log (['jobs', 'log']).
  const invalidate = () => qc.invalidateQueries({ queryKey: ['jobs'] })

  const cancelMut = useMutation({
    mutationFn: cancelJob,
    onSuccess: () => {
      toast('작업을 취소했습니다.', 'info')
      invalidate()
    },
    onError: (e) => toast(apiErrorDetail(e) || '작업 취소 실패', 'err'),
  })

  const deleteMut = useMutation({
    mutationFn: deleteJob,
    onSuccess: () => {
      toast('작업 내역을 삭제했습니다.')
      invalidate()
    },
    onError: (e) => toast(apiErrorDetail(e) || '삭제 실패', 'err'),
  })

  const clearMut = useMutation({
    mutationFn: clearFinishedJobs,
    onSuccess: (res) => {
      toast(res.deleted ? `완료된 작업 ${res.deleted}건을 정리했습니다.` : '정리할 작업이 없습니다.', 'info')
      invalidate()
    },
    onError: (e) => toast(apiErrorDetail(e) || '정리 실패', 'err'),
  })

  async function cancel(job: BackgroundJob) {
    if (!(await confirm({ title: `「${job.label}」 작업을 취소할까요?`, confirmLabel: '작업 취소', danger: true }))) return
    cancelMut.mutate(job.id)
  }

  async function remove(job: BackgroundJob) {
    if (!(await confirm({ title: `「${job.label}」 작업 내역을 삭제할까요?`, confirmLabel: '삭제', danger: true }))) return
    deleteMut.mutate(job.id)
  }

  async function clearFinished() {
    if (
      !(await confirm({
        title: '완료·실패·취소된 모든 작업 내역을 목록에서 정리할까요?',
        confirmLabel: '완료 정리',
        danger: true,
      }))
    ) return
    clearMut.mutate()
  }

  return {
    cancel,
    remove,
    clearFinished,
    busy: cancelMut.isPending || deleteMut.isPending || clearMut.isPending,
  }
}
