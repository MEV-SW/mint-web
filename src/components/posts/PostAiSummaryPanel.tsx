import { AiBadge } from '../common/Badges'
import { Btn } from '../common/Btn'
import type { AIOutput } from '../../types/post'
import { confidenceGrade } from '../../utils/aiConfidence'

interface PostAiSummaryPanelProps {
  ai: AIOutput | null | undefined
  isDiscovery: boolean
  summarizing?: boolean
  onSummarize?: () => void
  compact?: boolean
}

export function PostAiSummaryPanel({
  ai,
  isDiscovery,
  summarizing,
  onSummarize,
  compact,
}: PostAiSummaryPanelProps) {
  return (
    <div className={`post-ai-panel${compact ? ' compact' : ''}`}>
      <div className="post-split-head">
        <span>AI 요약</span>
        {ai && <AiBadge label="AI 생성" />}
      </div>
      <div className="post-split-summary">
        {ai ? (
          <>
            <p className="post-ai-summary">{ai.summary}</p>
            {!isDiscovery && ai.impact && (
              <div className="post-ai-block">
                <h4>영향</h4>
                <p>{ai.impact}</p>
              </div>
            )}
            {!isDiscovery && ai.action_items && ai.action_items.length > 0 && (
              <div className="post-ai-block">
                <h4>액션 아이템</h4>
                <ul>
                  {ai.action_items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {/* #129: no model id for readers; confidence as a Korean grade. */}
            {confidenceGrade(ai.confidence) && (
              <p className="post-ai-meta">신뢰도 {confidenceGrade(ai.confidence)}</p>
            )}
          </>
        ) : (
          <div className="post-ai-empty">
            <p>AI 요약이 없습니다.</p>
            {onSummarize && (
              <Btn variant="soft" icon="sparkles" onClick={onSummarize} disabled={summarizing}>
                {summarizing ? '요약 생성 중…' : 'AI 요약 생성'}
              </Btn>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
