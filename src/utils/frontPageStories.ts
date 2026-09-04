export const FRONT_MAJOR_NEWS_COUNT = 7

/** Same story slice MintFrontPage renders as hero + secondary + 주요 뉴스. */
export function sliceFrontPageStories<T>(stories: T[]): {
  hero: T | undefined
  secondary: T[]
  list: T[]
  deck: T[]
} {
  const hero = stories[0]
  const secondary = stories.slice(1, 3)
  const list = hero
    ? stories.slice(3, 3 + FRONT_MAJOR_NEWS_COUNT)
    : stories.slice(0, FRONT_MAJOR_NEWS_COUNT)
  const deck = hero ? [hero, ...secondary, ...list] : [...list]
  return { hero, secondary, list, deck }
}
