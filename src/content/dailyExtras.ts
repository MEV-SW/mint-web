export interface DailyFact {
  body: string
}

export interface DailyTerm {
  word: string
  body: string
}

export interface DailyQuiz {
  question: string
  options: [string, string, string]
  answerIndex: number
  explanation: string
}

export interface DailyEdition {
  fact: DailyFact
  term: DailyTerm
  quiz: DailyQuiz
}

export const DAILY_FACTS: DailyFact[] = [
  { body: '사람은 하루 평균 2만 번 정도 숨을 쉽니다. 의식하지 않아도 몸은 24시간 풀가동 중입니다.' },
  { body: '바나나는 식물학적으로 “베리”에 가깝고, 딸기는 베리가 아닙니다. 이름과 분류는 종종 엇갈립니다.' },
  { body: '물은 4°C일 때 밀도가 가장 큽니다. 그래서 얼음은 물 위에 떠서, 바닥부터 얼지 않습니다.' },
  { body: '인간 뇌는 전체 체중의 약 2%인데, 에너지의 20% 가까이 씁니다. 생각이 “가벼운” 일은 아닙니다.' },
  { body: '꿈은 REM 수면에서 주로 vivid해집니다. REM은 Rapid Eye Movement, “눈이 빠르게 움직이는” 수면 단계입니다.' },
  { body: '꿀은 수분·산·당 조건 덕분에 잘 상하지 않습니다. 단, “영원히”는 아니고, 보관·습기·오염에 따라 달라집니다.' },
  { body: '토마토는 과학적으로는 과일, 요리에서는 채소로 다루는 대표 사례입니다. 분류는 “누가, 무엇을 위해”에 따라 갈립니다.' },
  { body: '커피·녹차의 카페인은 각성 효과가 있지만, 사람마다 대사 속도가 달라 “한 잔의 지속 시간”도 제각각입니다.' },
  { body: '손톱은 발톱보다 빨리 자랍니다. 손가락 사용·혈류·외부 자극이 성장 속도에 영향을 줍니다.' },
  { body: '지구 대기 중 질소가 약 78%를 차지합니다. 우리가 매일 마시는 공기의 대부분은 산소가 아니라 질소입니다.' },
  { body: '번개는 구름에서 땅으로만 치는 게 아니라, 구름 사이·땅에서 위로 올라가는 형태도 있습니다.' },
  { body: '고양이는 “우유를 좋아한다”는 이미지와 달리, 성묘 상당수가 유당 불내증을 겪습니다.' },
  { body: '인간은 코로 약 1조 가지 냄새 조합을 구분할 수 있다고 알려져 있습니다. 기억과 감정과도 깊게 연결됩니다.' },
  { body: '세계에서 가장 많이 쓰이는 언어는 모국어 기준 중국어(만다린)입니다. 인터넷·비즈니스에서는 영어 비중이 큽니다.' },
  { body: '금은 녹슬지 않는 대표적인 금속입니다. 그래서 오래 보관·장식·전자 부품에 쓰입니다.' },
  { body: '카메라 렌즈가 눈의 홍채처럼 조리개를 조절하는 것처럼, 동공도 밝기에 따라 크기가 변합니다.' },
  { body: '비행기는 지구 자전 방향 덕을 “타는” 게 아닙니다. 공기와 함께 움직이기 때문에, 자전만으로 목적지까지 밀려가지 않습니다.' },
  { body: '“5초 룰”은 위생상 권장되지 않습니다. 바닥 재질·습도·미생물 종류에 따라 오염은 순식간에 일어날 수 있습니다.' },
  { body: '사과 한 개의 식이섬유·비타민 C는 품종·크기·보관 기간에 따라 꽤 달라집니다. “하루 사과 하나”도 통계적 평균일 뿐입니다.' },
  { body: '인간은 태어날 때 뼈가 270개 안팎이라고 알려져 있고, 성장하며 일부가 융합해 성인은 약 206개가 됩니다.' },
  { body: '전자레인지는 음식 “안쪽”을 직접 가열하기보다, 주로 수분 분자를 진동시켜 열을 만듭니다.' },
  { body: '지진의 규모(리히터)는 지진 에너지 크기, 진도는 “체감·피해”에 가깝습니다. 숫자가 비슷해 보여도 의미가 다릅니다.' },
  { body: '사람은 피로할수록 위험을 과소·과대평가하기 쉽습니다. “오늘은 괜찮겠지”는 종종 수면 부족의 문장입니다.' },
  { body: '물 1리터는 1kg과 거의 같습니다. 덕분에 운동·요리·여행 짐에서 직관적인 환산이 가능합니다.' },
  { body: '무지개는 항상 태양 반대쪽 하늘에 보입니다. 빛이 물방울에서 굴절·반사·분산되며 생깁니다.' },
  { body: '키보드·스마트폰 표면은 생각보다 많은 세균이 있을 수 있습니다. 손 씻기와 정기적인 닦기가 가장 실용적입니다.' },
  { body: '“북극곰은 흰색, 판다는 검은색과 흰색”처럼 보이지만, 북극곰 털은 속빛이 투명에 가까워 빛에 따라 달라 보일 수 있습니다.' },
  { body: '인간의 혀에는 단맛·짠맛·신맛·쓴맛·감칠맛(우마미) 등을 감지하는 수용체가 있습니다.' },
  { body: '우산을 접을 때 물기가 안쪽으로 모이게 하면, 실내 바닥이 덜 젖습니다. 작은 습관이 큰 차이를 만듭니다.' },
  { body: '계절은 지구 자전축이 약 23.5° 기울어져 있어서 생깁니다. 태양과의 거리 변화만으로는 사계절이 설명되지 않습니다.' },
]

