import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { setMyEditions } from '../../api/authApi'
import { listAvailableEditions } from '../../api/editionApi'
import { useToast } from '../common/Toast'
import { useAuthStore } from '../../store/authStore'
import { apiErrorDetail } from '../../utils/apiError'
import { EditionPicker } from './EditionPicker'

export function MyEditionsSection() {
  const toast = useToast()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const lockedIds = useMemo(
    () => (user?.editions ?? []).filter((item) => item.is_editor).map((item) => item.id),
    [user?.editions],
  )
  const membershipIds = useMemo(
    () => (user?.editions ?? []).map((item) => item.id),
    [user?.editions],
  )
  const [selectedIds, setSelectedIds] = useState<string[]>(membershipIds)

  useEffect(() => {
    setSelectedIds(membershipIds)
  }, [membershipIds])

  const catalog = useQuery({
    queryKey: ['editions', 'available'],
    queryFn: listAvailableEditions,
  })

  const save = useMutation({
    mutationFn: () => setMyEditions([...new Set([...selectedIds, ...lockedIds])]),
    onSuccess: (next) => {
      setUser(next)
      void qc.invalidateQueries({ queryKey: ['editions'] })
      void qc.invalidateQueries({ queryKey: ['editorial-feed'] })
      toast('내 지면을 저장했습니다.')
    },
    onError: (error) => toast(apiErrorDetail(error) ?? '지면 저장에 실패했습니다.', 'err'),
  })

  return (
    <section className="settings-section" id="my-editions">
      <header className="settings-section-head">
        <div>
          <h3>내 지면</h3>
          <p>
            홈에 펼칠 사업 분야를 고릅니다. 여러 장을 볼 수 있고, 편집장으로 지정된 지면은 유지됩니다.
          </p>
        </div>
      </header>
      {catalog.isLoading && <p className="personal-empty personal-empty-inline">분야를 불러오는 중…</p>}
      {catalog.isError && (
        <p className="personal-empty personal-empty-inline">분야 목록을 불러오지 못했습니다.</p>
      )}
      {catalog.data && (
        <EditionPicker
          editions={catalog.data}
          selectedIds={selectedIds}
          lockedIds={lockedIds}
          onChange={setSelectedIds}
          onSubmit={() => save.mutate()}
          submitting={save.isPending}
          submitLabel="내 지면 저장"
        />
      )}
    </section>
  )
}
