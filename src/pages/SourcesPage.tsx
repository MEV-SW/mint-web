import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  crawlSource,
  crawlSourceToDiscovery,
  createSource,
  deleteSource,
  listSources,
  updateSource,
} from '../api/sourceApi'
import { Btn } from '../components/common/Btn'
import { Icon } from '../components/common/Icon'
import { OverflowMenu } from '../components/common/OverflowMenu'
import { Modal } from '../components/common/Modal'
import { PageShell } from '../components/layout/PageShell'
import { useToast } from '../components/common/Toast'
import { useConfirm } from '../components/common/useConfirm'
import { SourceFormFields } from '../components/sources/SourceFormFields'
import { SourcePolicySection } from '../components/sources/SourcePolicySection'
import { listEditions } from '../api/editionApi'
import type { Source, SourceCreate } from '../types/source'
import {
  COMMUNITY_SOURCE_PRESET,
  COMMUNITY_SOURCE_TYPES,
} from '../types/source'
import { useActiveJobs } from '../hooks/useJobsQuery'
import { usePermissions } from '../hooks/usePermissions'
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
  edition_id: '',
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  rss: 'RSS',
  webpage: '웹페이지',
  news_page: '뉴스',
  notice_page: '공지',
  manual: '수동',
  reddit: 'Reddit (수집 불가)',
  community_forum: '커뮤니티',
  community_api: '커뮤니티 API',
  community_feed: '커뮤니티 피드',
}

type SourceKind = 'all' | 'official' | 'community'
type StatusChip = 'all' | 'failed' | 'off' | 'manual'
type SourceStatus = 'off' | 'failed' | 'ok'

const STATUS_CHIPS: [StatusChip, string][] = [
  ['all', '전체'],
  ['failed', '실패'],
  ['off', '꺼짐'],
  ['manual', '자동 게시 꺼짐'],
]

// One status per row: 꺼짐 > 실패 > 정상 (#107). Failure uses the #174/#178 server rule.
function sourceStatus(s: Source): SourceStatus {
  if (!s.is_active) return 'off'
  if (s.collection_failed) return 'failed'
  return 'ok'
}

function matchesChip(s: Source, chip: StatusChip): boolean {
  if (chip === 'failed') return s.is_active && Boolean(s.collection_failed)
  if (chip === 'off') return !s.is_active
  if (chip === 'manual') return !s.auto_publish
  return true
}

function failureDetail(s: Source): string {
  return [s.last_error_code, s.last_attempted_at ? `${relativeCrawl(s.last_attempted_at)} 시도` : null]
    .filter(Boolean)
    .join(' · ')
}
type AddMode = 'official' | 'community'

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
    edition_id: s.edition_id,
  }
}

function normalizeFormForSave(form: SourceCreate, mode: AddMode): SourceCreate {
  const reddit = form.source_type === 'reddit'
  if (mode !== 'community') {
    return reddit ? { ...form, is_active: false, crawl_frequency: 'daily' } : { ...form, crawl_frequency: 'daily' }
  }
  return {
    ...form,
    trust_level: 'low',
    reliability_score: 45,
    auto_publish: false,
    category: '커뮤니티/현장',
    crawl_frequency: 'daily',
    is_active: reddit ? false : form.is_active,
  }
}

