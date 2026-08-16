export type Platform = 'youtube' | 'instagram' | 'tiktok'

export type JobStatus = 'pending' | 'processing' | 'done' | 'failed'

export interface Job {
  id: string
  user_id: string
  job_type: string
  status: JobStatus
  progress: number
  error: string | null
  result_ref: string | null
  created_at: string
  updated_at: string
}

export interface ContentAsset {
  id: string
  user_id: string
  source_type: 'upload' | 'generated'
  storage_url: string
  duration_seconds: number | null
  status: 'processing' | 'ready' | 'failed'
  created_at: string
}

export interface ConnectedAccount {
  id: string
  user_id: string
  platform: Platform
  platform_account_id: string
  created_at: string
}

export interface Thumbnail {
  id: string
  content_asset_id: string
  storage_url: string
  variant_label: string
  generation_params: Record<string, unknown>
  created_at: string
}

export interface MetadataDraft {
  id: string
  content_asset_id: string
  platform: Platform
  title: string
  description: string
  tags: string[]
  seo_score: number | null
  generated_by: 'ai' | 'manual'
  created_at: string
}

export interface ScheduledPost {
  id: string
  content_asset_id: string
  connected_account_id: string
  metadata_draft_id: string
  thumbnail_id: string | null
  scheduled_time: string
  status: 'pending' | 'posted' | 'failed'
  platform_post_id: string | null
  created_at: string
}

export interface AnalyticsSnapshot {
  id: string
  scheduled_post_id: string
  platform: Platform
  fetched_at: string
  metrics: {
    views?: number
    likes?: number
    comments?: number
    retention?: number
    [key: string]: unknown
  }
}

export interface Comment {
  id: string
  scheduled_post_id: string
  platform_comment_id: string
  author: string
  text: string
  sentiment: string | null
  moderation_action: 'hidden' | 'flagged' | 'approved' | null
  fetched_at: string
}

export interface Clip {
  id: string
  content_asset_id: string
  start_ms: number
  end_ms: number
  storage_url: string
  score: number | null
  status: JobStatus
  created_at: string
}