export const DAILY_QUIZZES: DailyQuiz[] = [
  {
    question: 'OCPP는 주로 무엇을 위한 표준일까요?',
    options: ['충전기-CSMS 통신', '차량 배터리 화학', '전기 요금 할인'],
    answerIndex: 0,
    explanation: 'OCPP(Open Charge Point Protocol)는 충전기와 운영 서버(CSMS)가 세션·상태·요금 정보를 주고받는 통신 표준입니다.',
  },
  {
    question: 'kW와 kWh 중 “충전량”을 나타내는 단위는?',
    options: ['kW', 'kWh', 'V'],
    answerIndex: 1,
    explanation: 'kWh(킬로와트시)는 에너지·충전량 단위입니다. kW는 순간 출력(전력) 단위입니다.',
  },
  {
    question: 'CPO의 역할로 가장 가까운 것은?',
    options: ['충전 인프라 운영', '차량 제조', '배터리 채굴'],
    answerIndex: 0,
    explanation: 'CPO(Charge Point Operator)는 충전소를 소유·운영하고 드라이버에게 충전 서비스를 제공합니다.',
  },
  {
    question: 'Plug and Charge와 관련 깊은 표준은?',
    options: ['ISO 15118', 'HTTP/2', 'Bluetooth LE'],
    answerIndex: 0,
    explanation: 'ISO 15118은 차량과 충전기 간 보안 통신·Plug and Charge를 위한 국제 표준입니다.',
  },
  {
    question: 'DC 급속 충전에서 SOC가 높아질수록 속도가 줄어드는 주된 이유는?',
    options: ['배터리 보호', '앱 UI 버그', '로밍 수수료'],
    answerIndex: 0,
    explanation: '배터리 수명·안전을 위해 BMS가 고 SOC 구간에서 충전 전류를 제한하는 경우가 많습니다.',
  },
  {
    question: 'eMSP는 보통 무엇을 제공하나요?',
    options: ['앱·카드로 충전 접근', '타이어 교체', '차량 세차'],
    answerIndex: 0,
    explanation: 'eMSP(e-Mobility Service Provider)는 드라이버에게 충전 접근권·결제·로밍 등을 제공합니다.',
  },
  {
    question: 'CCS와 CHAdeMO는 주로 무엇의 종류일까요?',
    options: ['커넥터·충전 인터페이스', 'CSMS 벤더', '전력 회사'],
    answerIndex: 0,
    explanation: 'CCS·CHAdeMO는 물리 커넥터/충전 인터페이스 표준입니다. OCPP와는 층이 다릅니다.',
  },
  {
    question: 'V2G의 “G”는 무엇을 뜻할까요?',
    options: ['Grid(전력망)', 'GPS', 'Gear'],
    answerIndex: 0,
    explanation: 'V2G(Vehicle-to-Grid)는 전기차가 전력망과 양방향으로 에너지를 주고받는 개념입니다.',
  },
  {
    question: '충전 “로밍”이란?',
    options: ['타사 네트워크 충전 이용', '충전기 해외 수출', '배터리 교환'],
    answerIndex: 0,
    explanation: '로밍은 다른 CPO의 충전기를 내 서비스(앱·카드)로 이용할 수 있게 하는 상호 접속입니다.',
  },
  {
    question: 'CSMS의 핵심 기능으로 맞는 것은?',
    options: ['충전기 원격 모니터링·제어', '차량 자율주행', '전기 요금 발행'],
    answerIndex: 0,
    explanation: 'CSMS는 충전기 fleet 상태, 세션, 장애, 설정을 중앙에서 관리하는 시스템입니다.',
  },
  {
    question: 'SOC는 무엇의 약자일까요?',
    options: ['State of Charge', 'Speed of Car', 'State of Connector'],
    answerIndex: 0,
    explanation: 'SOC(State of Charge)는 배터리 잔량을 퍼센트로 나타내는 지표입니다.',
  },
  {
    question: '완속(AC) 충전의 특징으로 맞는 것은?',
    options: ['주차·체류 시간 활용에 유리', '항상 350kW 출력', '로밍 불가'],
    answerIndex: 0,
    explanation: '완속은 출력은 낮지만 장시간 주차·업무·수면과 함께 쓰기 좋은 충전 방식입니다.',
  },
  {
    question: '충전 완료 후 점유료(idle fee)의 목적은?',
    options: ['충전기 회전율 제고', '앱 다운로드 유도', '배터리 냉각'],
    answerIndex: 0,
    explanation: '점유료는 충전이 끝난 뒤에도 자리를占하는 것을 줄여, 다음 사용자를 위한 회전율을 높입니다.',
  },
  {
    question: 'OCPP와 ISO 15118의 관계로 맞는 설명은?',
    options: ['서로 다른 층·역할의 표준', '완전히 같은 표준', '충전기 브랜드명'],
    answerIndex: 0,
    explanation: 'OCPP는 충전기↔CSMS, ISO 15118은 차량↔충전기 통신 등 역할이 다릅니다.',
  },
  {
    question: '겨울철 EV 주행거리가 줄어드는 흔한 이유는?',
    options: ['배터리·히터 부하', 'GPS 오류', 'OCPP 버전'],
    answerIndex: 0,
    explanation: '저온에서 배터리 효율이 떨어지고, cabin 히터·배터리 열관리로 소비가 늘어납니다.',
  },
  {
    question: '충전 세션 로그가 중요한 이유는?',
    options: ['장애·정산 분석의 근거', '차량 색상 기록', '광고 타겟팅'],
    answerIndex: 0,
    explanation: '시작·종료·kWh·에러 코드 등 세션 로그는 장애 티켓과 정산 disput의 출발점입니다.',
  },
]

