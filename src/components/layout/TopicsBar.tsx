import { useQuery } from '@tanstack/react-query'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { listEditions } from '../../api/editionApi'
import { usePermissions } from '../../hooks/usePermissions'

export function TopicsBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const { canEditAny } = usePermissions()
  const { data: editions = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['editions', 'active'],
    queryFn: () => listEditions(true),
  })
  const selected = params.get('edition') ?? editions[0]?.slug

  if (location.pathname.startsWith('/posts/')) return null

  const choose = (slug: string) => {
    const next = new URLSearchParams(location.pathname === '/' ? params : undefined)
    next.set('edition', slug)
    if (!['7', '30', '90'].includes(next.get('range') ?? '')) next.delete('range')
    navigate({ pathname: '/', search: next.toString() })
  }

  return (
    <div className="topics-bar" aria-label="주제 전환">
      <div className="topics-bar-inner">
        <span className="topics-label">TOPICS</span>
        <div className="topics-list">
          {isLoading && <span className="topics-loading" aria-label="주제 불러오는 중" />}
          {isError && (
            <button type="button" className="topics-retry" onClick={() => void refetch()}>
              주제를 다시 불러오기
            </button>
          )}
          {editions.map((edition) => (
            <button
              type="button"
              key={edition.id}
              className={`topic-choice${selected === edition.slug ? ' is-active' : ''}`}
              onClick={() => choose(edition.slug)}
              aria-current={selected === edition.slug ? 'page' : undefined}
            >
              <span>{edition.name}</span>
              <span className={`topic-mode topic-mode-${edition.display_mode}`}>
                {edition.display_mode === 'trend' ? '트렌드형' : '뉴스형'}
              </span>
              <span className="topic-source-count" aria-label={`소스 ${edition.tagged_source_count}개`}>
                {edition.tagged_source_count}
              </span>
            </button>
          ))}
        </div>
        {canEditAny && (
          <Link className="topics-manage" to="/admin/settings#editions">
            주제 관리 →
          </Link>
        )}
      </div>
    </div>
  )
}
