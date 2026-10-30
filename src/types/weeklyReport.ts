/** mint-server#211 B1 — weekly report API shapes (`/api/v1/weekly-reports`). */

export type WeeklyGeneratedBy = 'ai' | 'none' | 'fallback'
export type WeeklySection = 'release' | 'policy' | 'major'

export interface WeeklyReportListItem {
  id: string
  edition_id: string
  week_start: string
  week_end: string
  title: string
  summary: string
  /** "none" = empty week, "fallback" = LLM failed, otherwise the report model. */
  model: string
  generated_by: WeeklyGeneratedBy
  edited: boolean
  generated_at: string
}

export interface WeeklyReportItem {
  post_id: string
  section: WeeklySection
  rank: number
  title: string
  line: string
  /** In the body; false = "그 밖에" (over the section limit unless an editor moved it). */
  shown: boolean
  /** Hidden by an editor. Only readers who can edit receive hidden items. */
  hidden: boolean
  source_name: string | null
  collected_at: string | null
}

export interface WeeklyReportSection {
  section: WeeklySection
  label: string
  items: WeeklyReportItem[]
  overflow_count: number
  hidden_count: number
}

export interface WeeklyReportDetail extends WeeklyReportListItem {
  organization_id: string
  sections: WeeklyReportSection[]
  daily_report_ids: string[]
  input_daily_count: number
  input_post_count: number
  edited_at: string | null
  edited_by_name: string | null
  prev_id: string | null
  next_id: string | null
  can_edit: boolean
  updated_at: string
}

export interface WeeklyReportItemUpdate {
  post_id: string
  line?: string
  hidden?: boolean
  shown?: boolean
}

export interface WeeklyReportUpdate {
  title?: string
  summary?: string
  items?: WeeklyReportItemUpdate[]
  expected_updated_at: string
}

export interface WeeklyEditItemState {
  post_id: string
  post_title: string
  line: string
  hidden: boolean
  shown: boolean
}

export interface WeeklyEditSnapshot {
  title?: string
  summary?: string
  items?: WeeklyEditItemState[]
}

export interface WeeklyReportEdit {
  id: string
  edited_by_user_id: string | null
  edited_by_name: string | null
  edited_at: string
  before: WeeklyEditSnapshot
  after: WeeklyEditSnapshot
}
