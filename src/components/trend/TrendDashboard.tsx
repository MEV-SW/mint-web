import { useQuery } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { downloadEditionTrendCsv, getEditionTrend } from '../../api/editionApi'
import type { Edition } from '../../types/edition'
import type {
  TrendCategoryShare,
  TrendEntityType,
  TrendNewItem,
  TrendRankingItem,
  TrendRead,
  TrendReleaseItem,
} from '../../types/trend'
import { apiErrorDetail } from '../../utils/apiError'
import { useToast } from '../common/Toast'

// mint-web#146 트렌드 A안(출시 원장): 새로 나온 버전 · 지금 뜨는 것 · 처음 등장 · 사용 관행 · 언급 흐름.
const RANGES = [7, 30, 90] as const
type Range = (typeof RANGES)[number]
const SKELETON_DELAY_MS = 300
const MOBILE_RELEASES = 3
const MOBILE_RANKING = 5

const ENTITY_LABELS: Record<TrendEntityType, string> = {
  model: '모델',
  product: '제품',
  tool: '도구',
  feature: '기능',
  practice: '관행',
}

const KST_DATE = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit' })
const KST_TIME = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Seoul',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function kstDate(iso: string): string {
  return KST_DATE.format(new Date(iso)).replace('-', '.')
}

function kstTime(iso: string): string {
  return KST_TIME.format(new Date(iso))
}

function generatedLabel(iso: string): string {
  const date = new Date(iso)
  const time = date.toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: 'numeric', minute: '2-digit' })
  return `${kstDate(iso)} ${time}`
}

/** "OpenAI · 도구" — family and entity type, each skipped when missing. */
function kindLabel(family?: string | null, type?: TrendEntityType | null): string {
  return [family, type ? ENTITY_LABELS[type] : null].filter(Boolean).join(' · ')
}

/** Skeleton only when loading lasts 300ms or more (관리 R5-13). */
function useDelayedFlag(active: boolean, delayMs: number): boolean {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    if (!active) return
    const timer = window.setTimeout(() => setShown(true), delayMs)
    return () => {
      window.clearTimeout(timer)
      setShown(false)
    }
  }, [active, delayMs])
  return active && shown
}

function SectionHead({
  id,
  kicker,
  tone,
  title,
  aside,
}: {
  id: string
  kicker: string
  tone: 'red' | 'pine' | 'amber' | 'ink'
  title: string
  aside?: ReactNode
}) {
  return (
    <header className="tl-section-head">
      <div>
        <span className={`tl-kicker is-${tone}`}>{kicker}</span>
        <h2 id={id}>{title}</h2>
      </div>
      {aside != null && <span className="tl-section-aside">{aside}</span>}
    </header>
  )
}

/** Long label on desktop, short one on phones (<768). */
function Responsive({ long, short }: { long: string; short: string }) {
  return (
    <>
      <span className="tl-long">{long}</span>
      <span className="tl-short">{short}</span>
    </>
  )
}

function Delta({ value }: { value: number | null }) {
  if (value == null) return null
  const rounded = Math.round(Math.abs(value))
  if (rounded === 0) {
    return (
      <span className="tl-delta is-flat" aria-label="지난 기간과 같음">
        — 0%
      </span>
    )
  }
  const up = value > 0
  return (
    <span className={`tl-delta ${up ? 'is-up' : 'is-down'}`} aria-label={`지난 기간 대비 ${rounded}% ${up ? '증가' : '감소'}`}>
      {up ? '▲' : '▼'} {rounded}%
    </span>
  )
}

function ReleaseRow({ item, extra }: { item: TrendReleaseItem; extra: boolean }) {
  const url = item.representative_post?.url
  const kind = kindLabel(item.family, item.entity_type)
  return (
    <li className={`tl-release${item.summary ? '' : ' is-compact'}${extra ? ' is-extra' : ''}`}>
      <div className="tl-release-when">
        <span className="tl-release-date">{kstDate(item.last_released_at)}</span>
        <span className="tl-release-time">{kstTime(item.last_released_at)}</span>
      </div>
      <div className="tl-release-main">
        <div className="tl-release-name">
          {url ? (
            <a href={url} target="_blank" rel="noreferrer">
              {item.name}
            </a>
          ) : (
            <span>{item.name}</span>
          )}
          {kind && <small>{kind}</small>}
        </div>
        <div className="tl-release-chips">
          <span className="tl-version" aria-label={`최신 버전 ${item.latest_version}`} title={item.versions?.join(', ')}>
            {item.latest_version}
          </span>
          <span className="tl-version-count">버전 {item.version_count}개</span>
          {item.is_new_version && <span className="tl-tag is-new">새 버전</span>}
          {item.is_prerelease && <span className="tl-tag is-pre">사전 출시</span>}
          <span className={`tl-tag ${item.official ? 'is-official' : 'is-community'}`}>
            {item.official ? '공식' : '커뮤니티 소식'}
          </span>
        </div>
        {item.summary && <p className="tl-release-summary">{item.summary}</p>}
      </div>
      <div className="tl-release-side">
        {item.source_name && <span className="tl-release-source">{item.source_name}</span>}
        <span>기사 {item.post_count}건</span>
      </div>
    </li>
  )
}

