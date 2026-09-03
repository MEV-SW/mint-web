import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { fetchTodayWeather } from '../../api/statsApi'
import { getDailyEdition } from '../../content/dailyExtras'
import type { DailyQuiz } from '../../content/dailyExtras'

function DailyQuizBlock({ quiz }: { quiz: DailyQuiz }) {
  const [picked, setPicked] = useState<number | null>(null)
  const answered = picked !== null
  const correct = picked === quiz.answerIndex

  return (
    <div className="np-daily-block np-daily-quiz">
      <h4 className="np-daily-block-title">오늘의 상식 퀴즈</h4>
      <p className="np-daily-quiz-q">{quiz.question}</p>
      <ul className="np-daily-quiz-options">
        {quiz.options.map((opt, i) => {
          let state = ''
          if (answered) {
            if (i === quiz.answerIndex) state = 'correct'
            else if (i === picked) state = 'wrong'
          }
          return (
            <li key={i}>
              <button
                type="button"
                className={`np-daily-quiz-opt${state ? ` ${state}` : ''}`}
                disabled={answered}
                onClick={() => setPicked(i)}
              >
                <span className="np-daily-quiz-opt-label">{String.fromCharCode(65 + i)}</span>
                <span>{opt}</span>
              </button>
            </li>
          )
        })}
      </ul>
      <div
        className={`np-daily-quiz-result${answered ? (correct ? ' ok' : ' no') : ' idle'}`}
        aria-live="polite"
      >
        {answered ? (
          <>
            <strong>{correct ? '정답!' : '아쉽지만…'}</strong>
            <p>{quiz.explanation}</p>
          </>
        ) : (
          <p className="np-daily-quiz-result-hint">보기를 고르면 해설이 표시됩니다.</p>
        )}
      </div>
    </div>
  )
}

function formatTemp(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—'
  return `${Math.round(value)}°`
}

function DailyWeatherBlock() {
  const weather = useQuery({
    queryKey: ['today-weather'],
    queryFn: fetchTodayWeather,
    staleTime: 30 * 60 * 1000,
    retry: 1,
  })

  if (weather.isLoading) {
    return (
      <div className="np-daily-block np-daily-weather">
        <h4 className="np-daily-block-title">오늘의 날씨</h4>
        <p className="np-daily-weather-loading">불러오는 중…</p>
      </div>
    )
  }

  if (!weather.data) return null

  const w = weather.data
  return (
    <div className="np-daily-block np-daily-weather">
      <h4 className="np-daily-block-title">오늘의 날씨</h4>
      <div className="np-daily-weather-main">
        <div className="np-daily-weather-temp">{formatTemp(w.temperature_c)}</div>
        <div className="np-daily-weather-meta">
          <strong>{w.condition}</strong>
          <span>{w.location}</span>
        </div>
      </div>
      <dl className="np-daily-weather-stats">
        <div>
          <dt>최고</dt>
          <dd>{formatTemp(w.high_c)}</dd>
        </div>
        <div>
          <dt>최저</dt>
          <dd>{formatTemp(w.low_c)}</dd>
        </div>
        <div>
          <dt>체감</dt>
          <dd>{formatTemp(w.feels_like_c)}</dd>
        </div>
        <div>
          <dt>습도</dt>
          <dd>{w.humidity_pct != null ? `${w.humidity_pct}%` : '—'}</dd>
        </div>
      </dl>
    </div>
  )
}

export function DailyCorner({ editionSlug }: { editionSlug?: string }) {
  const edition = getDailyEdition(new Date(), editionSlug)

  return (
    <section className="np-daily-corner" aria-label="MINT 휴식판">
      <div className="np-section-label">MINT 휴식판</div>

      <div className="np-daily-block np-daily-fact">
        <h4 className="np-daily-block-title">오늘의 상식</h4>
        <p className="np-daily-text">{edition.fact.body}</p>
      </div>

      <div className="np-daily-block np-daily-term">
        <h4 className="np-daily-block-title">오늘의 용어</h4>
        <p className="np-daily-term-word">{edition.term.word}</p>
        <p className="np-daily-term-body">{edition.term.body}</p>
      </div>

      <DailyQuizBlock key={edition.quiz.question} quiz={edition.quiz} />

      <DailyWeatherBlock />

      <p className="np-daily-foot">{edition.foot}</p>
    </section>
  )
}
