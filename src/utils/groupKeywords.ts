import type { Keyword, NewsCategory } from '../types/personalization'

export interface KeywordGroup {
  id: string
  name: string
  sortOrder: number
  keywords: Keyword[]
}

export function groupKeywords(
  keywords: Keyword[],
  categories: NewsCategory[],
): KeywordGroup[] {
  const personal: Keyword[] = []
  const byCategory = new Map<string, Keyword[]>()

  for (const keyword of keywords) {
    if (keyword.scope === 'personal') {
      personal.push(keyword)
      continue
    }
    const key = keyword.category_id ?? '__uncategorized__'
    const bucket = byCategory.get(key) ?? []
    bucket.push(keyword)
    byCategory.set(key, bucket)
  }

  const groups: KeywordGroup[] = []
  const sortedCategories = [...categories].sort(
    (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'ko'),
  )

  for (const category of sortedCategories) {
    const items = byCategory.get(category.id)
    if (!items?.length) continue
    groups.push({
      id: category.id,
      name: category.name,
      sortOrder: category.sort_order,
      keywords: items,
    })
    byCategory.delete(category.id)
  }

  const uncategorized = byCategory.get('__uncategorized__')
  if (uncategorized?.length) {
    groups.push({
      id: '__uncategorized__',
      name: '미분류',
      sortOrder: 9999,
      keywords: uncategorized,
    })
  }

  if (personal.length) {
    groups.push({
      id: '__personal__',
      name: '나만의 키워드',
      sortOrder: 10000,
      keywords: personal,
    })
  }

  return groups
}