function Releases({ data, range, onWiden }: { data: TrendRead; range: Range; onWiden: (next: Range) => void }) {
  const releases = data.releases ?? []
  const [expanded, setExpanded] = useState(false)
  const widen: Range | null = range === 7 ? 30 : range === 30 ? 90 : null
  return (
    <section className="tl-section tl-releases" aria-labelledby="tl-releases-title">
      <SectionHead
        id="tl-releases-title"
        kicker="RELEASES"
        tone="red"
        title="새로 나온 버전"
        aside={
          releases.length ? (
            <Responsive long={`${range}일 · 출시 묶음 ${releases.length}`} short={`출시 ${releases.length}`} />
          ) : (
            `${range}일 · 출시 없음`
          )
        }
      />
      {releases.length === 0 ? (
        <div className="tl-empty-box">
          <strong>이 기간에 새로 나온 버전이 없습니다.</strong>
          <p>공식 릴리즈 피드와 신뢰 출처에서 출시 소식이 들어오면 날짜순으로 쌓입니다.</p>
          {widen && (
            <button type="button" className="tl-widen" onClick={() => onWiden(widen)}>
              {widen}일로 넓혀 보기 →
            </button>
          )}
        </div>
      ) : (
        <>
          <ol className={`tl-release-list${expanded ? ' is-expanded' : ''}`}>
            {releases.map((item, index) => (
              <ReleaseRow
                key={`${item.name}-${item.source_name ?? ''}-${item.latest_version}`}
                item={item}
                extra={index >= MOBILE_RELEASES}
              />
            ))}
          </ol>
          {!expanded && releases.length > MOBILE_RELEASES && (
            <button type="button" className="tl-more" onClick={() => setExpanded(true)}>
              출시 {releases.length - MOBILE_RELEASES}개 더 보기
            </button>
          )}
          <p className="tl-note">날짜 = 마지막 출시(보도 시각, 없으면 수집 시각) · 최대 10묶음</p>
        </>
      )}
    </section>
  )
}

function RankingRow({ item, max, extra }: { item: TrendRankingItem; max: number; extra: boolean }) {
  const url = item.representative_posts[0]?.url
  const kind = kindLabel(item.family, item.entity_type)
  const posts = item.post_count ?? item.mention_count
  const sources = item.source_count ?? 0
  return (
    <li className={`tl-rank${extra ? ' is-extra' : ''}`}>
      <span className="tl-rank-no">{String(item.rank).padStart(2, '0')}</span>
      <div className="tl-rank-main">
        <div className="tl-rank-name">
          {url ? (
            <a href={url} target="_blank" rel="noreferrer" title={item.highlight ?? undefined}>
              {item.name}
            </a>
          ) : (
            <span title={item.highlight ?? undefined}>{item.name}</span>
          )}
          <span className="tl-rank-badges">
            {item.is_new && <span className="tl-tag is-new">신규</span>}
            {item.has_release && item.latest_version && (
              <span className="tl-tag is-release">출시 {item.latest_version}</span>
            )}
          </span>
        </div>
        <span className="tl-rank-sub">
          {kind && <>{kind} · </>}기사 {posts} · 출처 {sources}
        </span>
        <i className="tl-rank-bar" aria-hidden>
          <span style={{ width: `${(posts / max) * 100}%` }} />
        </i>
      </div>
      <Delta value={item.change_percent} />
    </li>
  )
}

