# 화면정의서_MOTREXEV주제화면

- 기능요청: [#57 MOTREXEV 주제 전환·트렌드 대시보드·관리 UI 구현](https://github.com/MEV-SW/mint-web/issues/57)
- **디자인 경로**: 클로드 직행 (§2)
- 작성: yschae0311 / 승인: 프론트엔드 팀장
- 현재 화면: `/docs/img/`에 이번 카드용 캡처 없음. 기준 시안은 release 작업지시서가 가리키는 `sample_design/MOTREXEV Intelligence -offline-.html`.
- **디자인 시스템**
  - Figma 라이브러리: 해당 없음
  - 코드 토큰·컴포넌트: [`src/styles/mint.css`](https://github.com/MEV-SW/mint-web/blob/main/src/styles/mint.css), [`src/styles/editorial.css`](https://github.com/MEV-SW/mint-web/blob/main/src/styles/editorial.css), 기존 `Btn`, `PageShell`, `TopNav`; 주제 바와 트렌드 위젯은 이 카드에서 생성
  - 쓸 컴포넌트: `TopNav`, `Link`, `Btn`, `PageShell`, topic pill, radio, chip input, searchable source list, dropdown, confirmation modal, range toggle, bar chart, ranking row, information card, status badge, toast, loading skeleton

## 화면 목록
| # | 화면명 | 진입 경로 | 비고 |
|---|---|---|---|
| 1 | TOPICS 주제 전환 바 | 로그인 레이아웃의 `TopNav` 바로 아래 | 키오스크 제외. 선택 주제와 표시 방식·소스 수 노출 |
| 2 | 뉴스형 주제 홈 | `/?edition={slug}` | 기존 `DashboardPage`·`MintFrontPage`를 유지해 렌더링 |
| 3 | 트렌드형 주제 홈 | `/?edition={slug}` | 선택 주제의 `display_mode=trend`일 때 3개 위젯 렌더링 |
| 4 | 주제 관리 | `/admin/settings#editions` | admin은 전체 편집, edition editor는 기존 권한 범위 유지 |
| 5 | 사용자 노출 브랜드 | 로그인·상단 내비·홈·도움말·챗·키오스크 등 기존 화면 | `MINT`/`MotrexEV`를 MOTREXEV 명칭으로 변경 |

## 화면별 정의

### 1. TOPICS 주제 전환 바
- **구성**:
  ```
  좌측  "TOPICS" 레이블
  본문  활성 주제 pill — 주제 수만큼 가로 반복, 좁은 화면은 가로 스크롤
        └ pill: 주제명 / 표시 방식 배지(뉴스형 또는 트렌드형) / 소스 N
  우측  "주제 관리 →" 링크 (admin에게만)
  ```
- **표시 데이터**: `GET /api/v1/editions?active_only=true`의 `id`, `slug`, `name`, `display_mode`, `tagged_source_count`. 선택값은 URL query parameter `edition={slug}`에 둔다. 값이 없거나 접근할 수 없는 slug면 사용자가 볼 수 있는 첫 활성 주제로 정규화한다.
- **액션**: pill 클릭 시 현재 URL의 `edition`만 바꾸고 선택 주제를 다시 렌더링한다. 주제 관리 링크는 `/admin/settings#editions`로 이동한다. 기존 키워드 허브 `/topics/:keywordId`는 변경하지 않는다.
- **상태**: 로딩은 pill 높이의 skeleton. 활성 주제가 없으면 바를 숨기고 기존 온보딩 흐름을 유지한다. 조회 오류면 선택 UI 대신 짧은 오류와 재시도를 표시한다. 선택 pill은 `rgba(27,85,64,0.05)` 배경, `var(--pine)` 하단 2px 보더, `9px 14px` padding. 뉴스형 배지는 `var(--pined)` 9.5px/700/0.57px, 트렌드형 배지는 전용 amber-dark `#7a4e12`로 구분한다.
- **권한**: 로그인 사용자 전체가 자신에게 보이는 주제만 본다. "주제 관리 →"는 admin만 본다.

### 2. 뉴스형 주제 홈
- **구성**:
  ```
  상단  TOPICS 주제 전환 바
  본문  기존 MintFrontPage
        ├ 마스트헤드·톱 스토리
        ├ 주요 뉴스·오늘의 리포트
        └ 기존 개인화·데일리 영역
  ```
- **표시 데이터**: 선택 Edition의 `id`, `slug`, `name`, `display_mode=news`와 기존 editorial feed·리포트·통계 데이터. API 호출의 edition 기준은 URL의 slug를 Edition id로 해석해 전달한다.
- **액션**: 기존 홈 액션을 유지한다. 주제 pill 선택만 URL `edition`을 바꿔 해당 뉴스형 데이터를 다시 조회한다.
- **상태**: 기존 `DashboardPage`의 로딩·빈 데이터·오류 상태를 유지한다. 잘못된 slug는 첫 접근 가능 주제로 replace한다. `display_mode` 조회 전에는 뉴스형을 먼저 그렸다가 트렌드형으로 뒤집지 않고 page skeleton을 유지한다.
- **권한**: 로그인 사용자 중 해당 Edition 열람 권한이 있는 사용자.

### 3. 트렌드형 주제 홈
- **구성**:
  ```
  상단  TOPICS 주제 전환 바
  메타  집계 기준 / 집계 주기 / 최근 갱신 / 소스 수 / 수집 건수
  도구  기간 toggle(7일 / 30일 / 90일) + CSV 내보내기
  본문  언급량 추이 widget
        ├ 일별 막대그래프
        └ 카테고리 구성비 범례 — 색상 점 / 라벨 / % / 전기간 대비
        랭킹 widget
        └ 행 반복: 순위 / 이름 / 비율 막대 / 건수 / 증감 / 선택 NEW 배지
        신규 정보 widget
        └ 카드 반복: 첫 등장일·소스 수·언급 수 / 헤드라인 / 설명
  ```
- **표시 데이터**: `GET /api/v1/editions/{id}/trend?range=7|30|90` 전체 응답. 메타는 `aggregation_basis`, `refresh_interval`, `generated_at`, `source_count`, `post_count`; 차트는 `mention_volume.daily[]`, 범례는 `mention_volume.categories[]`, 랭킹은 `ranking[]`, 신규 카드는 `new_items[]`를 사용한다. 집계 기준은 "중복 제거 포스트 수", 주기는 "1시간"으로 표시한다.
- **액션**: 기간 toggle 클릭 시 query parameter `range`를 변경하고 다시 조회한다. 허용값이 없으면 7일을 기본값으로 replace한다. CSV 내보내기는 같은 edition·range로 `/api/v1/editions/{id}/trend.csv`를 호출해 서버 파일을 저장한다.
- **상태**: 최초·기간 전환 로딩은 위젯별 skeleton. 전체 포스트가 0이면 메타는 표시하고 각 위젯에 "선택 기간에 집계된 정보가 없습니다"를 표시한다. 일부 배열만 비면 해당 위젯만 빈 상태를 보인다. 오류는 재시도 가능한 공통 오류 블록을 표시하며 409는 뉴스형 주제 데이터 갱신 후 화면을 뉴스형으로 되돌린다. 위젯 제목은 `Noto Serif KR` 21px/700, 막대는 pine 42%와 위쪽 1px radius, 양수는 `var(--mint)`, 음수는 `var(--red)`, NEW는 red 배경·흰색·2px radius를 쓴다. CSV 버튼은 panel 배경의 1px outline과 2px radius를 쓴다.
- **권한**: 로그인 사용자 중 해당 Edition 열람 권한이 있는 사용자.

### 4. 주제 관리
- **구성**:
  ```
  상단  "주제 관리" 설명 + 신규 주제 입력
        └ 이름 / 표시 방식 radio(뉴스형·트렌드형) / TOPIC_TERMS chip input / 추가
  본문  주제 card 반복
        ├ 이름·활성 상태·표시 방식 radio
        ├ 관련성 키워드 chip editor — chip 삭제 + input(Enter로 추가)
        ├ 소스 배정 — 검색 / 소스 행 반복
        │             └ 이름 / 타입 / 현재 주제 / "주제 변경" dropdown
        └ 저장 상태·오류
  확인  겹치는 소스 5개 migration 결과
        └ 주제별 복제된 두 행과 suffix·배정 상태를 읽기 전용으로 확인
  안내  소스 타입 card — RSS / COMMUNITY / REDDIT "사용 중"
                         SNS(X·스레드) "신규·조사 필요" 비활성
  ```
- **표시 데이터**: Edition 목록의 `name`, `display_mode`, `topic_terms`, `is_active`, `tagged_source_count`; Source 목록의 `name`, `url`, `source_type`, `edition_id`. 겹치는 소스 확인 블록은 전자신문 RSS, 모터그래프, 오토헤럴드, 연합뉴스 산업, 지디넷코리아의 주제명 suffix 복제 행을 Source 목록에서 찾아 보여준다.
- **액션**: 신규 주제 추가 시 이름·표시 방식·chip 배열로 `POST /editions`. 표시 방식·TOPIC_TERMS 수정은 `PATCH /editions/{id}`. chip input은 Enter로 trim된 중복 없는 값을 추가하고 chip 삭제로 제거한다. 소스 검색은 이름·URL을 클라이언트에서 필터링한다. "주제 변경"은 대상 선택 뒤 확인 modal을 열고 승인 시 `PATCH /sources/{id}`에 단일 `edition_id`를 보낸다. 겹치는 소스는 확정 정책대로 백엔드 migration이 복제하므로 UI에서 추가 복제·삭제 액션을 제공하지 않는다.
- **상태**: 목록·소스는 영역별 skeleton. 소스 0건은 "배정된 소스가 없습니다"와 소스 관리 링크. 검색 결과 0건은 검색어 전용 빈 상태. 저장 중 해당 제어만 비활성화하고 성공 시 query cache를 갱신한다. 오류는 서버 detail을 toast로 표시하고 기존 값을 유지한다. 1차 버튼은 pine 배경·흰색·2px radius·`8px 14px`; 보조 버튼은 panel 배경·1px 보더·2px radius; 상태 pill은 100px radius를 사용한다.
- **권한**: admin은 생성·표시 방식·활성 상태·모든 소스 배정을 편집한다. edition editor는 자신이 편집 가능한 주제의 기존 키워드 기능만 유지하며 admin 전용 제어는 비활성화하거나 숨긴다.

### 5. 사용자 노출 브랜드
- **구성**:
  ```
  서비스 전체명  MOTREXEV Intelligence News & Trend
  짧은 브랜드명  MOTREXEV
  기존 화면       로그인 / 상단 내비 / 마스트헤드 / 데일리 / 챗 / 키오스크 / 도움말 / 문서 title
  ```
- **표시 데이터**: 정적 사용자 노출 문자열. `MINT`, `MINT Daily`, `MotrexEV Intelligence`처럼 기존 브랜드를 뜻하는 문구를 위 두 이름 중 문맥에 맞는 값으로 바꾼다.
- **액션**: 없음. 링크·기능 동작은 유지한다.
- **상태**: 파일명(`mint.css`), CSS 클래스, React 컴포넌트명, API 식별자 등 내부 명칭은 바꾸지 않는다. 기사 본문·외부 데이터처럼 브랜드가 아닌 원문 속 `MINT`는 자동 치환하지 않는다. 검수함 탭·카운트·엔드포인트는 추가하지 않는다.
- **권한**: 각 기존 화면의 권한을 그대로 따른다.
