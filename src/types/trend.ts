export interface TrendDailyPoint {
  date: string
  post_count: number
}

export interface TrendCategoryShare {
  category_id: string | null
  name: string
  post_count: number
  share_percent: number
  change_percent: number | null
}

export interface TrendRepresentativePost {
  post_id: string
  title: string
  url: string | null
  published_at: string | null
}

export type TrendEntityType = 'model' | 'product' | 'tool' | 'feature' | 'practice'

export interface TrendRankingItem {
  rank: number
  name: string
  /** #202: distinct (source, day) mentions; the screen shows post_count/source_count instead. */
  mention_count: number
  post_count?: number
  source_count?: number
  change_percent: number | null
  is_new: boolean
  representative_posts: TrendRepresentativePost[]
  highlight: string | null
  /** #203 entity fields (null for default-profile editions). */
  entity_type?: TrendEntityType | null
  family?: string | null
  latest_version?: string | null
  has_release?: boolean
}

export interface TrendNewItem {
  name: string
  first_seen_at: string
  source_count: number
  mention_count: number
  post_count?: number
  headline: string
  description: string
  entity_type?: TrendEntityType | null
  family?: string | null
}

/** #203: one release bundle — an entity's releases from one source in the range. */
export interface TrendReleaseItem {
  name: string
  family: string | null
  entity_type: TrendEntityType | null
  latest_version: string
  is_prerelease: boolean
  version_count: number
  versions: string[]
  first_released_at: string
  last_released_at: string
  is_new_version: boolean
  official: boolean
  source_name: string | null
  post_count: number
  summary: string | null
  representative_post: TrendRepresentativePost
}

export interface TrendRead {
  edition_id: string
  range_days: 7 | 30 | 90
  aggregation_basis: 'deduplicated_posts' | 'source_days'
  refresh_interval: '1h'
  generated_at: string
  source_count: number
  post_count: number
  mention_volume: {
    daily: TrendDailyPoint[]
    categories: TrendCategoryShare[]
  }
  ranking: TrendRankingItem[]
  new_items: TrendNewItem[]
  /** #203; older responses omit it (treated as []). */
  releases?: TrendReleaseItem[]
}