function Ranking({ data }: { data: TrendRead }) {
  const [expanded, setExpanded] = useState(false)
  const items = data.ranking
  const max = Math.max(1, ...items.map((item) => item.post_count ?? item.mention_count))
  return (
    <section className="tl-section tl-ranking" aria-labelledby="tl-ranking-title">
      <SectionHead
        id="tl-ranking-title"
        kicker="NOW"
        tone="pine"
        title="지금 뜨는 것"
        aside={<Responsive long={`${items.length}개 · 기사·출처 기준`} short={`${items.length}개`} />}
      />
      {items.length === 0 ? (
        <p className="tl-empty">반복해서 관측된 항목이 아직 없습니다.</p>
      ) : (
        <>
          <ol className={`tl-rank-list${expanded ? ' is-expanded' : ''}`}>
            {items.map((item, index) => (
              <RankingRow key={`${item.rank}-${item.name}`} item={item} max={max} extra={index >= MOBILE_RANKING} />
            ))}
          </ol>
          {!expanded && items.length > MOBILE_RANKING && (
            <button type="button" className="tl-more" onClick={() => setExpanded(true)}>
              순위 {items.length - MOBILE_RANKING}개 더 보기
            </button>
          )}
          {items.length < 10 && <p className="tl-note">기사 2건 이상 반복된 항목만 순위에 올라옵니다.</p>}
        </>
      )}
    </section>
  )
}

