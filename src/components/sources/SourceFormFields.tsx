import type { SourceCreate, TrustLevel } from '../../types/source'
import {
  COMMUNITY_SOURCE_TYPES,
  CRAWL_FREQUENCIES,
  SOURCE_CATEGORIES,
  TRUST_SCORE_DEFAULTS,
} from '../../types/source'

export type SourceFormMode = 'official' | 'community'

const ALL_SOURCE_TYPES: { value: SourceCreate['source_type']; label: string }[] = [
  { value: 'rss', label: 'RSS' },
  { value: 'webpage', label: '웹페이지' },
  { value: 'news_page', label: '뉴스 페이지' },
  { value: 'notice_page', label: '공지사항' },
  { value: 'manual', label: '수동 등록' },
  { value: 'reddit', label: 'Reddit / 서브레ddit' },
  { value: 'community_forum', label: '커뮤니티 게시판' },
]

const OFFICIAL_SOURCE_TYPES = ALL_SOURCE_TYPES.filter(
  (t): t is (typeof ALL_SOURCE_TYPES)[number] =>
    t.value != null && !COMMUNITY_SOURCE_TYPES.includes(t.value),
)
const COMMUNITY_ONLY_TYPES = ALL_SOURCE_TYPES.filter(
  (t): t is (typeof ALL_SOURCE_TYPES)[number] =>
    t.value != null && COMMUNITY_SOURCE_TYPES.includes(t.value),
)

interface SourceFormFieldsProps {
  mode: SourceFormMode
  form: SourceCreate
  onChange: (next: SourceCreate) => void
  /** 수정 시 유형 변경 잠금 (커뮤니티↔공식 전환 방지) */
  lockSourceType?: boolean
}

export function SourceFormFields({
  mode,
  form,
  onChange,
  lockSourceType = false,
}: SourceFormFieldsProps) {
  const isCommunity = mode === 'community'
  const sourceTypes = isCommunity ? COMMUNITY_ONLY_TYPES : OFFICIAL_SOURCE_TYPES
  const officialCategories = SOURCE_CATEGORIES.filter((c) => c !== '커뮤니티/현장')
  const categories = isCommunity ? (['커뮤니티/현장'] as const) : officialCategories

  function setTrust(level: TrustLevel) {
    if (isCommunity) return
    onChange({
      ...form,
      trust_level: level,
      reliability_score: TRUST_SCORE_DEFAULTS[level],
    })
  }

  function setSourceType(sourceType: SourceCreate['source_type']) {
    if (lockSourceType) return
    if (isCommunity) {
      onChange({
        ...form,
        source_type: sourceType,
        trust_level: 'low',
        reliability_score: TRUST_SCORE_DEFAULTS.low,
        auto_publish: false,
        category: '커뮤니티/현장',
      })
      return
    }
    onChange({ ...form, source_type: sourceType })
  }

  return (
    <>
      {isCommunity ? (
        <p className="source-form-mode-hint source-form-mode-hint-community">
          커뮤니티 소스는 탐문 데스크 전용으로 수집됩니다. 중요 게시판 자동 게시·고신뢰 설정은
          사용할 수 없습니다.
        </p>
      ) : (
        <p className="source-form-mode-hint">
          공식 뉴스·공지·RSS 소스입니다. Reddit·포럼은 커뮤니티 탐문 카드에서 등록하세요.
        </p>
      )}

      <div className="field">
        <label>소스명</label>
        <input
          className="input"
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
          placeholder={
            isCommunity ? '예: Reddit r/electricvehicles' : '예: 환경부 보도자료'
          }
        />
      </div>
      <div className="field">
        <label>URL</label>
        <input
          className="input"
          value={form.url}
          onChange={(e) => onChange({ ...form, url: e.target.value })}
          placeholder={
            isCommunity
              ? 'https://www.reddit.com/r/electricvehicles/'
              : 'https://example.go.kr/rss'
          }
        />
      </div>
      <div className="form-row">
        <div className="field">
          <label>유형</label>
          <select
            className="input"
            value={form.source_type || (isCommunity ? 'reddit' : 'rss')}
            disabled={lockSourceType}
            onChange={(e) =>
              setSourceType(e.target.value as SourceCreate['source_type'])
            }
          >
            {sourceTypes.map((t) => (
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
            value={isCommunity ? '커뮤니티/현장' : form.category || 'general'}
            disabled={isCommunity}
            onChange={(e) => onChange({ ...form, category: e.target.value })}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === 'general' ? '일반' : c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isCommunity ? (
        <div className="source-form-locked-fields">
          <div className="source-form-locked-row">
            <span className="source-form-locked-label">신뢰도</span>
            <span className="source-form-locked-value">낮음 (45)</span>
          </div>
          <div className="source-form-locked-row">
            <span className="source-form-locked-label">자동 게시</span>
            <span className="source-form-locked-value">사용 안 함 · 탐문 데스크만</span>
          </div>
        </div>
      ) : (
        <>
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
          <label className="source-form-check">
            <input
              type="checkbox"
              checked={form.auto_publish ?? true}
              onChange={(e) => onChange({ ...form, auto_publish: e.target.checked })}
            />
            <div>
              <div className="source-form-check-title">자동 게시 (auto-publish)</div>
              <div className="source-form-check-desc">
                켜면 수집 즉시 중요 게시판에 게시됩니다. 끄면 검토 대기 상태로 등록됩니다.
              </div>
            </div>
          </label>
        </>
      )}

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
        {isCommunity && (
          <p className="source-form-field-note">실제 자동 수집은 매일 06:30(KST) 커뮤니티 탐문에 포함됩니다.</p>
        )}
      </div>

      <label className="source-form-check">
        <input
          type="checkbox"
          checked={form.is_active ?? true}
          onChange={(e) => onChange({ ...form, is_active: e.target.checked })}
        />
        <div>
          <div className="source-form-check-title">활성 소스</div>
          <div className="source-form-check-desc">
            비활성 시 자동·수동 크롤링 대상에서 제외됩니다.
          </div>
        </div>
      </label>
    </>
  )
}
