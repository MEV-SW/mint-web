import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import {
  WEEKLY_PAGE_SIZE,
  deleteWeeklyReport,
  generateWeeklyReports,
  getWeeklyReport,
  listWeeklyReports,
} from '../../api/weeklyReportApi'
import { usePermissions } from '../../hooks/usePermissions'
import type { Edition } from '../../types/edition'
import type { WeeklyReportDetail, WeeklyReportListItem } from '../../types/weeklyReport'
import { apiErrorDetail, apiErrorStatus } from '../../utils/apiError'
import { cx } from '../../utils/cx'
import { weekName, weekRange } from '../../utils/weekLabel'
import { OverflowMenu } from '../common/OverflowMenu'
import { LoadErrorBanner, NotFoundState } from '../common/PageStates'
import { useToast } from '../common/Toast'
import { useConfirm } from '../common/useConfirm'
import { WeeklyEditsPanel } from './WeeklyEditsPanel'
import { WeeklyReportEditor } from './WeeklyReportEditor'
import { WeeklyReportPaper } from './WeeklyReportPaper'

// Handoff §3–4: rail at 1200+, a week bar above the body at 768–1199, sticky week bar below 768.
const MOBILE_QUERY = '(max-width: 767px)'
const MEDIUM_QUERY = '(max-width: 1199px)'
type Layout = 'mobile' | 'medium' | 'desktop'

function subscribeLayout(onChange: () => void) {
  const medias = [window.matchMedia(MOBILE_QUERY), window.matchMedia(MEDIUM_QUERY)]
  medias.forEach((media) => media.addEventListener('change', onChange))
  return () => medias.forEach((media) => media.removeEventListener('change', onChange))
}

function currentLayout(): Layout {
  if (window.matchMedia(MOBILE_QUERY).matches) return 'mobile'
  return window.matchMedia(MEDIUM_QUERY).matches ? 'medium' : 'desktop'
}

function useLayout(): Layout {
  return useSyncExternalStore(subscribeLayout, currentLayout, () => 'desktop')
}

/** Skeletons only after 300ms so quick loads do not flash (R5-13). */
function useDelayed(active: boolean, ms = 300): boolean {
  const [elapsed, setElapsed] = useState(false)
  useEffect(() => {
    if (!active) return
    const timer = window.setTimeout(() => setElapsed(true), ms)
    return () => {
      window.clearTimeout(timer)
      setElapsed(false)
    }
  }, [active, ms])
  return active && elapsed
}

function railTag(item: WeeklyReportListItem): { label: string; tone: string } | null {
  if (item.model === 'fallback') return { label: '대체 본문', tone: 'is-fallback' }
  if (item.model === 'none') return { label: '빈 주', tone: 'is-empty' }
  if (item.edited) return { label: '수정됨', tone: 'is-edited' }
  return null
}

function WeekRow({
  item,
  current,
  onSelect,
}: {
  item: WeeklyReportListItem
  current: boolean
  onSelect: () => void
}) {
  const tag = railTag(item)
  return (
    <li>
      <button
        type="button"
        className={cx('wk-rail-row', current && 'is-current')}
        aria-current={current ? 'page' : undefined}
        onClick={onSelect}
      >
        <span className="wk-rail-text">
          <span className="wk-rail-name">{weekName(item.week_start)}</span>
          <span className="wk-rail-range wk-num">{weekRange(item.week_start)}</span>
        </span>
        {tag && <span className={cx('wk-rail-tag', tag.tone)}>{tag.label}</span>}
      </button>
    </li>
  )
}

function SkeletonLines({ count }: { count: number }) {
  return (
    <div className="wk-skeleton" aria-hidden>
      {Array.from({ length: count }, (_, index) => (
        <span key={index} />
      ))}
    </div>
  )
}

