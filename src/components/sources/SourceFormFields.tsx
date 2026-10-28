import type { SourceCreate, TrustLevel } from '../../types/source'
import type { Edition } from '../../types/edition'
import {
  COMMUNITY_SOURCE_TYPES,
  SOURCE_CATEGORIES,
  TRUST_SCORE_DEFAULTS,
  sourceEditionIds,
  withEditionIds,
} from '../../types/source'

export type SourceFormMode = 'official' | 'community'

// mint-server#212 C2: the server accepts only these two 나라장터 search operations.
const BID_API_BASE = 'https://apis.data.go.kr/1230000/ad/BidPublicInfoService'
const BID_API_EXAMPLES = [
  { label: '물품', url: `${BID_API_BASE}/getBidPblancListInfoThngPPSSrch?bidNtceNm=충전,전기차,자율주행` },
  { label: '용역', url: `${BID_API_BASE}/getBidPblancListInfoServcPPSSrch?bidNtceNm=충전,전기차,자율주행` },
]
const BID_CATEGORY = '입찰/조달'

const ALL_SOURCE_TYPES: { value: SourceCreate['source_type']; label: string }[] = [
  { value: 'rss', label: 'RSS' },
  { value: 'webpage', label: '웹페이지' },
  { value: 'news_page', label: '뉴스 페이지' },
  { value: 'notice_page', label: '공지사항' },
  { value: 'official_api', label: '공식 API(입찰)' },
  { value: 'manual', label: '수동 등록' },
  { value: 'reddit', label: 'Reddit (수집 비권장)' },
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
  editions?: Edition[]
}

export function SourceFormFields({
  mode,
  form,
  onChange,
  lockSourceType = false,
  editions = [],
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
        is_active: sourceType === 'reddit' ? false : form.is_active,
      })
      return
    }
    // A bid source goes to 입찰/조달; leaving the bid type drops that category again.
    if (sourceType === 'official_api') {
      onChange({ ...form, source_type: sourceType, category: BID_CATEGORY })
      return
    }
    const category = form.category === BID_CATEGORY ? '정책/규제' : form.category
    onChange({ ...form, source_type: sourceType, category })
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
              : form.source_type === 'official_api'
                ? BID_API_EXAMPLES[0].url
                : 'https://example.go.kr/rss'
          }
        />
        {form.source_type === 'official_api' && (
          <div className="source-form-field-note">
            <p>나라장터 입찰공고(물품·용역)만 등록할 수 있습니다. 공사·외자는 지원하지 않습니다.</p>
            <ul>
              {BID_API_EXAMPLES.map((example) => (
                <li key={example.label}>
                  {example.label}: <code>{example.url}</code>
                </li>
              ))}
            </ul>
            <p>
              검색어는 <code>bidNtceNm</code>에 쉼표로 구분해 최대 5개까지 넣습니다. 서비스키는 서버
              설정에서 읽으므로 URL에 넣지 마세요. 카테고리는 기본값 「{BID_CATEGORY}」로 저장됩니다.
            </p>
          </div>
        )}
      </div>
      <div className="form-row">
        <div className="field">
          <label>유형</label>
          <select
            className="input"
            value={form.source_type || (isCommunity ? 'community_forum' : 'rss')}
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
              <div className="source-form-check-title">자동 게시</div>
              <div className="source-form-check-desc">
                켜면 수집 즉시 중요 게시판에 게시됩니다. 끄면 검토 대기 상태로 등록됩니다.
              </div>
            </div>
          </label>
        </>
      )}

      {form.source_type === 'reddit' && (
        <p className="source-form-mode-hint source-form-mode-hint-community">
          Reddit 목록은 대부분의 서버 IP에서 막혀 자동 수집이 되지 않습니다. 저장해도 비활성으로
          두고, 국내 포럼·커뮤니티 게시판을 쓰는 것을 권합니다.
        </p>
      )}

      <div className="field">
        <label>자동 수집 일정</label>
        <p className="source-form-field-note">
          {isCommunity
            ? '커뮤니티 탐문은 매일 06:30(KST)에 돌아갑니다. 주기를 바꿀 수 없으며, 지금 돌리려면 소스 화면의 「지금 실행」을 쓰세요.'
            : '탐문 파이프라인은 매일 06:00(KST)에 돌아갑니다. 주기를 바꿀 수 없으며, 지금 돌리려면 소스 화면의 「지금 실행」을 쓰세요.'}
        </p>
      </div>

      <label className="source-form-check">
        <input
          type="checkbox"
          checked={form.source_type === 'reddit' ? false : (form.is_active ?? true)}
          disabled={form.source_type === 'reddit'}
          onChange={(e) => onChange({ ...form, is_active: e.target.checked })}
        />
        <div>
          <div className="source-form-check-title">활성 소스</div>
          <div className="source-form-check-desc">
            {form.source_type === 'reddit'
              ? 'Reddit은 서버에서 수집이 막혀 활성으로 둘 수 없습니다.'
              : '비활성 시 자동·수동 크롤링 대상에서 제외됩니다.'}
          </div>
        </div>
      </label>

      {editions.length > 0 && (
        <fieldset className="field source-form-editions">
          <legend>소속 주제</legend>
          <p className="source-form-field-note">
            여러 주제를 고를 수 있습니다. 기사는 고른 주제마다 그 주제의 관련성 기준으로 따로 판정됩니다.
          </p>
          {editions.map((edition) => {
            const selected = sourceEditionIds(form)
            const checked = selected.includes(edition.id)
            return (
              <label key={edition.id} className="source-form-edition">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) =>
                    onChange(
                      withEditionIds(
                        form,
                        event.target.checked
                          ? [...selected, edition.id]
                          : selected.filter((id) => id !== edition.id),
                      ),
                    )
                  }
                />
                <span>{edition.name}</span>
                {checked && selected.length > 1 && form.edition_id === edition.id && (
                  <small>대표</small>
                )}
              </label>
            )
          })}
          {sourceEditionIds(form).length === 0 && (
            <p className="source-form-field-note source-form-field-error">주제를 하나 이상 고르세요.</p>
          )}
        </fieldset>
      )}
    </>
  )
}
