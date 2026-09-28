import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { downloadEditionTrendCsv, getEditionTrend } from '../../api/editionApi'
import type { Edition } from '../../types/edition'
import type { TrendCategoryShare } from '../../types/trend'
import { apiErrorDetail } from '../../utils/apiError'
import { Btn } from '../common/Btn'
import { useToast } from '../common/Toast'

const RANGES = [7, 30, 90] as const

function Delta({ value }: { value: number | null }) {
  if (value == null) return <span className="trend-delta is-new">신규</span>
  const className = value > 0 ? 'is-up' : value < 0 ? 'is-down' : 'is-flat'
  return <span className={`trend-delta ${className}`}>{value > 0 ? '+' : ''}{value.toFixed(1)}%</span>
}

function CategoryLegend({ items }: { items: TrendCategoryShare[] }) {
  if (!items.length) return <p className="trend-empty">선택 기간에 카테고리 집계가 없습니다.</p>
  return (
    <div className="trend-category-list">
      {items.map((item) => (
        <div className="trend-category-row" key={item.name}>
          <span className="trend-category-swatch" aria-hidden />
          <span className="trend-category-name">{item.name}</span>
          <strong>{item.share_percent.toFixed(1)}%</strong>
          <Delta value={item.change_percent} />
        </div>
      ))}
    </div>
  )
}

