import { Link } from 'react-router-dom'
import type { IssueChangeItem } from '../../types/issue'
import { formatDateTime } from '../../utils/date'

export function ChangesBand({ items }: { items: IssueChangeItem[] }) {
  if (items.length === 0) return null

  return (
    <section className="card card-pad" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <strong style={{ fontSize: 14 }}>지난 확인 이후 움직인 사건 {items.length}</strong>
        <Link to="/issues?filter=changed" className="np-read-more">
          모두 보기 →
        </Link>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {items.map((item) => (
          <Link
            key={item.id}
            to={`/issues/${item.id}#timeline`}
            className="card card-pad"
            style={{ flex: '1 1 220px', minWidth: 200, textDecoration: 'none', color: 'inherit' }}
          >
            <div style={{ fontWeight: 600, marginBottom: 6 }}>{item.title}</div>
            <div style={{ fontSize: 12, color: 'var(--ink3, #999)' }}>
              새 변화 {item.new_revision_count}건 · 새 기사 {item.new_member_count}건
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink3, #999)' }}>
              {formatDateTime(item.last_activity_at)}
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
