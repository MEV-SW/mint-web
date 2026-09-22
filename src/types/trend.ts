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

export interface TrendRankingItem {
  rank: number
  name: string
  mention_count: number
  change_percent: number | null
  is_new: boolean
}

export interface TrendNewItem {
  name: string
  first_seen_at: string
  source_count: number
  mention_count: number
  headline: string
  description: string
}

export interface TrendRead {
  edition_id: string
  range_days: 7 | 30 | 90
  aggregation_basis: 'deduplicated_posts'
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
}