function FirstSeen({ items }: { items: TrendNewItem[] }) {
  return (
    <section className="tl-section tl-first" aria-labelledby="tl-first-title">
      <SectionHead id="tl-first-title" kicker="FIRST SEEN" tone="pine" title="처음 등장" aside={`${items.length}개`} />
      {items.length === 0 ? (
        <p className="tl-empty">이 기간에 처음 등장한 항목이 없습니다.</p>
      ) : (
        <ul className="tl-first-list">
          {items.map((item) => {
            const kind = kindLabel(item.family, item.entity_type)
            return (
              <li key={`${item.name}-${item.first_seen_at}`}>
                <span className="tl-first-date">{kstDate(item.first_seen_at)}</span>
                <div>
                  <strong>{item.name}</strong>
                  <span className="tl-first-meta">
                    {kind && <>{kind} · </>}출처 {item.source_count}곳
                  </span>
                  {item.headline && <p>{item.headline}</p>}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function Practice({ items }: { items: TrendRankingItem[] }) {
  const practices = items.filter((item) => item.entity_type === 'practice')
  return (
    <section className="tl-section tl-practice" aria-labelledby="tl-practice-title">
      <SectionHead id="tl-practice-title" kicker="PRACTICE" tone="amber" title="사용 관행" aside="준비 중" />
      <div className="tl-practice-box">
        <p>개발자들이 실제로 어떻게 쓰는지가 여기에 쌓입니다. 4단계 SNS 소스가 연결되면 채워집니다.</p>
        {practices.length === 0 ? (
          <p className="tl-practice-empty">지금 표시할 관행 항목이 없습니다.</p>
        ) : (
          <ul>
            {practices.map((item) => (
              <li key={item.name}>
                {item.name} — 기사 {item.post_count ?? item.mention_count} · 출처 {item.source_count ?? 0}
                {item.is_new ? ' · 신규' : ''}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function CategoryList({ items }: { items: TrendCategoryShare[] }) {
  if (!items.length) return <p className="tl-empty">선택 기간에 카테고리 집계가 없습니다.</p>
  return (
    <ul className="tl-category-list">
      {items.map((item) => (
        <li key={item.name}>
          <span className="tl-category-swatch" aria-hidden />
          <span>{item.name}</span>
          <strong>{Math.round(item.share_percent)}%</strong>
        </li>
      ))}
    </ul>
  )
}

function Activity({ data, range }: { data: TrendRead; range: Range }) {
  const maxDaily = Math.max(1, ...data.mention_volume.daily.map((item) => item.post_count))
  return (
    <section className="tl-section tl-activity" aria-labelledby="tl-activity-title">
      <SectionHead
        id="tl-activity-title"
        kicker="ACTIVITY"
        tone="ink"
        title="언급 흐름과 분야"
        aside={`${range}일 누적 기사 ${data.post_count.toLocaleString()}`}
      />
      {data.post_count === 0 ? (
        <p className="tl-empty">선택 기간에 집계된 정보가 없습니다.</p>
      ) : (
        <div className="tl-activity-body">
          <ul className="sr-only" aria-label="일별 기사 수">
            {data.mention_volume.daily.map((point) => (
              <li key={point.date}>
                {point.date} 기사 {point.post_count}건
              </li>
            ))}
          </ul>
          <div className="tl-bars" aria-hidden>
            {data.mention_volume.daily.map((point) => (
              <div className="tl-bar" key={point.date} title={`${point.date} ${point.post_count}건`}>
                <i style={{ height: `${Math.max(2, (point.post_count / maxDaily) * 100)}%` }} />
                <small>{point.date.slice(5).replace('-', '.')}</small>
              </div>
            ))}
          </div>
          <CategoryList items={data.mention_volume.categories} />
        </div>
      )}
    </section>
  )
}

function Skeleton() {
  return (
    <div className="tl-grid tl-skeleton-grid" aria-hidden>
      <div className="tl-col">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className="tl-skeleton is-tall" />
        ))}
      </div>
      <div className="tl-col">
        {Array.from({ length: 8 }, (_, i) => (
          <span key={i} className="tl-skeleton" />
        ))}
      </div>
    </div>
  )
}

export function TrendDashboard({ edition }: { edition: Edition }) {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const requested = Number(params.get('range'))
  const range = (RANGES.includes(requested as Range) ? requested : 7) as Range
  const query = useQuery({
    queryKey: ['edition-trend', edition.id, range],
    queryFn: () => getEditionTrend(edition.id, range),
  })
  const showSkeleton = useDelayedFlag(query.isLoading, SKELETON_DELAY_MS)
  const failed = query.isError || (!query.isLoading && !query.data)

  const setRange = (nextRange: Range) => {
    const next = new URLSearchParams(params)
    next.set('range', String(nextRange))
    setParams(next, { replace: true })
  }

  const download = async () => {
    try {
      await downloadEditionTrendCsv(edition.id, range, edition.slug)
    } catch (error) {
      toast(apiErrorDetail(error) ?? 'CSV 내보내기에 실패했습니다.', 'err')
    }
  }

  const data = query.data
  return (
    <section className="trend-ledger" aria-labelledby="tl-title" aria-busy={query.isLoading || undefined}>
      <header className="tl-hero">
        <div>
          <span className="tl-kicker is-pine">주제 · TREND</span>
          <h1 id="tl-title">{edition.name}</h1>
          <p>{edition.name}에서 지금 뜨는 모델·도구와 새로 나온 버전을 한눈에 봅니다.</p>
        </div>
        <div className="tl-controls">
          <div className="tl-range" role="group" aria-label="집계 기간">
            {RANGES.map((item) => (
              <button key={item} type="button" aria-pressed={range === item} onClick={() => setRange(item)}>
                {item}일
              </button>
            ))}
          </div>
          <button type="button" className="tl-csv" disabled={failed} onClick={() => void download()}>
            CSV 내보내기
          </button>
        </div>
      </header>

      {!failed && (
        <p className="tl-meta">
          {data ? (
            <>
              최근 갱신 {generatedLabel(data.generated_at)} ·{' '}
              {data.refresh_interval === '1h' ? '1시간마다' : data.refresh_interval} · 출처{' '}
              {data.source_count.toLocaleString()}곳 · 기사 {data.post_count.toLocaleString()}건
              <span className="tl-meta-basis"> (출처·날짜 중복 제거)</span>
            </>
          ) : (
            '불러오는 중…'
          )}
        </p>
      )}

      {failed ? (
        <div className="tl-error" role="alert">
          <div>
            <strong>트렌드 데이터를 불러오지 못했습니다.</strong>
            <p>
              잠시 뒤 다시 시도해 주세요. 기간을 바꿔 다시 불러올 수도 있습니다.
              {apiErrorDetail(query.error) ? ` (${apiErrorDetail(query.error)})` : ''}
            </p>
          </div>
          <button type="button" className="tl-retry" onClick={() => void query.refetch()}>
            다시 시도
          </button>
        </div>
      ) : !data ? (
        showSkeleton ? <Skeleton /> : null
      ) : (
        <>
          <div className="tl-grid">
            <div className="tl-col tl-col-main">
              {/* Keyed by range so the mobile "더 보기" expansion starts collapsed for every range. */}
              <Releases key={`releases-${range}`} data={data} range={range} onWiden={setRange} />
              <FirstSeen items={data.new_items} />
            </div>
            <div className="tl-col tl-col-side">
              <Ranking key={`ranking-${range}`} data={data} />
              <Practice items={data.ranking} />
            </div>
          </div>
          <Activity data={data} range={range} />
        </>
      )}
    </section>
  )
}
