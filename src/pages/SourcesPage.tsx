import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  crawlAllToDiscovery,
  crawlSource,
  crawlSourceToDiscovery,
  createSource,
  deleteSource,
  listSources,
  updateSource,
} from '../api/sourceApi'
import { TrustBadge } from '../components/common/Badges'
import { Btn } from '../components/common/Btn'
import { Icon } from '../components/common/Icon'
import { Modal } from '../components/common/Modal'
import { useToast } from '../components/common/Toast'
import { SourceFormFields } from '../components/sources/SourceFormFields'
import type { Source, SourceCreate } from '../types/source'
import { useActiveJobs } from '../hooks/useJobsQuery'
import { apiErrorDetail } from '../utils/apiError'
import { relativeCrawl } from '../utils/date'

const emptyForm: SourceCreate = {
  name: '',
  url: '',
  source_type: 'rss',
  category: '정책/규제',
  trust_level: 'high',
  reliability_score: 85,
  auto_publish: true,
  crawl_frequency: 'daily',
  is_active: true,
}

function sourceToForm(s: Source): SourceCreate {
  return {
    name: s.name,
    url: s.url,
    source_type: s.source_type,
    industry: s.industry,
    category: s.category,
    trust_level: s.trust_level,
    reliability_score: s.reliability_score,
    auto_publish: s.auto_publish,
    crawl_frequency: s.crawl_frequency,
    is_active: s.is_active,
  }
}