export const DAILY_TERMS: DailyTerm[] = [
  { word: 'OCPP', body: 'Open Charge Point Protocol. 충전기와 운영 서버(CSMS)가 세션·요금·상태를 주고받는 표준 통신.' },
  { word: 'CSMS', body: 'Charge Station Management System. 충전기 fleet을 원격 모니터링·제어·정산하는 운영 두뇌.' },
  { word: 'CPO', body: 'Charge Point Operator. 충전 인프라를 소유·운영하고 드라이버에게 서비스를 제공하는 주체.' },
  { word: 'eMSP', body: 'e-Mobility Service Provider. 앱·카드·로밍으로 충전 접근권을 드라이버에게 제공.' },
  { word: 'SOC', body: 'State of Charge. 배터리 잔량(%). 운전자 심리와 직결되는 핵심 지표.' },
  { word: 'kWh', body: '킬로와트시. 실제로 “얼마나 충전했는지”를 나타내는 에너지 단위.' },
  { word: 'V2G', body: 'Vehicle-to-Grid. 전기차가 전력망에 에너지를 되돌려 주는 양방향 충전 개념.' },
  { word: 'ISO 15118', body: '차량과 충전기 간 Plug & Charge·보안 통신을 위한 국제 표준.' },
  { word: '로밍', body: '타사 충전 네트워크를 내 서비스처럼 쓰게 하는 상호 접속·정산 체계.' },
  { word: '점유료', body: '충전 완료 후에도 주차하면 부과되는 idle fee. 충전기 회전율을 높이려는 장치.' },
  { word: 'DERMS', body: '분산에너지 자원 관리. EV fleet도 수요 반응 자원으로 묶일 수 있습니다.' },
  { word: 'AC/DC', body: 'AC 완속·DC 급속 등 충전 방식. 차량 온보드 충전기 유무와 속도가 달라집니다.' },
]

/** KST 기준 날짜 시드 — 자정마다 상식·용어·퀴즈가 함께 바뀝니다. */
function daySeed(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0)
  const y = get('year')
  const m = get('month')
  const d = get('day')
  return y * 1000 + m * 50 + d
}

export function getDailyEdition(date = new Date()): DailyEdition {
  const seed = daySeed(date)
  const fact = DAILY_FACTS[(seed * 3 + 13) % DAILY_FACTS.length]!
  const term = DAILY_TERMS[(seed * 5 + 11) % DAILY_TERMS.length]!
  const quiz = DAILY_QUIZZES[(seed * 7 + 3) % DAILY_QUIZZES.length]!
  return { fact, term, quiz }
}
