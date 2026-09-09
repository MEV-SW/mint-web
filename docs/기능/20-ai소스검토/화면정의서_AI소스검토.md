# 화면정의서_AI소스검토

- 기능요청: [W2 AI 제안 소스 검토·승인 UI](https://github.com/MEV-SW/mint-web/issues/20)
- **디자인 경로**: 클로드 직행(§2) — W1과 같은 이유. [`AdminCategoriesPage`](https://github.com/MEV-SW/mint-web/blob/main/src/pages/AdminCategoriesPage.tsx)에 모달 하나를 추가하는 확장이라 기존 부품(Modal/Btn/Icon/Toast)만으로 조립된다.
- 작성: 채윤성 / 승인: 리뷰 없음(§3 — 단독 리포, 승인 상대 없음)
- **디자인 시스템**
  - Figma 라이브러리: 해당 없음(클로드 직행)
  - 코드 토큰·컴포넌트: 기존 [`src/components/common/`](https://github.com/MEV-SW/mint-web/tree/main/src/components/common) 재사용, 신규 생성 없음
  - 쓸 컴포넌트: `Modal`, `Btn`, `Icon`(`sparkles` — 기존 [SourcesPage의 AI 발견 파이프라인](https://github.com/MEV-SW/mint-web/blob/main/src/pages/SourcesPage.tsx)과 같은 아이콘으로 "AI 기능"임을 일관되게 표시), `Toast`

## 화면 목록
| # | 화면명 | 진입 경로 | 비고 |
|---|---|---|---|
| 1 | AI 소스 제안 검토 | [카테고리 관리](https://github.com/MEV-SW/mint-web/blob/main/docs/기능/19-카테고리관리/화면정의서_카테고리관리.md) 화면의 카테고리별 행에 "AI 소스 제안" 버튼 → 모달 | 별도 라우트 없음, `AdminCategoriesPage` 안의 두 번째 Modal |

## 화면별 정의
### 1. AI 소스 제안 검토
- **구성**:
  ```
  카테고리 표(기존 W1)  각 행에 "AI 소스 제안" 버튼(sparkles 아이콘) 추가
  모달  제목: "{카테고리명} 소스 제안"
        상단  "다시 생성" 버튼
        본문  후보 카드 반복
              └ 이름 / URL(링크) / 유형 뱃지(RSS 등) / 제안 이유 / "승인" 버튼
        하단  "닫기" 버튼
  ```
- **표시 데이터**: [서버 P2](https://github.com/MEV-SW/mint-server/blob/main/docs/기능/14-ai소스제안/API스펙_AI소스제안.md) `POST /categories/{id}/source-suggestions` 응답의 `candidates[]`(name/url/source_type/reason). 서버에 저장되지 않는 stateless 응답이라 모달을 닫으면 후보 목록은 사라진다(다시 열면 새로 생성).
- **액션**:
  - "AI 소스 제안" 클릭 → 모달 열고 즉시 `POST /categories/{id}/source-suggestions`(`count=5` 고정) 호출.
  - "다시 생성" → 같은 API 재호출, 목록 교체.
  - 후보 카드의 "승인" → [서버 P3](https://github.com/MEV-SW/mint-server/blob/main/docs/기능/15-소스승인/API스펙_소스승인.md) `POST /categories/{id}/source-suggestions/approve`에 그 후보 데이터(name/url/source_type/reason) 그대로 전송. 성공하면 그 카드를 목록에서 제거하고(다시 안 보이게), `['sources']` 캐시를 무효화해 카테고리 표의 "사용 소스" 수를 갱신한다.
  - "닫기"·모달 바깥 클릭 → 그냥 닫는다. **반려 API는 없다**(P3 설계상 승인만 존재) — 승인하지 않은 후보는 닫는 순간 잊힌다. 같은 후보가 나중에 다시 제안될 수 있다는 한계는 [P3 문서](https://github.com/MEV-SW/mint-server/blob/main/docs/기능/15-소스승인/API스펙_소스승인.md)에 이미 기록돼 있다.
- **상태**:
  - 생성 중: 카드 자리에 로딩 표시("소스 후보를 찾는 중…").
  - 빈 결과(필터링 후 0개): "적절한 소스 후보를 찾지 못했습니다" + "다시 생성" 버튼.
  - LLM 실패(503): 토스트로 서버 `detail` 그대로("잠시 후 다시 시도해 주세요") 표시, 모달은 유지하고 재시도 가능.
  - 승인 처리 중: 그 카드의 "승인" 버튼만 로딩 표시, 나머지 카드는 계속 조작 가능.
  - URL 중복 승인 시도(409, 동시에 두 번 승인 등): 토스트로 서버 detail 표시, 카드는 목록에 남긴다(사용자가 상황 파악 가능하게).
- **권한**: W1과 동일 — admin만 카테고리 관리 화면에 진입하므로 이 모달도 자연히 admin 전용이다.