export function TrendDashboard({ edition }: { edition: Edition }) {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const requested = Number(params.get('range'))
  const range = (RANGES.includes(requested as 7 | 30 | 90) ? requested : 7) as 7 | 30 | 90
  const query = useQuery({
    queryKey: ['edition-trend', edition.id, range],
    queryFn: () => getEditionTrend(edition.id, range),
  })

  const setRange = (nextRange: 7 | 30 | 90) => {
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

  if (query.isLoading) {
    return <div className="trend-dashboard trend-loading" aria-label="트렌드 데이터 불러오는 중"><div /><div /><div /></div>
  }
  if (query.isError || !query.data) {
    return (
      <div className="trend-error">
        <strong>트렌드 데이터를 불러오지 못했습니다.</strong>
        <p>{apiErrorDetail(query.error) ?? '잠시 뒤 다시 시도해 주세요.'}</p>
        <Btn variant="outline" size="sm" onClick={() => void query.refetch()}>다시 시도</Btn>
      </div>
    )
  }

  const data = query.data
  const maxDaily = Math.max(1, ...data.mention_volume.daily.map((item) => item.post_count))
  const maxRank = Math.max(1, ...data.ranking.map((item) => item.mention_count))
  const leader = data.ranking[0]
  const risingCount = data.ranking.filter((item) => item.is_new || (item.change_percent ?? 0) > 0).length
  const peakDay = data.mention_volume.daily.reduce(
    (peak, item) => item.post_count > peak.post_count ? item : peak,
    data.mention_volume.daily[0] ?? { date: '', post_count: 0 },
  )

  return (
    <section className="trend-dashboard" aria-labelledby="trend-title">
      <header className="trend-hero">
        <div>
          <span className="trend-kicker">주제 · TREND</span>
          <h1 id="trend-title">{edition.name}</h1>
          <p>지금 가장 많이 이야기되는 기술과 새로 떠오른 개발 신호를 빠르게 확인합니다.</p>
        </div>
        <div className="trend-controls">
          <div className="trend-range" aria-label="집계 기간">
            {RANGES.map((item) => (
              <button key={item} type="button" className={range === item ? 'is-active' : ''} onClick={() => setRange(item)}>{item}일</button>
            ))}
          </div>
          <Btn variant="outline" size="sm" onClick={() => void download()}>CSV 내보내기</Btn>
        </div>
      </header>

      <div className="trend-meta">
        <span>집계 기준 <strong>중복 제거 포스트 수</strong></span>
        <span>집계 주기 <strong>{data.refresh_interval}</strong></span>
        <span>최근 갱신 <strong>{new Date(data.generated_at).toLocaleString('ko-KR')}</strong></span>
        <span>소스 <strong>{data.source_count.toLocaleString()}곳</strong></span>
        <span>수집 <strong>{data.post_count.toLocaleString()}건</strong></span>
      </div>

      <section className="trend-signal-strip" aria-label="핵심 트렌드 요약">
        <article className="trend-signal-card trend-signal-card-leader">
          <span className="trend-signal-label">지금 가장 뜨는 기술</span>
          {leader ? (
            <>
              <strong>{leader.name}</strong>
              <div><b>{leader.mention_count}건 언급</b><Delta value={leader.change_percent} /></div>
            </>
          ) : <strong className="trend-signal-empty">아직 집계 전</strong>}
        </article>
        <article className="trend-signal-card">
          <span className="trend-signal-label">새로 등장한 신호</span>
          <strong>{data.new_items.length}<small>개</small></strong>
          <p>{data.new_items[0]?.name ?? '선택 기간에 신규 신호 없음'}</p>
        </article>
        <article className="trend-signal-card">
          <span className="trend-signal-label">상승 중인 키워드</span>
          <strong>{risingCount}<small>개</small></strong>
          <p>{risingCount ? '신규 또는 이전 기간보다 언급 증가' : '뚜렷한 상승 신호 없음'}</p>
        </article>
        <article className="trend-signal-card">
          <span className="trend-signal-label">{range}일 전체 언급</span>
          <strong>{data.post_count.toLocaleString()}<small>건</small></strong>
          <p>{peakDay.post_count ? `${peakDay.date.slice(5).replace('-', '.')}에 ${peakDay.post_count}건으로 최고` : '수집된 정보 없음'}</p>
        </article>
      </section>

      <div className="trend-focus-grid">
        <section className="trend-widget trend-ranking trend-ranking-focus">
          <div className="trend-widget-head">
            <div><span className="trend-widget-number">MOST TALKED ABOUT</span><h2>가장 많이 언급된 기술</h2></div>
            <span>{range}일 기준</span>
          </div>
          {!data.ranking.length ? <p className="trend-empty">반복해서 관측된 트렌드가 아직 없습니다.</p> : (
            <ol>
              {data.ranking.map((item, index) => (
                <li key={`${item.rank}-${item.name}`} className={index < 3 ? 'is-top' : ''}>
                  <span className="trend-rank">{String(item.rank).padStart(2, '0')}</span>
                  <div className="trend-rank-main">
                    <div>
                      <strong>{item.name}</strong>
                      {item.is_new && <span className="trend-new">NEW</span>}
                      <span className="trend-rank-count">{item.mention_count}건</span>
                      <Delta value={item.change_percent} />
                    </div>
                    <i><span style={{ width: `${item.mention_count / maxRank * 100}%` }} /></i>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="trend-widget trend-new-info trend-new-focus">
          <div className="trend-widget-head">
            <div><span className="trend-widget-number">JUST EMERGED</span><h2>새로 등장한 기술</h2></div>
            <span>{data.new_items.length}개 신호</span>
          </div>
          {!data.new_items.length ? <p className="trend-empty">선택 기간에 새로 등장한 기술이 없습니다.</p> : (
            <div className="trend-new-list">
              {data.new_items.slice(0, 6).map((item, index) => (
                <article key={`${item.name}-${item.first_seen_at}`}>
                  <div className="trend-new-card-top"><span>NEW {String(index + 1).padStart(2, '0')}</span><time>{new Date(item.first_seen_at).toLocaleDateString('ko-KR')}</time></div>
                  <h3>{item.name}</h3>
                  <p>{item.headline}</p>
                  <footer>언급 {item.mention_count}건 · 소스 {item.source_count}곳</footer>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="trend-widget trend-volume trend-volume-secondary">
          <div className="trend-widget-head">
            <div><span className="trend-widget-number">ACTIVITY OVER TIME</span><h2>언급 흐름과 분야</h2></div>
            <div className="trend-widget-total"><strong>{data.post_count.toLocaleString()}</strong><span>{range}일 누적</span></div>
          </div>
          {data.post_count === 0 ? <p className="trend-empty">선택 기간에 집계된 정보가 없습니다.</p> : (
            <div className="trend-volume-body">
              <div className="trend-bars" aria-label="일별 포스트 수">
                {data.mention_volume.daily.map((point) => (
                  <div className="trend-bar-column" key={point.date} title={`${point.date} ${point.post_count}건`}>
                    <span>{point.post_count || ''}</span>
                    <i style={{ height: `${Math.max(2, point.post_count / maxDaily * 100)}%` }} />
                    <small>{point.date.slice(5)}</small>
                  </div>
                ))}
              </div>
              <CategoryLegend items={data.mention_volume.categories} />
            </div>
          )}
      </section>
    </section>
  )
}
