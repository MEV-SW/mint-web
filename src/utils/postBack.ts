/** #129: where the article page's back link goes, and what it says. */
export type PostBackTarget = { to: string; label: string }

const LABELS: [RegExp, string][] = [
  [/^\/$/, '1면으로'],
  [/^\/news(\/|$)/, '뉴스로'],
  [/^\/issues(\/|$)/, '이슈로'],
  [/^\/reports(\/|$)/, '리포트로'],
  [/^\/topics(\/|$)/, '토픽으로'],
  [/^\/admin\/discovery(\/|$)/, '탐문 후보로'],
]

export function backLabelFor(path: string): string {
  const pathname = path.split(/[?#]/)[0] || '/'
  return LABELS.find(([re]) => re.test(pathname))?.[1] ?? '이전 화면으로'
}

/** State to put on an article link so the article page can send the reader back here. */
export function postLinkState(location: { pathname: string; search: string }): { from: string } {
  return { from: `${location.pathname}${location.search}` }
}