export function WeeklyReportView({ editions, viewSwitch }: { editions: Edition[]; viewSwitch: React.ReactNode }) {
  const [params, setParams] = useSearchParams()
  const layout = useLayout()
  const narrow = layout === 'mobile'
  const qc = useQueryClient()
  const toast = useToast()
  const confirm = useConfirm()
  const { isAdmin } = usePermissions()

  const editionId = params.get('edition') && editions.some((e) => e.id === params.get('edition'))
    ? (params.get('edition') as string)
    : editions[0]?.id
  const edition = editions.find((e) => e.id === editionId)
  const weekParam = params.get('week')

  const [editing, setEditing] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [rebuilding, setRebuilding] = useState<string | null>(null)

  const list = useInfiniteQuery({
    queryKey: ['weekly-reports', editionId],
    enabled: !!editionId,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => listWeeklyReports(editionId as string, pageParam),
    getNextPageParam: (last) =>
      last.length === WEEKLY_PAGE_SIZE ? last[last.length - 1].week_start : undefined,
    // While a deleted week is being rebuilt, poll until it is back in the list.
    refetchInterval: (query) =>
      rebuilding && !(query.state.data?.pages ?? []).flat().some((w) => w.week_start === rebuilding) ? 5000 : false,
  })
  const weeks = useMemo(() => (list.data?.pages ?? []).flat(), [list.data])
  const selected = weeks.find((w) => w.week_start === weekParam) ?? (weekParam ? undefined : weeks[0])

  // A shared link may point at an older week than the first page holds.
  useEffect(() => {
    if (weekParam && !selected && list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage()
  }, [weekParam, selected, list])

  const rebuildingWeek = rebuilding && !weeks.some((w) => w.week_start === rebuilding) ? rebuilding : null

  const detail = useQuery({
    queryKey: ['weekly-report', selected?.id],
    enabled: !!selected,
    queryFn: () => getWeeklyReport(selected!.id),
  })
  const report = detail.data

  useEffect(() => {
    if (!sheetOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSheetOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sheetOpen])

  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const guard = useCallback(
    async (go: () => void) => {
      if (editing && dirty) {
        const ok = await confirm({
          title: '편집 중인 변경을 버릴까요?',
          cancelLabel: '계속 편집',
          confirmLabel: '버리기',
          danger: true,
        })
        if (!ok) return
      }
      setEditing(false)
      setDirty(false)
      go()
    },
    [confirm, dirty, editing],
  )

  const goWeek = (weekStart: string) =>
    void guard(() => {
      setSheetOpen(false)
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set('view', 'weekly')
          if (editionId) next.set('edition', editionId)
          next.set('week', weekStart)
          return next
        },
        { replace: false },
      )
    })

  const goReport = async (id: string | null) => {
    if (!id) return
    const target = weeks.find((w) => w.id === id)
    if (target) return goWeek(target.week_start)
    try {
      const fetched = await qc.fetchQuery({ queryKey: ['weekly-report', id], queryFn: () => getWeeklyReport(id) })
      if (list.hasNextPage) void list.fetchNextPage()
      goWeek(fetched.week_start)
    } catch (error) {
      toast(apiErrorDetail(error) || '주간 리포트를 불러오지 못했습니다.', 'err')
    }
  }

  const goEdition = (id: string) =>
    void guard(() =>
      setParams((prev) => {
        const next = new URLSearchParams(prev)
        next.set('view', 'weekly')
        next.set('edition', id)
        next.delete('week')
        return next
      }),
    )

  const generate = useMutation({
    mutationFn: (body: { week_start?: string; edition_id: string }) => generateWeeklyReports(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jobs'] })
      toast('주간 리포트 생성을 시작했습니다.')
    },
    onError: (error: unknown) => toast(apiErrorDetail(error) || '주간 리포트 생성을 시작하지 못했습니다.', 'err'),
  })

  const rebuild = async (target: WeeklyReportDetail) => {
    const ok = await confirm({
      title: '이 주간 리포트를 지우고 다시 만들까요?',
      body: `${weekName(target.week_start)} · ${edition?.name ?? ''} 리포트와 수정한 내용·수정 이력이 함께 지워집니다. 다시 만들기는 바로 시작되고, 완료까지 몇 분 걸릴 수 있습니다.`,
      confirmLabel: '삭제 후 다시 만들기',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteWeeklyReport(target.id)
      setRebuilding(target.week_start)
      qc.removeQueries({ queryKey: ['weekly-report', target.id] })
      await qc.invalidateQueries({ queryKey: ['weekly-reports', editionId] })
      // If the rebuild never starts, stop waiting for it (the toast explains why).
      generate.mutate(
        { week_start: target.week_start, edition_id: target.edition_id },
        { onError: () => setRebuilding(null) },
      )
    } catch (error) {
      toast(apiErrorDetail(error) || '삭제하지 못했습니다.', 'err')
    }
  }

  const railSkeleton = useDelayed(list.isLoading)
  const paperSkeleton = useDelayed(detail.isLoading)

  if (!edition) {
    return (
      <>
        <div className="wk-toolbar">{viewSwitch}</div>
        <p className="wk-state">볼 수 있는 분야가 없습니다.</p>
      </>
    )
  }

  const tabs = (
    <div className="wk-tabs" role="tablist" aria-label="분야">
      <span className="wk-tabs-label">분야</span>
      <div className="wk-tabs-scroll">
        {editions.map((e) => (
          <button
            key={e.id}
            type="button"
            role="tab"
            aria-selected={e.id === editionId}
            className={cx('wk-tab', e.id === editionId && 'is-current')}
            onClick={() => e.id !== editionId && goEdition(e.id)}
          >
            {e.name}
          </button>
        ))}
      </div>
    </div>
  )

  const weekList = (
    <>
      <ol className="wk-rail-list">
        {weeks.map((item) => (
          <WeekRow
            key={item.id}
            item={item}
            current={item.id === selected?.id}
            onSelect={() => goWeek(item.week_start)}
          />
        ))}
      </ol>
      {list.hasNextPage && (
        <button
          type="button"
          className="wk-more-btn"
          disabled={list.isFetchingNextPage}
          onClick={() => void list.fetchNextPage()}
        >
          {list.isFetchingNextPage ? '불러오는 중…' : `더 보기 (이전 ${WEEKLY_PAGE_SIZE}주)`}
        </button>
      )}
    </>
  )

  const prevWeek = report ? weeks.find((w) => w.id === report.prev_id) : undefined

  const actions = report && !editing && report.can_edit && (
    <>
      <button type="button" className="wk-act is-primary" onClick={() => setEditing(true)}>
        편집
      </button>
      {!narrow && (
        <button type="button" className="wk-act" onClick={() => setHistoryOpen(true)}>
          수정 이력
        </button>
      )}
      {(narrow || isAdmin) && (
        <OverflowMenu
          label="더 보기"
          items={[
            ...(narrow ? [{ key: 'history', label: '수정 이력', onClick: () => setHistoryOpen(true) }] : []),
            ...(isAdmin
              ? [{ key: 'rebuild', label: '삭제 후 다시 만들기', danger: true, onClick: () => void rebuild(report) }]
              : []),
          ]}
        />
      )}
    </>
  )

  const fallbackBanner = report?.model === 'fallback' && (
    <div className="wk-fallback-banner" role="note">
      <div>
        <strong>AI 요약 실패로 기사 목록만 표시</strong>
        <p>핵심 흐름은 데일리 리포트 요약 첫 줄, 기사 줄은 기사 제목으로 대신합니다.</p>
      </div>
      {isAdmin && report.can_edit && !editing && (
        <button type="button" className="wk-link-btn" onClick={() => void rebuild(report)}>
          ⋯ › 삭제 후 다시 만들기
        </button>
      )}
    </div>
  )

  let paper: React.ReactNode
  if (list.isError) {
    paper = (
      <LoadErrorBanner
        title="주간 리포트 목록을 불러오지 못했습니다"
        error={list.error}
        failedAt={list.errorUpdatedAt}
        onRetry={() => void list.refetch()}
        retrying={list.isFetching}
      />
    )
  } else if (list.isLoading) {
    paper = paperSkeleton || railSkeleton ? <SkeletonLines count={5} /> : null
  } else if (rebuildingWeek && (!selected || selected.week_start === rebuildingWeek)) {
    paper = (
      <div className="wk-state" role="status">
        <p className="wk-state-title">이 주 리포트를 다시 만드는 중입니다.</p>
        <p>위쪽 작업 표시줄에서 진행 상황을 볼 수 있습니다. 끝나면 목록을 다시 불러옵니다.</p>
      </div>
    )
  } else if (weeks.length === 0) {
    paper = (
      <div className="wk-state">
        <p className="wk-state-title">아직 이 분야의 주간 리포트가 없습니다.</p>
        <p>매주 월요일 09:00에 지난주 리포트가 만들어집니다.</p>
        {isAdmin && (
          <button
            type="button"
            className="wk-act is-primary"
            disabled={generate.isPending}
            onClick={() => generate.mutate({ edition_id: edition.id })}
          >
            지금 만들기
          </button>
        )}
      </div>
    )
  } else if (weekParam && !selected) {
    paper = list.hasNextPage ? (
      <SkeletonLines count={5} />
    ) : (
      <div className="wk-state">
        <p className="wk-state-title">이 주의 주간 리포트가 없습니다.</p>
        <button type="button" className="wk-act" onClick={() => goWeek(weeks[0].week_start)}>
          최신 주로 가기
        </button>
      </div>
    )
  } else if (detail.isError) {
    paper =
      apiErrorStatus(detail.error) === 404 ? (
        <NotFoundState
          title="주간 리포트를 찾을 수 없습니다."
          backTo={`/reports?view=weekly&edition=${edition.id}`}
          backLabel="주간 목록으로"
        />
      ) : (
        <LoadErrorBanner
          title="주간 리포트를 불러오지 못했습니다"
          error={detail.error}
          failedAt={detail.errorUpdatedAt}
          onRetry={() => void detail.refetch()}
          retrying={detail.isFetching}
        />
      )
  } else if (!report) {
    paper = paperSkeleton ? <SkeletonLines count={5} /> : null
  } else if (editing) {
    paper = (
      <WeeklyReportEditor
        key={report.updated_at}
        report={report}
        onDirtyChange={setDirty}
        onForbidden={() => {
          setEditing(false)
          setDirty(false)
          void detail.refetch()
        }}
        onReload={() => {
          setEditing(false)
          setDirty(false)
          void detail.refetch().then(() => setEditing(true))
        }}
        onDone={(saved) => {
          setEditing(false)
          setDirty(false)
          if (saved) {
            qc.setQueryData(['weekly-report', saved.id], saved)
            void qc.invalidateQueries({ queryKey: ['weekly-reports', editionId] })
          }
        }}
      />
    )
  } else {
    paper = (
      <WeeklyReportPaper report={report} editionName={edition.name} actions={actions} banner={fallbackBanner} />
    )
  }

  const prevLabel = prevWeek ? `‹ 이전 주 · ${weekName(prevWeek.week_start)}` : '‹ 이전 주'
  const topNav = report && !editing && layout === 'desktop' && (
    <div className="wk-pager">
      <button
        type="button"
        className="wk-pager-btn"
        disabled={!report.prev_id}
        aria-label={prevWeek ? `이전 주, ${weekName(prevWeek.week_start)}` : '이전 주'}
        onClick={() => void goReport(report.prev_id)}
      >
        {prevLabel}
      </button>
      <span className="wk-pager-right">
        {!report.next_id && <span className="wk-pager-latest">최신 주</span>}
        <button
          type="button"
          className="wk-pager-btn"
          disabled={!report.next_id}
          aria-label="다음 주"
          onClick={() => void goReport(report.next_id)}
        >
          다음 주 ›
        </button>
      </span>
    </div>
  )

  const bottomNav = report && !editing && (
    <div className="wk-pager wk-pager-bottom">
      <button
        type="button"
        className="wk-pager-btn is-plain"
        disabled={!report.prev_id}
        onClick={() => void goReport(report.prev_id)}
      >
        {prevWeek
          ? narrow
            ? `‹ ${weekName(prevWeek.week_start)}`
            : `‹ ${weekName(prevWeek.week_start)} · ${weekRange(prevWeek.week_start)}`
          : '‹ 이전 주'}
      </button>
      {report.next_id ? (
        <button type="button" className="wk-pager-btn is-plain" onClick={() => void goReport(report.next_id)}>
          다음 주 ›
        </button>
      ) : (
        <span className="wk-pager-btn is-plain is-off">다음 주 없음</span>
      )}
    </div>
  )

  return (
    <div className="wk-view">
      <div className="wk-toolbar">
        {viewSwitch}
        {tabs}
      </div>
      {layout !== 'desktop' ? (
        <>
          {selected && !editing && (
            <div className={cx('wk-weekbar', narrow && 'is-sticky')}>
              <button
                type="button"
                className="wk-weekbar-arrow"
                aria-label="이전 주"
                disabled={!report?.prev_id}
                onClick={() => void goReport(report?.prev_id ?? null)}
              >
                ‹
              </button>
              <button
                type="button"
                className="wk-weekbar-pick"
                aria-haspopup="dialog"
                aria-expanded={sheetOpen}
                onClick={() => setSheetOpen(true)}
              >
                <strong>{weekName(selected.week_start)}</strong>
                <span className="wk-num">{weekRange(selected.week_start)}</span>
                <span aria-hidden>▾</span>
              </button>
              <button
                type="button"
                className="wk-weekbar-arrow"
                aria-label="다음 주"
                disabled={!report?.next_id}
                onClick={() => void goReport(report?.next_id ?? null)}
              >
                ›
              </button>
            </div>
          )}
          <div className="wk-main">
            {paper}
            {bottomNav}
          </div>
          {sheetOpen &&
            createPortal(
              <div className="wk-sheet-backdrop" onMouseDown={() => setSheetOpen(false)}>
                <div
                  className="wk-sheet"
                  role="dialog"
                  aria-modal="true"
                  aria-label="지난 주 목록"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <div className="wk-sheet-head">
                    <span>지난 주</span>
                    <button type="button" className="wk-link-btn" onClick={() => setSheetOpen(false)}>
                      닫기
                    </button>
                  </div>
                  <nav aria-label="지난 주 목록">{weekList}</nav>
                </div>
              </div>,
              document.body,
            )}
        </>
      ) : (
        <div className="wk-layout">
          <nav className="wk-rail" aria-label="지난 주 목록">
            <div className="wk-rail-head">
              <span>지난 주</span>
              <span className="wk-rail-sub">최근 {WEEKLY_PAGE_SIZE}주</span>
            </div>
            {railSkeleton ? <SkeletonLines count={5} /> : weekList}
          </nav>
          <div className="wk-main">
            {topNav}
            {paper}
            {bottomNav}
          </div>
        </div>
      )}
      {historyOpen && report && (
        <WeeklyEditsPanel report={report} editionName={edition.name} onClose={() => setHistoryOpen(false)} />
      )}
    </div>
  )
}
