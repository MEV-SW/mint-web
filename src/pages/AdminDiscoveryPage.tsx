import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { listEditions } from '../api/editionApi'
import { approvePost, deletePost, hidePost, listPosts, promotePost } from '../api/postApi'
import type { PostListParams } from '../api/postApi'
import { getCollectionSettings } from '../api/sourceApi'
import { Btn } from '../components/common/Btn'
import { OverflowMenu } from '../components/common/OverflowMenu'
import { useToast } from '../components/common/Toast'
import { useConfirm } from '../components/common/useConfirm'
import { PageShell } from '../components/layout/PageShell'
import { usePermissions } from '../hooks/usePermissions'
import type { Post } from '../types/post'
import { apiErrorDetail } from '../utils/apiError'
import { relativeCrawl } from '../utils/date'
import { usePostLinkState } from '../hooks/usePostLinkState'

type ColumnKey = 'pending' | 'published' | 'promoted' | 'hidden'
type CardAction = 'approve' | 'promote' | 'hide' | 'delete'

const PAGE_STEP = 20
const MAX_SIZE = 100 // GET /posts size limit
const DEFAULT_RETENTION_DAYS = 14

// #105: every column filters created_by=ai_discovery (discovery posts keep it after promotion).
// 숨김 has no board filter: hide only changes status, so a promoted-then-hidden post lands here,
// and 게시 from 숨김 sends it back to 게시됨 or 승격됨 by its board.
const COLUMNS: { key: ColumnKey; label: string; params: PostListParams; actions: CardAction[] }[] = [
  { key: 'pending', label: '검토 대기', params: { board_type: 'discovery', status: 'pending' }, actions: ['approve', 'promote', 'hide'] },
  { key: 'published', label: '게시됨', params: { board_type: 'discovery', status: 'published' }, actions: ['promote', 'hide'] },
  { key: 'promoted', label: '승격됨', params: { board_type: 'trusted', status: 'published' }, actions: ['hide'] },
  { key: 'hidden', label: '숨김', params: { status: 'hidden' }, actions: ['approve'] },
]

const ACTION_LABELS: Record<CardAction, string> = { approve: '게시', promote: '승격', hide: '숨김', delete: '삭제' }

// Columns collapse only when stacked (≤640px); wider, the header is plain text, not a button.
const NARROW_QUERY = '(max-width: 640px)'

function subscribeNarrow(onChange: () => void) {
  const media = window.matchMedia(NARROW_QUERY)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

function useNarrowLayout(): boolean {
  return useSyncExternalStore(subscribeNarrow, () => window.matchMedia(NARROW_QUERY).matches, () => false)
}

export function AdminDiscoveryPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const qc = useQueryClient()
  const { isAdmin, user } = usePermissions()
  const [edition, setEdition] = useState('all')

  const { data: orgEditions = [] } = useQuery({
    queryKey: ['editions', 'active'],
    queryFn: () => listEditions(true),
    enabled: isAdmin,
  })
  const { data: settings } = useQuery({
    queryKey: ['collection-settings'],
    queryFn: getCollectionSettings,
  })

  // Admins see the org's active editions; editors only the editions they edit (handoff decision).
  const editorEditions = (user?.editions ?? []).filter((item) => item.is_editor)
  const chips = isAdmin
    ? orgEditions.map((item) => ({ id: item.id, name: item.name }))
    : editorEditions.map((item) => ({ id: item.id, name: item.name }))
  // "전체": admin → no edition filter; editor → all of their editions.
  const editionIds: string[] | undefined =
    edition !== 'all' ? [edition] : isAdmin ? undefined : editorEditions.map((item) => item.id)
  const scopeKey = editionIds?.join(',') ?? 'all'

  const act = useMutation({
    mutationFn: ({ type, id }: { type: CardAction; id: string }) => {
      if (type === 'approve') return approvePost(id)
      if (type === 'promote') return promotePost(id)
      if (type === 'delete') return deletePost(id)
      return hidePost(id)
    },
    onSuccess: (_post, { type }) => {
      void Promise.all([
        qc.invalidateQueries({ queryKey: ['posts'] }),
        qc.invalidateQueries({ queryKey: ['admin-summary'] }),
      ])
      toast(
        type === 'delete'
          ? '후보를 삭제했습니다.'
          : type === 'hide'
            ? '후보를 숨겼습니다.'
            : type === 'promote'
              ? '중요 게시판으로 승격했습니다.'
              : '후보를 게시했습니다.',
      )
    },
    onError: (error) => toast(apiErrorDetail(error) ?? '처리에 실패했습니다.', 'err'),
  })

  async function runAction(type: CardAction, post: Post) {
    // #119: delete cannot be undone from any screen — red confirm.
    if (
      type === 'delete' &&
      !(await confirm({
        title: `‘${post.title}’ 후보를 삭제할까요?`,
        body: '삭제한 후보는 어느 열에서도 되돌릴 수 없습니다.',
        confirmLabel: '삭제',
        danger: true,
      }))
    ) return
    // Hide is reversible but the card leaves the column, so it asks first; the others run at once.
    if (
      type === 'hide' &&
      !(await confirm({
        title: `‘${post.title}’ 후보를 숨길까요?`,
        body: '숨김 열에서 다시 게시할 수 있습니다.',
        confirmLabel: '숨김',
        danger: true,
      }))
    ) return
    act.mutate({ type, id: post.id })
  }

  const retentionDays = settings?.discovery_pending_retention_days ?? DEFAULT_RETENTION_DAYS

  return (
    <PageShell
      section="콘텐츠"
      title="탐문 후보"
      lead="탐문으로 들어온 기사를 상태별로 보고 게시·승격·숨김을 처리합니다."
      leadSingleLine
    >
      <div className="discovery-board-top">
        <div className="discovery-edition-chips" role="group" aria-label="분야">
          {[{ id: 'all', name: '전체' }, ...chips].map((chip) => (
            <button
              key={chip.id}
              type="button"
              aria-pressed={edition === chip.id}
              className={`discovery-edition-chip ${edition === chip.id ? 'active' : ''}`}
              onClick={() => setEdition(chip.id)}
            >
              {chip.name}
            </button>
          ))}
        </div>
        <p className="discovery-retention">
          검토 대기 {retentionDays}일 경과 시 자동 삭제 (운영 설정값, 기본 {settings?.default_retention_days ?? DEFAULT_RETENTION_DAYS})
          {isAdmin && (
            <>
              {' · '}
              <Link to="/admin/jobs">02 작업 로그에서 변경</Link>
            </>
          )}
        </p>
      </div>

      <div className="discovery-board">
        {COLUMNS.map((column) => (
          // Keyed by scope so "더 보기" resets when the edition changes.
          <DiscoveryColumn
            key={`${column.key}-${scopeKey}`}
            column={column}
            editionIds={editionIds}
            scopeKey={scopeKey}
            busy={act.isPending}
            onAction={runAction}
          />
        ))}
      </div>
    </PageShell>
  )
}

