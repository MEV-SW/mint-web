import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listOrgApiTokens, revokeOrgApiToken, type OrgApiToken } from '../../api/apiTokenApi'
import { apiErrorDetail } from '../../utils/apiError'
import { formatDate, formatShortDateTime } from '../../utils/date'
import { Btn } from '../common/Btn'
import { LoadErrorBanner } from '../common/PageStates'
import { useToast } from '../common/Toast'
import { useConfirm } from '../common/useConfirm'

/** mint-server#225 — 관리 › 계정 › API 토큰: every member's token (metadata only), revoke for offboarding. */
export function OrgApiTokens() {
  const toast = useToast()
  const confirm = useConfirm()
  const qc = useQueryClient()
  const tokens = useQuery({ queryKey: ['org-api-tokens'], queryFn: listOrgApiTokens })
  const revoke = useMutation({
    mutationFn: (id: string) => revokeOrgApiToken(id),
    onSuccess: () => {
      toast('토큰을 폐기했습니다.')
      void qc.invalidateQueries({ queryKey: ['org-api-tokens'] })
    },
    onError: (e) => toast(apiErrorDetail(e) || '폐기하지 못했습니다.', 'err'),
  })

  async function requestRevoke(token: OrgApiToken) {
    const ok = await confirm({
      title: `${token.user_name}님의 「${token.name}」 토큰을 폐기할까요?`,
      body: '이 토큰으로 연결한 AI 도구는 바로 MINT를 읽지 못합니다. 되돌릴 수 없습니다.',
      confirmLabel: '폐기',
      danger: true,
    })
    if (ok) revoke.mutate(token.id)
  }

  if (tokens.isError) {
    return (
      <LoadErrorBanner
        title="API 토큰 목록을 불러오지 못했습니다"
        error={tokens.error}
        failedAt={tokens.errorUpdatedAt}
        onRetry={() => void tokens.refetch()}
        retrying={tokens.isFetching}
      />
    )
  }
  const rows = tokens.data ?? []
  return (
    <section aria-label="API 토큰">
      <p className="permission-matrix-note">
        구성원이 AI 연결(MCP)용으로 만든 토큰입니다. 토큰 원문은 저장하지 않습니다. 퇴사·분실 때 폐기하세요.
      </p>
      {rows.length === 0 ? (
        <p className="aic-hint">{tokens.isLoading ? '불러오는 중…' : '만든 토큰이 없습니다.'}</p>
      ) : (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>구성원</th>
                <th>이름</th>
                <th>토큰</th>
                <th>만료</th>
                <th>마지막 사용</th>
                <th>상태</th>
                <th aria-label="동작" />
              </tr>
            </thead>
            <tbody>
              {rows.map((token) => (
                <tr key={token.id}>
                  <td>{token.user_name}</td>
                  <td>{token.name}</td>
                  <td className="mono">{token.token_prefix}…</td>
                  <td>{formatDate(token.expires_at)}</td>
                  <td>{token.last_used_at ? formatShortDateTime(token.last_used_at) : '—'}</td>
                  <td>{token.revoked_at ? '폐기됨' : token.active ? '사용 중' : '만료됨'}</td>
                  <td>
                    {token.active && (
                      <Btn variant="outline" size="sm" disabled={revoke.isPending} onClick={() => void requestRevoke(token)}>
                        폐기
                      </Btn>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