export function SourcesPage() {
  const toast = useToast()
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()
  const [q, setQ] = useState(() => searchParams.get('q') ?? '')

  useEffect(() => {
    const param = searchParams.get('q')
    if (param != null) setQ(param)
  }, [searchParams])
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Source | null>(null)
  const [form, setForm] = useState<SourceCreate>(emptyForm)
  const [crawling, setCrawling] = useState<string | null>(null)
  const [runningPipeline, setRunningPipeline] = useState(false)

  const { busy, activeLabel } = useActiveJobs()

  const { data: sources = [] } = useQuery({
    queryKey: ['sources'],
    queryFn: listSources,
  })

  const qLower = q.trim().toLowerCase()
  const rows = sources.filter(
    (s) =>
      !qLower ||
      s.name.toLowerCase().includes(qLower) ||
      s.url.toLowerCase().includes(qLower) ||
      (s.category && s.category.toLowerCase().includes(qLower)),
  )

  const save = useMutation({
    mutationFn: () => createSource(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sources'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      setShowAdd(false)
      setForm(emptyForm)
      toast('소스를 등록했습니다.')
    },
    onError: () => toast('등록 실패', 'err'),
  })

  const update = useMutation({
    mutationFn: () => updateSource(editing!.id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sources'] })
      setEditing(null)
      setForm(emptyForm)
      toast('소스를 수정했습니다.')
    },
    onError: () => toast('수정 실패', 'err'),
  })

  const toggleActive = useMutation({
    mutationFn: (s: Source) => updateSource(s.id, { is_active: !s.is_active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sources'] })
      toast('소스 상태를 변경했습니다.')
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteSource(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sources'] })
      toast('소스를 삭제했습니다.')
    },
  })

  async function crawl(s: Source) {
    setCrawling(s.id)
    try {
      await crawlSource(s.id)
      qc.invalidateQueries({ queryKey: ['jobs'] })
      toast('크롤링을 백그라운드에서 시작했습니다. 상단 작업 패널에서 진행 상태를 확인하세요.', 'info')
    } catch (e) {
      toast(apiErrorDetail(e) || '크롤링 요청 실패', 'err')
    } finally {
      setCrawling(null)
    }
  }

  async function crawlDiscoveryPipeline(s: Source) {
    setCrawling(s.id)
    try {
      await crawlSourceToDiscovery(s.id)
      qc.invalidateQueries({ queryKey: ['jobs'] })
      toast('[발견] 백그라운드에서 실행 중입니다. 작업 패널에서 진행 상태를 확인하세요.', 'info')
    } catch (e) {
      toast(apiErrorDetail(e) || '[발견] 크롤링 요청 실패', 'err')
    } finally {
      setCrawling(null)
    }
  }

  async function runDailyDiscoveryPipeline() {
    setRunningPipeline(true)
    try {
      await crawlAllToDiscovery({ trusted_only: true })
      qc.invalidateQueries({ queryKey: ['jobs'] })
      toast('[발견] 전체 파이프라인을 백그라운드에서 시작했습니다.', 'info')
    } catch (e) {
      toast(apiErrorDetail(e) || '[발견] 전체 파이프라인 요청 실패', 'err')
    } finally {
      setRunningPipeline(false)
    }
  }

  const crawlBlockedTitle = busy
    ? `진행 중인 작업: ${activeLabel ?? '백그라운드 작업'}`
    : undefined

  function openAdd() {
    setForm(emptyForm)
    setShowAdd(true)
  }

  function openEdit(s: Source) {
    setEditing(s)
    setForm(sourceToForm(s))
  }

  function closeModals() {
    setShowAdd(false)
    setEditing(null)
    setForm(emptyForm)
  }

  const canSave = Boolean(form.name.trim() && form.url.trim())

  return (
    <div className="content-inner page-fade">
      <div className="page-intro" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h2>소스 관리</h2>
          <p>크롤링 대상 소스를 등록·관리합니다. 신뢰도와 자동 게시 여부에 따라 수집 글 처리 방식이 달라집니다.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn
            variant="soft"
            icon="sparkles"
            onClick={runDailyDiscoveryPipeline}
            disabled={busy || runningPipeline}
            title={crawlBlockedTitle}
          >
            {busy
              ? '다른 작업 실행 중…'
              : runningPipeline
                ? 'AI 발견 파이프라인 요청 중…'
                : 'AI 발견 파이프라인 (신뢰소스 전체)'}
          </Btn>
          <Btn variant="primary" icon="plus" onClick={openAdd}>
            소스 추가
          </Btn>
        </div>
      </div>

      {busy && (
        <div className="busy-banner" role="status">
          <Icon name="clock" />
          <span>
            이미 진행 중인 작업이 있습니다
            {activeLabel ? ` (${activeLabel})` : ''}. 완료 후 다시 시도해 주세요.
          </span>
        </div>
      )}

      <div className="toolbar">
        <div className="search">
          <Icon name="search" />
          <input placeholder="소스명·URL 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="spacer" />
        <span className="result-count">
          {rows.length}개 소스 · {sources.filter((s) => s.is_active).length}개 활성
        </span>
      </div>

      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>소스</th>
              <th style={{ width: 100 }}>유형</th>
              <th style={{ width: 90 }}>카테고리</th>
              <th style={{ width: 130 }}>신뢰도</th>
              <th style={{ width: 90 }}>자동 게시</th>
              <th style={{ width: 130 }}>마지막 크롤링</th>
              <th style={{ width: 76 }}>활성</th>
              <th style={{ width: 140 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <td>
                  <div className="nm">{s.name}</div>
                  <div className="url" style={{ fontSize: 12, color: 'var(--text-faint)' }}>
                    {s.url}
                  </div>
                </td>
                <td>
                  <span className="type-tag">{s.source_type}</span>
                </td>
                <td>
                  <span className="ctag">{s.category}</span>
                </td>
                <td>
                  <TrustBadge level={s.trust_level} score={s.reliability_score} />
                </td>
                <td>
                  {s.auto_publish ? (
                    <span className="badge badge-mint">
                      <span className="dot" />
                      자동
                    </span>
                  ) : (
                    <span className="badge badge-unknown">검토</span>
                  )}
                </td>
                <td className="mono" style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                  {relativeCrawl(s.last_crawled_at)}
                </td>
                <td>
                  <div
                    className={`switch ${s.is_active ? 'on' : ''}`}
                    onClick={() => toggleActive.mutate(s)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && toggleActive.mutate(s)}
                  />
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <Btn variant="ghost" size="sm" title="설정" onClick={() => openEdit(s)}>
                      <Icon name="filter" />
                    </Btn>
                    <Btn
                      variant="soft"
                      size="sm"
                      onClick={() => crawl(s)}
                      disabled={busy || crawling === s.id || !s.is_active}
                      title={busy ? crawlBlockedTitle : '수동 크롤링'}
                    >
                      <Icon name="refresh" className={crawling === s.id ? 'spin' : ''} />
                    </Btn>
                    <Btn
                      variant="soft"
                      size="sm"
                      onClick={() => crawlDiscoveryPipeline(s)}
                      disabled={busy || crawling === s.id || !s.is_active}
                      title={busy ? crawlBlockedTitle : 'AI 발견으로 수동 크롤링'}
                    >
                      <Icon name="sparkles" className={crawling === s.id ? 'spin' : ''} />
                    </Btn>
                    <Btn variant="outline" size="sm" icon="trash" onClick={() => remove.mutate(s.id)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <Modal
          title="소스 추가"
          wide
          onClose={closeModals}
          footer={
            <>
              <Btn variant="outline" onClick={closeModals}>
                취소
              </Btn>
              <Btn variant="primary" icon="plus" onClick={() => save.mutate()} disabled={!canSave || save.isPending}>
                {save.isPending ? '등록 중…' : '등록'}
              </Btn>
            </>
          }
        >
          <SourceFormFields form={form} onChange={setForm} />
        </Modal>
      )}

      {editing && (
        <Modal
          title="소스 수정"
          wide
          onClose={closeModals}
          footer={
            <>
              <Btn variant="outline" onClick={closeModals}>
                취소
              </Btn>
              <Btn
                variant="primary"
                onClick={() => update.mutate()}
                disabled={!canSave || update.isPending}
              >
                {update.isPending ? '저장 중…' : '저장'}
              </Btn>
            </>
          }
        >
          <SourceFormFields form={form} onChange={setForm} />
        </Modal>
      )}
    </div>
  )
}
