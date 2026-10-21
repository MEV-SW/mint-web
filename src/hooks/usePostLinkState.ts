import { useLocation } from 'react-router-dom'
import { postLinkState } from '../utils/postBack'

/** #129: `state` for links to /posts/:id so the article page can return here. */
export function usePostLinkState(): { from: string } {
  return postLinkState(useLocation())
}