export function SourcesPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()
  const [q, setQ] = useState(() => searchParams.get('q') ?? '')
  const [showAdd, setShowAdd] = useState(false)
  const [addMode, setAddMode] = useState<AddMode>('official')
  const [editing, setEditing] = useState<Source | null>(null)
  const [form, setForm] = useState<SourceCreate>(emptyForm)
  const [crawling, setCrawling] = useState<string | null>(null)
  const [sourceKind, setSourceKind] = useState<SourceKind>('all')
  const [statusChip, setStatusChip] = useState<StatusChip>('all')
  // 03 주제 › 소스 tab links here with ?edition={id} (#106).
  const [editionFilter, setEditionFilter] = useState(() => searchParams.get('edition') ?? 'all')

  const { busy, activeLabel, activeProgress } = useActiveJobs()
  const { isAdmin } = usePermissions()

  const { data: sources = [] } = useQuery({
    queryKey: ['sources'],
    queryFn: listSources,
  })
  const { data: editions = [] } = useQuery({
    queryKey: ['editions', 'all'],
    queryFn: () => listEditions(false),
  })

  const qLower = q.trim().toLowerCase()
  // Kind, topic and search narrow the list first; chip counts are taken from that set.
  const scoped = sources.filter((s) => {
    const isCommunity = COMMUNITY_SOURCE_TYPES.includes(s.source_type)
    if (sourceKind === 'community' && !isCommunity) return false
    if (sourceKind === 'official' && isCommunity) return false
    if (editionFilter !== 'all' && s.edition_id !== editionFilter) return false
    if (
      qLower &&
      !s.name.toLowerCase().includes(qLower) &&
      !s.url.toLowerCase().includes(qLower) &&
      !(s.category && s.category.toLowerCase().includes(qLower))
    ) {
      return false
    }
    return true
  })
  const chipCounts = Object.fromEntries(
    STATUS_CHIPS.map(([chip]) => [chip, scoped.filter((s) => matchesChip(s, chip)).length]),
  ) as Record<StatusChip, number>
  const rows = scoped.filter((s) => matchesChip(s, statusChip))
  const editionName = (s: Source) =>
    editions.find((edition) => edition.id === s.edition_id)?.name ?? '알 수 없음'
  const activeCount = sources.filter((s) => s.is_active).length
  const communityCount = sources.filter((s) => COMMUNITY_SOURCE_TYPES.includes(s.source_type)).length
  const editingIsCommunity =
    editing != null && COMMUNITY_SOURCE_TYPES.includes(editing.source_type)

  const save = useMutation({
    mutationFn: () => createSource(normalizeFormForSave(form, addMode)),
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
    mutationFn: () =>
      updateSource(
        editing!.id,
        normalizeFormForSave(form, editingIsCommunity ? 'community' : 'official'),
      ),
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
      qc.invalidateQueries({ queryKey: ['admin-summary'] })
      toast('소스 상태를 변경했습니다.')
    },
    onError: (error) => toast(apiErrorDetail(error) ?? '소스 상태 변경에 실패했습니다.', 'err'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteSource(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sources'] })
      qc.invalidateQueries({ queryKey: ['editions'] })
      qc.invalidateQueries({ queryKey: ['admin-summary'] })
      toast('소스를 삭제했습니다.')
    },
    onError: (error) => toast(apiErrorDetail(error) ?? '소스 삭제에 실패했습니다.', 'err'),
  })

  async function confirmRemove(source: Source) {
    if (
      !(await confirm({
        title: `「${source.name}」 소스를 삭제할까요?`,
        body: '기존 기사 이력은 유지됩니다.',
        confirmLabel: '삭제',
        danger: true,
      }))
    ) return
    remove.mutate(source.id)
  }

  async function crawl(s: Source) {
    if (
      !(await confirm({
        title: `‘${s.name}’ 지금 수집할까요?`,
        body: '중요 게시판으로 수집합니다. 진행 상태는 작업 패널에서 확인합니다.',
        confirmLabel: '지금 수집',
      }))
    ) return
    setCrawling(s.id)
    try {
      await crawlSource(s.id)
      qc.invalidateQueries({ queryKey: ['jobs'] })
      toast('중요 게시판 수집을 백그라운드에서 시작했습니다. 상단 작업 패널에서 진행 상태를 확인하세요.', 'info')
    } catch (e) {
      toast(apiErrorDetail(e) || '중요 게시판 수집 요청 실패', 'err')
    } finally {
      setCrawling(null)
    }
  }

  async function crawlDiscoveryPipeline(s: Source) {
    if (
      !(await confirm({
        title: `‘${s.name}’ 탐문으로 수집할까요?`,
        body: '수집한 글은 탐문 후보로 들어갑니다. 진행 상태는 작업 패널에서 확인합니다.',
        confirmLabel: '탐문으로 수집',
      }))
    ) return
    setCrawling(s.id)
    try {
      await crawlSourceToDiscovery(s.id)
      qc.invalidateQueries({ queryKey: ['jobs'] })
      toast('탐문 수집을 백그라운드에서 시작했습니다. 작업 패널에서 진행 상태를 확인하세요.', 'info')
    } catch (e) {
      toast(apiErrorDetail(e) || '탐문 수집 요청 실패', 'err')
    } finally {
      setCrawling(null)
    }
  }

  // #107: both directions ask; turning off is the red confirm.
  async function requestToggleActive(source: Source) {
    const ok = source.is_active
      ? await confirm({
          title: `‘${source.name}’ 수집을 끌까요?`,
          body: '다시 켤 때까지 수집하지 않습니다.',
          confirmLabel: '끄기',
          danger: true,
        })
      : await confirm({
          title: `‘${source.name}’ 수집을 켤까요?`,
          body: '다음 수집부터 이 소스를 포함합니다.',
          confirmLabel: '켜기',
        })
    if (ok) toggleActive.mutate(source)
  }

  function rowMenu(s: Source) {
    const crawlDisabled = busy || crawling === s.id || !s.is_active
    const redditLocked = s.source_type === 'reddit' && !s.is_active
    return (
      <OverflowMenu
        label={`${s.name} 메뉴`}
        items={[
          { key: 'edit', label: '편집', onClick: () => openEdit(s) },
          { key: 'trusted', label: '지금 수집', disabled: crawlDisabled, onClick: () => void crawl(s) },
          { key: 'discovery', label: '탐문으로 수집', disabled: crawlDisabled, onClick: () => void crawlDiscoveryPipeline(s) },
          {
            key: 'toggle',
            label: s.is_active ? '끄기' : redditLocked ? '켜기 (Reddit 수집 불가)' : '켜기',
            disabled: redditLocked || toggleActive.isPending,
            danger: s.is_active,
            onClick: () => void requestToggleActive(s),
          },
          { key: 'delete', label: '삭제', danger: true, disabled: remove.isPending, onClick: () => void confirmRemove(s) },
        ]}
      />
    )
  }

  function statusCell(s: Source) {
    const status = sourceStatus(s)
    if (status === 'off') return <span className="badge badge-unknown">꺼짐</span>
    if (status === 'failed') {
      const detail = failureDetail(s)
      return (
        <span className="source-status-failed" title={detail || undefined}>
          <span className="badge badge-failed">실패</span>
          {detail && <small>{detail}</small>}
        </span>
      )
    }
    return (
      <span className="badge badge-mint">
        <span className="dot" />
        정상
      </span>
    )
  }

  function autoPublishCell(s: Source) {
    return s.auto_publish ? (
      <span className="badge badge-mint">자동</span>
    ) : (
      <span className="badge badge-unknown">검토</span>
    )
  }

  function openAdd() {
    setForm({ ...emptyForm, edition_id: editions[0]?.id ?? '' })
    setAddMode('official')
    setShowAdd(true)
  }

  function openAddCommunity() {
    setForm({ ...COMMUNITY_SOURCE_PRESET, edition_id: editions[0]?.id ?? '' })
    setAddMode('community')
    setShowAdd(true)
  }

  function openEdit(s: Source) {
    setEditing(s)
    setForm(sourceToForm(s))
  }

  function closeModals() {
    setShowAdd(false)
    setEditing(null)
    setAddMode('official')
    setForm(emptyForm)
  }

  const canSave = Boolean(form.name.trim() && form.url.trim() && form.edition_id)

  return (
    <PageShell
      section="운영 · 수집"
      title="소스 관리"
      lead="크롤링 대상 소스를 등록·관리합니다. 소스는 주제 1개에만 속하며, 크롤러는 그 주제의 관련성 키워드로 수집합니다. 범용 와이어는 주제별로 중복 등록해 양쪽을 커버합니다."
      leadSingleLine
    >
      {busy && (
        <div className="busy-banner" role="status">
          <Icon name="clock" />
          <span>
            진행 중인 작업
            {activeLabel ? ` (${activeLabel})` : ''}
            {activeProgress ? ` — ${activeProgress}` : ''}. 완료 후 다시 시도해 주세요.
          </span>
        </div>
      )}

      <div className="sources-page">
        <section className="sources-block sources-ops-moved" aria-label="소스 추가">
          {isAdmin && (
            <p className="sources-ops-moved-note">
              수집 실행과 탐문 후보 삭제 기한은 <Link to="/admin/jobs">02 작업 로그</Link>에서 관리합니다.
            </p>
          )}
          <div className="sources-ops-moved-actions">
            <Btn variant="primary" size="sm" icon="plus" onClick={openAdd}>
              공식 소스 추가
            </Btn>
            <Btn variant="outline" size="sm" icon="plus" onClick={openAddCommunity}>
              커뮤니티 소스 추가
            </Btn>
          </div>
        </section>

        <section className="sources-block sources-block-list" aria-labelledby="sources-list-heading">
          <header className="sources-list-head">
            <div className="sources-list-head-main">
              <h2 id="sources-list-heading" className="sources-block-title">
                등록 소스
              </h2>
              <p className="sources-list-meta">
                전체 <strong>{rows.length}</strong>개 · 활성 <strong>{activeCount}</strong>개
                {communityCount > 0 && (
                  <>
                    {' '}
                    · 커뮤니티 <strong>{communityCount}</strong>개
                  </>
                )}
              </p>
            </div>
            <div className="sources-list-toolbar">
              <label className="sources-topic-filter">
                <span className="sr-only">주제별 필터</span>
                <select
                  className="input"
                  value={editionFilter}
                  onChange={(event) => setEditionFilter(event.target.value)}
                  aria-label="주제별 필터"
                >
                  <option value="all">전체 주제</option>
                  {editions.map((edition) => (
                    <option key={edition.id} value={edition.id}>{edition.name}</option>
                  ))}
                </select>
              </label>
              <label className="sources-topic-filter">
                <span className="sr-only">종류</span>
                <select
                  className="input"
                  value={sourceKind}
                  onChange={(event) => setSourceKind(event.target.value as SourceKind)}
                  aria-label="종류"
                >
                  <option value="all">전체 종류</option>
                  <option value="official">공식</option>
                  <option value="community">커뮤니티</option>
                </select>
              </label>
              <label className="sources-list-search">
                <Icon name="search" />
                <input
                  placeholder="소스명·URL 검색"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  aria-label="소스 검색"
                />
              </label>
            </div>
          </header>

          <div className="sources-status-chips" role="group" aria-label="상태 필터">
            {STATUS_CHIPS.map(([chip, label]) => (
              <button
                key={chip}
                type="button"
                aria-pressed={statusChip === chip}
                className={`sources-status-chip ${statusChip === chip ? 'active' : ''} ${chip === 'failed' && chipCounts.failed > 0 ? 'is-alert' : ''}`}
                onClick={() => setStatusChip(chip)}
              >
                {label} <b>{chipCounts[chip]}</b>
              </button>
            ))}
          </div>

          {rows.length === 0 && (
            <p className="sources-empty-cell sources-empty-note">
              {sources.length > 0
                ? '선택한 조건에 맞는 소스가 없습니다.'
                : '등록된 소스가 없습니다. 소스를 추가해 주세요.'}
            </p>
          )}

          {rows.length > 0 && (
            <div className="sources-table-wrap tbl-wrap">
              <table className="tbl sources-table">
                <thead>
                  <tr>
                    <th>소스</th>
                    <th style={{ width: 100 }}>유형</th>
                    <th style={{ width: 130 }}>주제</th>
                    <th style={{ width: 90 }}>자동 게시</th>
                    <th style={{ width: 150 }}>상태</th>
                    <th className="num" style={{ width: 120 }}>마지막 수집</th>
                    <th style={{ width: 48 }}><span className="sr-only">메뉴</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.id} className={sourceStatus(s) === 'off' ? 'is-off' : undefined}>
                      <td>
                        <div className="nm">{s.name}</div>
                        <div className="url" style={{ fontSize: 12, color: 'var(--text-faint)' }}>
                          {s.url}
                        </div>
                      </td>
                      <td>
                        <span className="type-tag">
                          {SOURCE_TYPE_LABELS[s.source_type] ?? s.source_type}
                        </span>
                      </td>
                      <td>
                        <span className="ctag">{editionName(s)}</span>
                      </td>
                      <td>{autoPublishCell(s)}</td>
                      <td>{statusCell(s)}</td>
                      <td className="mono num" style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                        {relativeCrawl(s.last_crawled_at)}
                      </td>
                      <td className="row-actions">{rowMenu(s)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {rows.length > 0 && (
            <ul className="sources-cards" aria-label="등록 소스">
              {rows.map((s) => (
                <li key={s.id} className={`sources-card ${sourceStatus(s) === 'off' ? 'is-off' : ''}`}>
                  <div className="sources-card-main">
                    <div className="nm">{s.name}</div>
                    <div className="sources-card-badges">
                      {statusCell(s)}
                      {autoPublishCell(s)}
                    </div>
                    <small className="sources-card-meta">
                      {SOURCE_TYPE_LABELS[s.source_type] ?? s.source_type} · {editionName(s)} · {relativeCrawl(s.last_crawled_at)}
                    </small>
                  </div>
                  {rowMenu(s)}
                </li>
              ))}
            </ul>
          )}
        </section>

        {isAdmin && <SourcePolicySection sources={sources} editions={editions} />}
      </div>

      {showAdd && (
        <Modal
          title={addMode === 'community' ? '커뮤니티 소스 추가' : '공식 소스 추가'}
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
          <SourceFormFields mode={addMode} form={form} onChange={setForm} editions={editions} />
        </Modal>
      )}

      {editing && (
        <Modal
          title={editingIsCommunity ? '커뮤니티 소스 수정' : '공식 소스 수정'}
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
          <SourceFormFields
            mode={editingIsCommunity ? 'community' : 'official'}
            form={form}
            onChange={setForm}
            lockSourceType
            editions={editions}
          />
        </Modal>
      )}
    </PageShell>
  )
}
