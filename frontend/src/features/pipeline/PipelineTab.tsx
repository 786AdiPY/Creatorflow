import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { JobStatusBadge } from '../../components/JobStatusBadge'
import type { JobStatus, ContentAsset, Thumbnail, MetadataDraft, ScheduledPost, AnalyticsSnapshot } from '../../types'

// Mirrors the pipeline diagram: Upload -> Analyze -> Generate -> Metadata + Thumbnail
// -> Schedule/Publish -> Analytics, with Supabase as the results store behind every
// stage. Reads existing tables directly — no separate orchestrator, the "workflow" is
// just the six modules' own data landing in order.
const STAGES = [
  { id: 'upload', label: 'Upload' },
  { id: 'analyze', label: 'Analyze' },
  { id: 'generate', label: 'Generate' },
  { id: 'metadata_thumbnail', label: 'Metadata + Thumbnail' },
  { id: 'schedule', label: 'Schedule / Publish' },
  { id: 'analytics', label: 'Analytics' },
] as const

export function PipelineTab({ contentAssetId }: { contentAssetId: string | null }) {
  const { data: asset } = useQuery({
    queryKey: ['pipeline-asset', contentAssetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_assets')
        .select('*')
        .eq('id', contentAssetId)
        .single()
      if (error) throw error
      return data as ContentAsset
    },
    enabled: !!contentAssetId,
  })

  const { data: thumbnails } = useQuery({
    queryKey: ['pipeline-thumbnails', contentAssetId],
    queryFn: async () => {
      const { data, error } = await supabase.from('thumbnails').select('*').eq('content_asset_id', contentAssetId)
      if (error) throw error
      return data as Thumbnail[]
    },
    enabled: !!contentAssetId,
  })

  const { data: metadataDrafts } = useQuery({
    queryKey: ['pipeline-metadata', contentAssetId],
    queryFn: async () => {
      const { data, error } = await supabase.from('metadata_drafts').select('*').eq('content_asset_id', contentAssetId)
      if (error) throw error
      return data as MetadataDraft[]
    },
    enabled: !!contentAssetId,
  })

  const { data: scheduledPosts } = useQuery({
    queryKey: ['pipeline-scheduled', contentAssetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_posts')
        .select('*')
        .eq('content_asset_id', contentAssetId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as ScheduledPost[]
    },
    enabled: !!contentAssetId,
  })

  const latestPost = scheduledPosts?.[0]

  const { data: analytics } = useQuery({
    queryKey: ['pipeline-analytics', latestPost?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analytics_snapshots')
        .select('*')
        .eq('scheduled_post_id', latestPost?.id)
      if (error) throw error
      return data as AnalyticsSnapshot[]
    },
    enabled: !!latestPost?.id,
  })

  if (!contentAssetId) {
    return <p className="muted">Select a content asset to see it move through the pipeline.</p>
  }

  const hasThumbnail = (thumbnails?.length ?? 0) > 0
  const hasMetadata = (metadataDrafts?.length ?? 0) > 0

  const status: Record<(typeof STAGES)[number]['id'], { status: JobStatus; detail: string }> = {
    upload: asset
      ? { status: 'done', detail: asset.storage_url.split('/').pop() ?? asset.id }
      : { status: 'pending', detail: 'waiting for an asset' },
    analyze: !asset
      ? { status: 'pending', detail: 'waiting on upload' }
      : asset.status === 'ready'
        ? { status: 'done', detail: 'ready' }
        : asset.status === 'failed'
          ? { status: 'failed', detail: 'analysis failed' }
          : { status: 'processing', detail: 'processing' },
    generate: hasThumbnail || hasMetadata
      ? { status: 'done', detail: `${thumbnails?.length ?? 0} thumbnail variant(s), ${metadataDrafts?.length ?? 0} metadata draft(s)` }
      : { status: 'pending', detail: 'not started' },
    metadata_thumbnail: hasThumbnail && hasMetadata
      ? { status: 'done', detail: 'thumbnail + metadata ready' }
      : hasThumbnail || hasMetadata
        ? { status: 'processing', detail: hasThumbnail ? 'thumbnail ready, metadata pending' : 'metadata ready, thumbnail pending' }
        : { status: 'pending', detail: 'not started' },
    schedule: !latestPost
      ? { status: 'pending', detail: 'not scheduled' }
      : latestPost.status === 'posted'
        ? { status: 'done', detail: `published ${new Date(latestPost.scheduled_time).toLocaleString()}` }
        : latestPost.status === 'failed'
          ? { status: 'failed', detail: 'publish failed' }
          : { status: 'processing', detail: `queued for ${new Date(latestPost.scheduled_time).toLocaleString()}` },
    analytics: (analytics?.length ?? 0) > 0
      ? { status: 'done', detail: `${analytics!.length} snapshot(s) captured` }
      : { status: 'pending', detail: 'no data yet' },
  }

  return (
    <div className="card">
      <ol className="pipeline-stepper">
        {STAGES.map((stage) => {
          const s = status[stage.id]
          return (
            <li key={stage.id} className={`pipeline-step pipeline-step--${s.status}`}>
              <span className="pipeline-step__dot" aria-hidden="true" />
              <div className="pipeline-step__body">
                <div className="pipeline-step__head">
                  <span className="pipeline-step__label">{stage.label}</span>
                  <JobStatusBadge status={s.status} />
                </div>
                <p className="pipeline-step__detail mono">{s.detail}</p>
              </div>
            </li>
          )
        })}
      </ol>
      <p className="muted pipeline-footnote">Every stage above lands in Supabase — this view just reads the same tables the dashboard's other tabs write to.</p>
    </div>
  )
}
