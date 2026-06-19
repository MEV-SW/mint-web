import { Link } from 'react-router-dom'
import { Icon } from '../components/common/Icon'
import { PageShell } from '../components/layout/PageShell'
import { DISCOVERY_BOARD_LABEL, DISCOVERY_PIPELINE_LABEL } from '../constants/boardLabels'

const FLOW = [
  { step: '1', title: '소스 등록', desc: '신뢰할 수 있는 EV·충전 뉴스/공지 URL을 등록합니다.', to: '/sources' },
  { step: '2', title: '자동 수집', desc: '크롤링으로 게시글을 수집하고 AI가 요약·중요도를 판단합니다.', to: '/sources' },
  { step: '3', title: '게시판 검토', desc: `중요 게시판과 ${DISCOVERY_BOARD_LABEL}에서 내용을 확인합니다.`, to: '/trusted' },
  { step: '4', title: '리포트·알림', desc: '데일리 리포트를 생성하고 Slack으로 공유합니다.', to: '/reports' },
]

const SECTIONS = [
  {
    icon: 'dashboard',
    title: '1면',
    body: `오늘의 수집 현황, 최근 중요 게시글·${DISCOVERY_BOARD_LABEL} 미리보기, 최신 데일리 리포트를 한눈에 확인합니다.`,
    link: { label: '1면 열기', to: '/' },
  },
  {
    icon: 'shield',
    title: '중요 게시판',
    body: '신뢰 소스에서 수집된 게시글입니다. 원문 링크와 AI 요약만 표시되며, 승인·숨김·삭제 등 운영 작업을 할 수 있습니다.',
    link: { label: '중요 게시판', to: '/trusted' },
  },
  {
    icon: 'sparkles',
    title: DISCOVERY_BOARD_LABEL,
    body: 'AI가 EV·충전 관련 기사를 발굴한 탐문 후보입니다. 검토 후 검토 완료 처리하거나 중요 게시판으로 승격할 수 있습니다. 검토 대기 상태로 14일 넘게 남은 글은 자동 삭제됩니다.',
    link: { label: DISCOVERY_BOARD_LABEL, to: '/discovery' },
  },
  {
    icon: 'feed',
    title: '소스 관리',
    body: `RSS·웹페이지 등 소스를 등록하고, 개별 크롤 또는「${DISCOVERY_PIPELINE_LABEL}」으로 신뢰 소스 전체를 한 번에 수집할 수 있습니다.`,
    link: { label: '소스 관리', to: '/sources' },
  },
  {
    icon: 'doc',
    title: '데일리 리포트',
    body: '선택한 날짜에 수집된 게시글을 바탕으로 AI가 일일 브리핑을 생성합니다. 수동 생성과 자동 스케줄(매일 08:00)을 지원합니다.',
    link: { label: '데일리 리포트', to: '/reports' },
  },
  {
    icon: 'slack',
    title: 'Slack 설정',
    body: 'Webhook을 등록하면 데일리 리포트를 사내 Slack 채널로 발송할 수 있습니다. 테스트 메시지로 연결을 확인하세요.',
    link: { label: 'Slack 설정', to: '/slack' },
  },
]

const FAQ = [
  {
    q: '게시글 본문이 안 보여요.',
    a: 'MINT는 원문 링크 + AI 요약 중심으로 표시합니다. 상세 페이지에서「원문 보기」링크로 기사를 확인하세요.',
  },
  {
    q: `${DISCOVERY_BOARD_LABEL}와 중요 게시판의 차이는?`,
    a: `중요 게시판은 신뢰 소스에서 자동 수집된 글이고, ${DISCOVERY_BOARD_LABEL}는 AI가 관련성을 판단해 올린 검토 대기 후보입니다.`,
  },
  {
    q: '탐문 후보는 언제 자동 삭제되나요?',
    a: '검토 대기(pending) 상태로 14일 이상 남은 글은 매일 05:30(KST)에 자동 삭제됩니다. 검토 완료·승격·숨김 처리한 글은 해당되지 않습니다. 보관 기간은 서버 설정 DISCOVERY_PENDING_RETENTION_DAYS로 조정할 수 있습니다.',
  },
  {
    q: '검색은 어디서 하나요?',
    a: '화면 상단 검색창에서 게시글·소스를 통합 검색할 수 있습니다. 1글자 이상 입력하면 결과가 표시됩니다.',
  },
  {
    q: 'AI 챗봇은 무엇을 도와주나요?',
    a: '우하단 MINT AI 버튼을 누르면 수집된 자료를 바탕으로 EV·충전 관련 질문에 답합니다. MINT에 없는 내용은 일반 지식 답변 여부를 먼저 물어봅니다.',
  },
  {
    q: '자동 수집 스케줄은?',
    a: `서버에 Celery worker·beat가 실행 중이면 매일 05:30 미승인 탐문 후보 정리, 06:00 ${DISCOVERY_PIPELINE_LABEL}, 08:00 데일리 리포트가 자동 실행됩니다. 수동 실행은 소스 관리·리포트 화면에서 가능합니다.`,
  },
]

export function HelpPage() {
  return (
    <PageShell
      section="안내"
      title="도움말"
      lead="MINT(MotrexEV Intelligence & News Tracker) 사용 방법을 안내합니다."
    >
      <section className="help-hero card card-pad">
        <div className="help-hero-icon" aria-hidden>
          <Icon name="help" />
        </div>
        <div>
          <h3>MINT란?</h3>
          <p>
            EV·충전 인프라 관련 뉴스와 공지를 자동으로 수집하고, AI가 요약·중요도를 판단해
            데일리 리포트와 Slack 알림까지 제공하는 사내 인텔리전스 도구입니다.
          </p>
        </div>
      </section>

      <section className="help-section">
        <h3 className="help-section-title">전체 흐름</h3>
        <div className="help-flow">
          {FLOW.map((f) => (
            <Link key={f.step} to={f.to} className="help-flow-item">
              <span className="help-flow-step">{f.step}</span>
              <div>
                <strong>{f.title}</strong>
                <p>{f.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="help-section">
        <h3 className="help-section-title">메뉴별 안내</h3>
        <div className="help-grid">
          {SECTIONS.map((s) => (
            <div key={s.title} className="help-card card card-pad">
              <div className="help-card-head">
                <span className={`help-card-icon ic-mint`}>
                  <Icon name={s.icon} />
                </span>
                <h4>{s.title}</h4>
              </div>
              <p>{s.body}</p>
              <Link to={s.link.to} className="help-card-link">
                {s.link.label} <Icon name="arrowRight" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="help-section">
        <h3 className="help-section-title">자주 묻는 질문</h3>
        <div className="help-faq">
          {FAQ.map((item) => (
            <details key={item.q} className="help-faq-item">
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="help-tip card card-pad">
        <Icon name="sparkles" />
        <div>
          <strong>팁</strong>
          <p>
            모바일에서는 상단 메뉴(☰)로 내비게이션을 열 수 있습니다. AI 챗봇은 우하단
            버튼을 눌러 언제든 질문하세요.
          </p>
        </div>
      </section>
    </PageShell>
  )
}