function DiscoveryColumn({
  column,
  editionIds,
  scopeKey,
  busy,
  onAction,
}: {
  column: (typeof COLUMNS)[number]
  editionIds: string[] | undefined
  scopeKey: string
  busy: boolean
  onAction: (type: CardAction, post: Post) => void
}) {
  const postState = usePostLinkState()
  const [size, setSize] = useState(PAGE_STEP)
  const [collapsed, setCollapsed] = useState(false)
  const narrow = useNarrowLayout()
  const isCollapsed = narrow && collapsed
  const query = useQuery({
    queryKey: ['posts', 'admin-discovery', column.key, scopeKey, size],
    queryFn: () =>
      listPosts({ ...column.params, created_by: 'ai_discovery', edition_id: editionIds, page: 1, size }),
    placeholderData: (previous) => previous,
  })
  const items = query.data?.items ?? []
  const total = query.data?.total
  const hasMore = total != null && total > items.length
  const bodyId = `discovery-col-${column.key}`

  return (
    <section className={`discovery-col ${isCollapsed ? 'is-collapsed' : ''}`} aria-labelledby={`${bodyId}-title`}>
      {narrow ? (
        <button
          type="button"
          className="discovery-col-head is-toggle"
          aria-expanded={!collapsed}
          aria-controls={bodyId}
          onClick={() => setCollapsed((value) => !value)}
        >
          <span id={`${bodyId}-title`} className="discovery-col-title">{column.label}</span>
          <span className="discovery-col-count">{total ?? '–'}</span>
        </button>
      ) : (
        <div className="discovery-col-head">
          <h2 id={`${bodyId}-title`} className="discovery-col-title">{column.label}</h2>
          <span className="discovery-col-count">{total ?? '–'}</span>
        </div>
      )}
      <div id={bodyId} className="discovery-col-body" hidden={isCollapsed}>
        {query.isLoading && (
          <div className="discovery-skeleton" aria-label="불러오는 중">
            <span />
            <span />
            <span />
          </div>
        )}
        {query.isError && (
          <div className="discovery-col-error" role="alert">
            <span>후보를 불러오지 못했습니다.</span>
            <Btn size="sm" variant="outline" onClick={() => void query.refetch()}>
              다시 시도
            </Btn>
          </div>
        )}
        {query.isSuccess && items.length === 0 && <p className="discovery-col-empty">이 상태의 후보가 없습니다</p>}
        {items.map((post) => (
          <article key={post.id} className="discovery-card">
            <Link to={`/posts/${post.id}`} state={postState} className="discovery-card-title">
              {post.title}
            </Link>
            <div className="discovery-card-meta">
              {post.source_name ?? '출처 없음'} · {relativeCrawl(post.collected_at)}
            </div>
            {post.latest_ai?.summary && <p className="discovery-card-summary">{post.latest_ai.summary}</p>}
            {post.can_edit === true && (
              <div className="discovery-card-actions">
                {column.actions.map((type) => (
                  <Btn
                    key={type}
                    size="sm"
                    variant={type === 'hide' ? 'ghost' : type === 'promote' ? 'primary' : 'outline'}
                    disabled={busy}
                    onClick={() => onAction(type, post)}
                  >
                    {ACTION_LABELS[type]}
                  </Btn>
                ))}
                {/* #119: delete is a visible button only in 숨김; elsewhere it sits in the ⋯ menu. */}
                {column.key === 'hidden' ? (
                  <Btn size="sm" variant="danger" disabled={busy} onClick={() => onAction('delete', post)}>
                    {ACTION_LABELS.delete}
                  </Btn>
                ) : (
                  <OverflowMenu
                    label={`${post.title} 메뉴`}
                    items={[{ key: 'delete', label: '삭제', danger: true, disabled: busy, onClick: () => onAction('delete', post) }]}
                  />
                )}
              </div>
            )}
          </article>
        ))}
        {hasMore && size < MAX_SIZE && (
          <Btn
            size="sm"
            variant="ghost"
            className="discovery-col-more"
            disabled={query.isFetching}
            onClick={() => setSize((value) => Math.min(value + PAGE_STEP, MAX_SIZE))}
          >
            더 보기
          </Btn>
        )}
        {hasMore && size >= MAX_SIZE && (
          <p className="discovery-col-empty">
            <Link to="/news">뉴스 화면에서 더 보기</Link>
          </p>
        )}
      </div>
    </section>
  )
}
