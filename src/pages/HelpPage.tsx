import { Link } from 'react-router-dom'
import { Icon } from '../components/common/Icon'
import { PageShell } from '../components/layout/PageShell'
import { DISCOVERY_PIPELINE_LABEL } from '../constants/boardLabels'

const FLOW = [
  { step: '1', title: '1면 확인', desc: '배정된 사업 분야 지면에서 오늘 헤드라인을 봅니다.', to: '/' },
  { step: '2', title: '브리핑 듣기', desc: '분야 브리핑을 음성으로 들으며 다른 일을 할 수 있습니다.', to: '/' },
  { step: '3', title: '뉴스 탐색', desc: '뉴스 탭과 키워드 토픽 허브로 주제를 깊게 봅니다.', to: '/news' },
  { step: '4', title: '문의', desc: '권한·분야 배정은 총관에게 문의하세요.', to: '/inquiries' },
]

const SECTIONS = [
  {
    icon: 'dashboard',
    title: '1면',
    body: '배정된 사업 분야마다 지면이 한 장씩 생깁니다. 브리핑 듣기로 요약을 음성 재생할 수 있습니다.',
    link: { label: '1면 열기', to: '/' },
  },
  {
    icon: 'feed',
    title: '뉴스·토픽',
    body: '뉴스 칩을 누르면 키워드 토픽 허브로 이동합니다. 직접 매칭이 적으면 같은 분야 관련 소식을 함께 보여줍니다.',
    link: { label: '뉴스 탐색', to: '/news' },
  },
  {
    icon: 'doc',
    title: '조직 리포트',
    body: '조직 전체 수집 기준 AI 일일 브리핑입니다. 상세 페이지에서도 듣기를 지원합니다.',
    link: { label: '리포트', to: '/reports' },
  },
  {
    icon: 'sparkles',
    title: '설정',
    body: '총관은 사업 분야를 만들고, 분야 편집장은 지면 메인 키워드를 지정합니다.',
    link: { label: '설정', to: '/settings#editions' },
  },
  {
    icon: 'shield',
    title: '관리',
    body: `검수함, 계정 관리, 소스, 웹훅을 한곳에서 운영합니다. ${DISCOVERY_PIPELINE_LABEL}과 크롤링도 소스 메뉴에서 실행합니다.`,
    link: { label: '관리', to: '/admin' },
  },
  {
    icon: 'help',
    title: '문의',
    body: '일반 사용자는 문의를 작성하고, 관리자는 관리 메뉴에서 답변합니다.',
    link: { label: '문의', to: '/inquiries' },
  },
]

const FAQ = [
  {
    q: '게시글 본문이 안 보여요.',
    a: 'MINT는 원문 링크 + AI 요약 중심으로 표시합니다. 상세 페이지에서「원문 보기」링크로 기사를 확인하세요.',
  },
  {
    q: '조직 리포트는 어떻게 만들어지나요?',
    a: '조직 리포트는 EV·충전 관련 수집 뉴스를 바탕으로 AI가 작성한 팀 공용 브리핑입니다. 관리자가 수동 생성하거나 스케줄로 자동 생성됩니다.',
  },
  {
    q: '검수함은 어디에 있나요?',
    a: '관리자는 상단「관리」→「검수함」에서 저신뢰 분류, 미분류, 신규 키워드 후보를 검토합니다. 애매한 기사도 빈 키워드로 두지 않고 가장 가까운 주제로 붙입니다.',
  },
  {
    q: '검색은 어디서 하나요?',
    a: '화면 상단 검색창에서 게시글·소스를 통합 검색할 수 있습니다. 뉴스 메뉴에서는 제목·요약 검색과 필터를 함께 쓸 수 있습니다.',
  },
  {
    q: 'AI 챗봇은 무엇을 도와주나요?',
    a: '우하단 MINT AI 버튼을 누르면 수집된 자료를 바탕으로 EV·충전 관련 질문에 답합니다. MINT에 없는 내용은 일반 지식 답변 여부를 먼저 물어봅니다.',
  },
  {
    q: '자동 수집·리포트 스케줄은?',
    a: `서버에 Celery worker·beat가 실행 중이면 매일 05:30 미승인 탐문 후보 정리, 06:00 ${DISCOVERY_PIPELINE_LABEL}, 08:00 조직 데일리 리포트가 자동 실행됩니다.`,
  },
  {
    q: '홈에 지면이 안 보여요.',
    a: '총관이 계정 관리에서 사업 분야를 배정해야 홈 지면이 열립니다. 여러 분야에 속하면 해당 면만 보입니다.',
  },
  {
    q: '브리핑 듣기는 어떻게 쓰나요?',
    a: '1면·리포트 상세의「듣기」버튼을 누르면 브라우저 음성(온디바이스 TTS)으로 요약을 읽어 줍니다. 서버에 오디오를 저장하지 않으며, 지원하지 않는 브라우저에서는 버튼이 숨겨질 수 있습니다.',
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
            EV·충전 인프라 관련 뉴스를 EV 관련성 게이트로 걸러 수집하고, AI가 요약·중요도를
            분석해 조직 1면·데일리 리포트·Webhook 알림까지 제공하는 사내 인텔리전스 도구입니다.
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
                <span className="help-card-icon ic-mint">
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
            메인 메뉴는 1면·뉴스·리포트입니다. 설정·문의·도움말은 우상단 프로필 메뉴에서,
            운영 기능은 관리 메뉴에서 찾을 수 있습니다.
          </p>
        </div>
      </section>
    </PageShell>
  )
}
