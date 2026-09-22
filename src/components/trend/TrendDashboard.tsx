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

  return (
    <section className="trend-dashboard" aria-labelledby="trend-title">
      <header className="trend-hero">
        <div>
          <span className="trend-kicker">주제 · TREND</span>
          <h1 id="trend-title">{edition.name}</h1>
          <p>주제에 연결된 소스에서 포착한 변화와 새 신호를 한눈에 봅니다.</p>
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

      <div className="trend-grid">
        <section className="trend-widget trend-volume">
          <div className="trend-widget-head">
            <div><span className="trend-widget-number">WIDGET 01</span><h2>언급량 추이</h2></div>
            <div className="trend-widget-total"><strong>{data.post_count.toLocaleString()}</strong><span>전체 언급 · {range}일</span></div>
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

        <section className="trend-widget trend-ranking">
          <div className="trend-widget-head"><div><span className="trend-widget-number">WIDGET 02</span><h2>랭킹</h2></div><span>언급 키워드</span></div>
          {!data.ranking.length ? <p className="trend-empty">선택 기간에 랭킹 정보가 없습니다.</p> : (
            <ol>
              {data.ranking.map((item) => (
                <li key={`${item.rank}-${item.name}`}>
                  <span className="trend-rank">{String(item.rank).padStart(2, '0')}</span>
                  <div className="trend-rank-main">
                    <div><strong>{item.name}</strong>{item.is_new && <span className="trend-new">NEW</span>}<span>{item.mention_count}건</span><Delta value={item.change_percent} /></div>
                    <i><span style={{ width: `${item.mention_count / maxRank * 100}%` }} /></i>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="trend-widget trend-new-info">
          <div className="trend-widget-head"><div><span className="trend-widget-number">WIDGET 03</span><h2>신규 정보</h2></div><span>처음 등장한 신호</span></div>
          {!data.new_items.length ? <p className="trend-empty">선택 기간에 처음 등장한 정보가 없습니다.</p> : (
            <div className="trend-new-list">
              {data.new_items.map((item) => (
                <article key={`${item.name}-${item.first_seen_at}`}>
                  <div>첫 등장 {new Date(item.first_seen_at).toLocaleDateString('ko-KR')} · 소스 {item.source_count}곳 · 언급 {item.mention_count}건</div>
                  <h3>{item.headline}</h3>
                  <p>{item.description || item.name}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  )
}
