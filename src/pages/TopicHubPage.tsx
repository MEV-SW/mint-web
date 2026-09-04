import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { getTopicHub } from '../api/personalizationApi'
import { NewsListRow } from '../components/news/NewsListRow'
import { PageShell } from '../components/layout/PageShell'
import { apiErrorDetail } from '../utils/apiError'

export function TopicHubPage() {
  const { keywordId = '' } = useParams()

  const hubQuery = useQuery({
    queryKey: ['topic-hub', keywordId],
    queryFn: () => getTopicHub(keywordId),
    enabled: Boolean(keywordId),
    retry: false,
  })

  if (hubQuery.isError) {
    return (
      <PageShell section="토픽" title="토픽 허브" lead="키워드별 소식을 모읍니다.">
        <div className="personal-empty">
          <p>{apiErrorDetail(hubQuery.error) ?? '토픽을 불러오지 못했습니다.'}</p>
          <Link to="/news" className="np-read-more">
            뉴스로 돌아가기 →
          </Link>
        </div>
      </PageShell>
    )
  }

  const hub = hubQuery.data
  const title = hub?.keyword.name ?? '토픽'

  return (
    <PageShell
      section="토픽"
      title={title}
      lead={
        hub?.category_name
          ? `${hub.category_name} 분야의 키워드 허브입니다. 직접 매칭이 적을 때는 같은 분야 관련 소식을 함께 보여줍니다.`
          : '키워드에 직접 연결된 뉴스와 관련 소식을 모읍니다.'
      }
    >
      {hubQuery.isLoading && <p className="personal-empty">불러오는 중…</p>}

      {hub && (
        <>
          {hub.sibling_keywords.length > 0 && (
            <div className="personal-keywords" style={{ marginBottom: 20 }}>
              {hub.sibling_keywords.map((keyword) => (
                <Link key={keyword.id} to={`/topics/${keyword.id}`}>
                  <span>{keyword.name}</span>
                </Link>
              ))}
            </div>
          )}

          <section className="personal-news-list">
            <header>
              <h2>이 키워드 뉴스</h2>
              <span>{hub.exact_count}건</span>
            </header>
            {hub.exact_posts.length > 0 ? (
              hub.exact_posts.map((post) => <NewsListRow key={post.id} post={post} />)
            ) : (
              <div className="personal-empty personal-empty-inline">
                아직 이 키워드로 직접 연결된 기사가 없습니다.
                {hub.category_name
                  ? ` 아래 같은 분야(${hub.category_name}) 관련 소식을 확인해 보세요.`
                  : ''}
              </div>
            )}
          </section>

          {(hub.exact_is_sparse || hub.related_posts.length > 0) && (
            <section className="personal-news-list" style={{ marginTop: 32 }}>
              <header>
                <h2>같은 분야 관련 소식</h2>
                <span>{hub.related_posts.length}건</span>
              </header>
              {hub.exact_is_sparse && (
                <p className="personal-empty personal-empty-inline" style={{ marginBottom: 12 }}>
                  직접 매칭이 적어 같은 분야의 최근·중요 소식을 함께 보여줍니다.
                </p>
              )}
              {hub.related_posts.length > 0 ? (
                hub.related_posts.map((post) => <NewsListRow key={post.id} post={post} />)
              ) : (
                <div className="personal-empty personal-empty-inline">관련 소식이 아직 없습니다.</div>
              )}
            </section>
          )}
        </>
      )}
    </PageShell>
  )
}
