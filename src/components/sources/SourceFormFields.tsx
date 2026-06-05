import type { SourceCreate, TrustLevel } from '../../types/source'
import {
  CRAWL_FREQUENCIES,
  SOURCE_CATEGORIES,
  TRUST_SCORE_DEFAULTS,
} from '../../types/source'

const SOURCE_TYPES: { value: SourceCreate['source_type']; label: string }[] = [
  { value: 'rss', label: 'RSS' },
  { value: 'webpage', label: '웹페이지' },
  { value: 'news_page', label: '뉴스 페이지' },
  { value: 'notice_page', label: '공지사항' },
  { value: 'manual', label: '수동 등록' },
]

interface SourceFormFieldsProps {
  form: SourceCreate
  onChange: (next: SourceCreate) => void
}

export function SourceFormFields({ form, onChange }: SourceFormFieldsProps) {
  function setTrust(level: TrustLevel) {
    onChange({
      ...form,
      trust_level: level,
      reliability_score: TRUST_SCORE_DEFAULTS[level],
    })
  }

  return (
    <>
      <div className="field">
        <label>소스명</label>
        <input
          className="input"
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
          placeholder="예: 환경부 보도자료"
        />
      </div>
      <div className="field">
        <label>URL</label>
        <input
          className="input"
          value={form.url}
          onChange={(e) => onChange({ ...form, url: e.target.value })}
          placeholder="https://example.go.kr/rss"
        />
      </div>
      <div className="form-row">
        <div className="field">
          <label>유형</label>
          <select
            className="input"
            value={form.source_type || 'rss'}
            onChange={(e) =>
              onChange({ ...form, source_type: e.target.value as SourceCreate['source_type'] })
            }
          >
            {SOURCE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>카테고리</label>
          <select
            className="input"
            value={form.category || 'general'}
            onChange={(e) => onChange({ ...form, category: e.target.value })}
          >
            {SOURCE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c === 'general' ? '일반' : c}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label>신뢰도</label>
          <select
            className="input"
            value={form.trust_level || 'high'}
            onChange={(e) => setTrust(e.target.value as TrustLevel)}
          >
            <option value="high">높음</option>
            <option value="medium">보통</option>
            <option value="low">낮음</option>
          </select>
        </div>
        <div className="field">
          <label>신뢰도 점수 (0–100)</label>
          <input
            className="input"
            type="number"
            min={0}
            max={100}
            value={form.reliability_score ?? 80}
            onChange={(e) =>
              onChange({ ...form, reliability_score: Number(e.target.value) })
            }
          />
        </div>
      </div>
      <div className="field">
        <label>크롤링 주기</label>
        <select
          className="input"
          value={form.crawl_frequency || 'daily'}
          onChange={(e) => onChange({ ...form, crawl_frequency: e.target.value })}
        >
          {CRAWL_FREQUENCIES.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>
      <label
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          fontSize: 13.5,
          color: 'var(--text)',
          cursor: 'pointer',
          marginTop: 4,
          padding: '12px 14px',
          background: 'var(--surface-2)',
          borderRadius: 'var(--r-md)',
        }}
      >
        <input
          type="checkbox"
          checked={form.auto_publish ?? true}
          onChange={(e) => onChange({ ...form, auto_publish: e.target.checked })}
          style={{ accentColor: 'var(--mint-strong)', width: 17, height: 17, marginTop: 2 }}
        />
        <div>
          <div style={{ fontWeight: 600 }}>자동 게시 (auto-publish)</div>
          <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>
            켜면 수집 즉시 중요 게시판에 게시됩니다. 끄면 검토 대기 상태로 등록됩니다.
          </div>
        </div>
      </label>
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 13.5,
          color: 'var(--text)',
          cursor: 'pointer',
          marginTop: 10,
          padding: '12px 14px',
          background: 'var(--surface-2)',
          borderRadius: 'var(--r-md)',
        }}
      >
        <input
          type="checkbox"
          checked={form.is_active ?? true}
          onChange={(e) => onChange({ ...form, is_active: e.target.checked })}
          style={{ accentColor: 'var(--mint-strong)', width: 17, height: 17 }}
        />
        <div>
          <div style={{ fontWeight: 600 }}>활성 소스</div>
          <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>
            비활성 시 자동·수동 크롤링 대상에서 제외됩니다.
          </div>
        </div>
      </label>
    </>
  )
}
