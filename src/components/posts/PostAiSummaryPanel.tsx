import { AiBadge } from '../common/Badges'
import { Btn } from '../common/Btn'
import type { AIOutput } from '../../types/post'

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
        {ai && <AiBadge />}
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
            <p className="post-ai-meta">
              {ai.model} · confidence {ai.confidence ?? '-'}
            </p>
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
