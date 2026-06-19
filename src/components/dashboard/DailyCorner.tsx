import { useState } from 'react'
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

export function DailyCorner() {
  const edition = getDailyEdition(new Date())

  return (
    <section className="np-daily-corner" aria-label="MINT 휴식란">
      <div className="np-daily-corner-title">MINT 휴식란</div>

      <div className="np-daily-block np-daily-fact">
        <h4 className="np-daily-block-title">오늘의 상식</h4>
        <p className="np-daily-text">{edition.fact.body}</p>
      </div>

      <div className="np-daily-block np-daily-term">
        <h4 className="np-daily-block-title">오늘의 용어</h4>
        <p className="np-daily-term-word">{edition.term.word}</p>
        <p className="np-daily-term-body">{edition.term.body}</p>
      </div>

      <DailyQuizBlock quiz={edition.quiz} />

      <p className="np-daily-foot">매일 바뀌는 MINT 휴식란 · EV 업무 속 짧은 숨</p>
    </section>
  )
}
