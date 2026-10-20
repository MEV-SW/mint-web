// mint-web#108 — read-only role × permission matrix for 08 계정 › 역할·권한.
// Mirrors the backend guards as of 2026-10-20. When a guard changes, change the row here too.

export type PermissionCell = { on: boolean; note?: string }

export interface PermissionRow {
  feature: string
  admin: PermissionCell
  manager: PermissionCell
  editor: PermissionCell
  member: PermissionCell
  /** Backend guard(s) the row is based on. */
  source: string
}

const yes = (note?: string): PermissionCell => ({ on: true, note })
const no = (note?: string): PermissionCell => ({ on: false, note })

export const PERMISSION_ROLES = [
  { key: 'admin', label: '총관' },
  { key: 'manager', label: '매니저' },
  { key: 'editor', label: '분야 편집장' },
  { key: 'member', label: '일반(멤버·뷰어)' },
] as const

export const PERMISSION_MATRIX: PermissionRow[] = [
  {
    feature: '관리 홈·작업 로그·이슈 병합·계정·문의 답변·웹훅',
    admin: yes(),
    manager: no(),
    editor: no(),
    member: no(),
    source: 'require_admin (issues merge/split, users, inquiries list/close, slack, jobs cancel/delete); SuperAdminRoute',
  },
  {
    feature: '전체 수집·파이프라인 실행·탐문 후보 삭제 기한',
    admin: yes(),
    manager: no(),
    editor: no(),
    member: no(),
    source: 'require_admin: /sources/crawl-all, /sources/crawl-all-to-discovery, /jobs/daily-sequence, PATCH /sources/collection-settings',
  },
  {
    feature: '주제 설정 편집',
    admin: yes('전체'),
    manager: no(),
    editor: yes('담당 주제'),
    member: no('내 지면 선택만'),
    source: 'require_edition_editor: PATCH /editions/{id}, PUT /editions/{id}/keywords/featured; POST /editions is require_admin',
  },
  {
    feature: '소스 등록·수정·삭제·소스별 수집',
    admin: yes('전체'),
    manager: no(),
    editor: yes('담당 분야 소스만'),
    member: no(),
    source: 'require_edition_editor_any + MembershipService.assert_source_editable: /sources CRUD, /sources/{id}/crawl(-to-discovery)',
  },
  {
    feature: '카테고리 목록 보기(뉴스 분류 등 화면에서 쓰는 조회)',
    admin: yes(),
    manager: yes(),
    editor: yes(),
    member: yes(),
    source: 'get_current_user: GET /categories',
  },
  {
    feature: '06 카테고리 화면 보기·AI 소스 제안·승인',
    admin: yes(),
    manager: yes(),
    editor: no(),
    member: no(),
    source: 'require_source_reviewer: /categories/{id}/source-suggestions(/approve); SourceReviewRoute',
  },
  {
    feature: '카테고리 만들기·수정·비활성화',
    admin: yes(),
    manager: no(),
    editor: no(),
    member: no(),
    source: 'require_admin: POST/PATCH/DELETE /categories, PUT /categories/featured',
  },
  {
    feature: '기사 검토(게시·숨김·삭제·승격·요약)',
    admin: yes(),
    manager: no(),
    editor: yes('기사가 연결된 분야'),
    member: no(),
    source: 'require_post_editor (mint-server#170): /posts/{id}/approve|hide|delete|promote|summarize',
  },
  {
    feature: '탐문 후보 보드',
    admin: yes('전체'),
    manager: no(),
    editor: yes('담당 분야'),
    member: no(),
    source: 'mint-web#105 (AdminRoute) + can_edit per post',
  },
  {
    feature: '리포트 생성',
    admin: yes(),
    manager: no(),
    editor: yes('담당 분야'),
    member: no(),
    source: 'require_edition_editor_any + assert_editor(edition): POST /reports/generate',
  },
  {
    feature: '리포트 삭제·슬랙 발송',
    admin: yes(),
    manager: no(),
    editor: no(),
    member: no(),
    source: 'require_admin: DELETE /reports/{id}, POST /reports/{id}/send-slack',
  },
  {
    feature: '키워드 추가',
    admin: yes(),
    manager: no(),
    editor: yes(),
    member: no(),
    source: 'require_edition_editor_any: POST /keywords',
  },
  {
    feature: '키워드 승격·수정·병합',
    admin: yes(),
    manager: no(),
    editor: no(),
    member: no(),
    source: 'require_admin: /keywords/{id}/promote, PATCH /keywords/{id}, /keywords/{id}/merge',
  },
  {
    feature: '문의 작성',
    admin: no(),
    manager: yes(),
    editor: yes(),
    member: yes(),
    source: 'require_inquiry_submitter (manager, member, viewer)',
  },
]
