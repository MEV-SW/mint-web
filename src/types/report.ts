import type { Importance, Post } from './post'

export interface DailyReport {
  id: string
  organization_id: string
  edition_id?: string | null
  report_date: string
  title: string
  summary: string
  key_changes: KeyChange[] | null
  risks: string[] | null
  action_items: string[] | null
  model: string
  slack_sent: boolean
  illustration_url: string | null
  created_at: string
  updated_at: string
}

export interface KeyChange {
  title: string
  description: string
  related_post_ids?: string[]
  importance?: Importance
}

export interface DailyReportItem {
  id: string
  post_id: string
  reason: string | null
  importance: Importance
  post?: Post | null
}

export interface DailyReportDetail extends DailyReport {
  items: DailyReportItem[]
}
