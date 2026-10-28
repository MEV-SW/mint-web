import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createSource } from '../../api/sourceApi'
import type { Edition } from '../../types/edition'
import type { Source } from '../../types/source'
import { sourceEditionIds } from '../../types/source'
import { apiErrorDetail } from '../../utils/apiError'
import { useToast } from '../common/Toast'

const SHARED_WIRES = ['전자신문 RSS', '모터그래프', '오토헤럴드', '연합뉴스 산업', '지디넷코리아']

// Admin-only "소스 정책 확인" block (#107: moved here from 03 주제, content unchanged, starts collapsed).
export function SourcePolicySection({ sources, editions }: { sources: Source[]; editions: Edition[] }) {
  const toast = useToast()
  const qc = useQueryClient()

  const duplicateSharedSource = useMutation({
    mutationFn: ({ sourceId, editionId, editionName }: { sourceId: string; editionId: string; editionName: string }) => {
      const source = sources.find((item) => item.id === sourceId)
      if (!source) throw new Error('Source not found')
      return createSource({
        name: `${source.name} · ${editionName}`,
        url: source.url,
        source_type: source.source_type,
        industry: source.industry,
        category: source.category,
        category_id: source.category_id,
        trust_level: source.trust_level,
        reliability_score: source.reliability_score,
        auto_publish: source.auto_publish,
        crawl_frequency: source.crawl_frequency,
        is_active: source.is_active,
        edition_id: editionId,
      })
    },
    onSuccess: () => {
      void Promise.all([
        qc.invalidateQueries({ queryKey: ['sources'] }),
        qc.invalidateQueries({ queryKey: ['editions'] }),
      ])
      toast('소스를 다른 주제에도 중복 등록했습니다.')
    },
    onError: (error) => toast(apiErrorDetail(error) ?? '소스 중복 등록에 실패했습니다.', 'err'),
  })

  return (
    <details className="settings-section source-policy-section sources-policy-details">
      <summary className="settings-section-head">
        <div><h3>소스 정책 확인</h3><p>중복 소스 마이그레이션과 지원 타입을 확인합니다.</p></div>
      </summary>
      <div className="source-policy-grid">
        <div>
          <h4>주제별 중복 등록</h4>
          {SHARED_WIRES.map((name) => {
            const matches = sources.filter((source) => source.name.startsWith(name))
            const topicIds = new Set(matches.flatMap((source) => sourceEditionIds(source)))
            const target = editions.find(
              (edition) => ['ev', 'autonomous'].includes(edition.slug) && !topicIds.has(edition.id),
            )
            return (
              <p key={name}>
                <span>{name}</span>
                {matches.length >= 2 || !matches[0] || !target ? (
                  <b>{matches.length >= 2 ? '중복 등록 확인' : '원본 확인 필요'}</b>
                ) : (
                  <button
                    type="button"
                    className="source-policy-action"
                    disabled={duplicateSharedSource.isPending}
                    onClick={() => duplicateSharedSource.mutate({
                      sourceId: matches[0].id,
                      editionId: target.id,
                      editionName: target.name,
                    })}
                  >
                    {target.name}에 중복 등록
                  </button>
                )}
              </p>
            )
          })}
        </div>
        <div>
          <h4>소스 타입</h4>
          <p><span>RSS</span><b>사용 중</b></p>
          <p><span>COMMUNITY</span><b>사용 중</b></p>
          <p><span>REDDIT</span><b>사용 중</b></p>
          <p className="is-disabled"><span>SNS (X·스레드)</span><b>신규·조사 필요</b></p>
        </div>
      </div>
    </details>
  )
}
