import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { setMyEditions } from '../api/authApi'
import { listAvailableEditions } from '../api/editionApi'
import { EditionPicker } from '../components/onboarding/EditionPicker'
import { useToast } from '../components/common/Toast'
import { PageShell } from '../components/layout/PageShell'
import { useAuthStore } from '../store/authStore'
import { apiErrorDetail } from '../utils/apiError'

export function OnboardingPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const setUser = useAuthStore((s) => s.setUser)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const catalog = useQuery({
    queryKey: ['editions', 'available'],
    queryFn: listAvailableEditions,
  })

  const save = useMutation({
    mutationFn: () => setMyEditions(selectedIds),
    onSuccess: (user) => {
      setUser(user)
      void qc.invalidateQueries({ queryKey: ['editions'] })
      void qc.invalidateQueries({ queryKey: ['editorial-feed'] })
      toast('선택한 지면을 열었습니다.')
      navigate('/', { replace: true })
    },
    onError: (error) => toast(apiErrorDetail(error) ?? '분야 저장에 실패했습니다.', 'err'),
  })

  return (
    <PageShell
      section="처음 오셨군요"
      title="어떤 지면을 볼까요?"
      lead="관심 있는 사업 분야를 고르면 그 1면이 열립니다. 여러 장을 골라도 되고, 나중에 설정에서 바꿀 수 있습니다. 편집 권한은 총관이 별도로 지정합니다."
    >
      {catalog.isLoading && <p className="personal-empty personal-empty-inline">분야를 불러오는 중…</p>}
      {catalog.isError && (
        <p className="personal-empty personal-empty-inline">분야 목록을 불러오지 못했습니다.</p>
      )}
      {catalog.data && (
        <EditionPicker
          editions={catalog.data}
          selectedIds={selectedIds}
          onChange={setSelectedIds}
          onSubmit={() => save.mutate()}
          submitting={save.isPending}
        />
      )}
      <p className="edition-onboarding-foot">
        분야가 없거나 권한이 필요하면 <Link to="/inquiries">문의</Link>로 알려 주세요.
      </p>
    </PageShell>
  )
}
