import type { Keyword, NewsCategory } from '../types/personalization'

const GENERAL_NAMES = new Set(['general', '일반'])
const COMMUNITY_RE = /커뮤니티/

export function isGeneralCategoryName(name: string | null | undefined): boolean {
  const n = (name ?? '').trim()
  if (!n) return false
  return GENERAL_NAMES.has(n.toLowerCase())
}

export function isCommunityCategoryName(name: string | null | undefined): boolean {
  return COMMUNITY_RE.test(name ?? '')
}

export function isHiddenNewsCategory(category: Pick<NewsCategory, 'name'>): boolean {
  return isGeneralCategoryName(category.name) || isCommunityCategoryName(category.name)
}

export function visibleNewsCategories(
  categories: NewsCategory[],
  editionId: string,
): NewsCategory[] {
  return categories.filter((item) => {
    if (isHiddenNewsCategory(item)) return false
    if (!editionId) return true
    return item.edition_id === editionId
  })
}

export function rankNewsCategories(items: NewsCategory[]): NewsCategory[] {
  return [...items].sort((a, b) => {
    const aDiscovered = a.is_discovered ? 1 : 0
    const bDiscovered = b.is_discovered ? 1 : 0
    if (aDiscovered !== bDiscovered) return aDiscovered - bDiscovered
    const aFeatured = a.is_featured ? 0 : 1
    const bFeatured = b.is_featured ? 0 : 1
    if (aFeatured !== bFeatured) return aFeatured - bFeatured
    const posts = (b.post_count ?? 0) - (a.post_count ?? 0)
    if (posts !== 0) return posts
    return a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'ko')
  })
}

export function keywordsForEdition(keywords: Keyword[], editionId: string): Keyword[] {
  if (!editionId) return keywords.filter((item) => item.status !== 'archived')
  return keywords.filter(
    (item) => item.status !== 'archived' && item.edition_id === editionId,
  )
}

export function rankNewsKeywords(items: Keyword[]): Keyword[] {
  return [...items].sort((a, b) => {
    const aFeatured = a.is_featured ? 0 : 1
    const bFeatured = b.is_featured ? 0 : 1
    if (aFeatured !== bFeatured) return aFeatured - bFeatured
    const aCurated = a.is_curated ? 0 : 1
    const bCurated = b.is_curated ? 0 : 1
    if (aCurated !== bCurated) return aCurated - bCurated
    return a.name.localeCompare(b.name, 'ko')
  })
}

export function displayCategoryName(name: string | null | undefined): string | null {
  if (!name || isGeneralCategoryName(name) || isCommunityCategoryName(name)) return null
  return name
}
