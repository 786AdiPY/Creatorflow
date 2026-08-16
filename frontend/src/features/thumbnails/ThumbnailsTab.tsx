import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { supabase } from '../../lib/supabase'
import { useJobPolling } from '../../hooks/useJobPolling'
import { JobStatusBadge } from '../../components/JobStatusBadge'
import type { Thumbnail } from '../../types'

export function ThumbnailsTab({ contentAssetId }: { contentAssetId: string | null }) {
  const [jobId, setJobId] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: variants } = useQuery({
    queryKey: ['thumbnails', contentAssetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('thumbnails')
        .select('*')
        .eq('content_asset_id', contentAssetId)
      if (error) throw error
      return data as Thumbnail[]
    },
    enabled: !!contentAssetId,
  })

  const { data: job } = useJobPolling(jobId)

  const generate = useMutation({
    mutationFn: () => api.thumbnails.generate(contentAssetId as string),
    onSuccess: (res) => setJobId(res.job_id),
  })

  if (job?.status === 'done') {
    queryClient.invalidateQueries({ queryKey: ['thumbnails', contentAssetId] })
  }

  if (!contentAssetId) {
    return <p className="muted">Select a content asset to generate thumbnails.</p>
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div className="row">
        <button
          className="btn btn--primary"
          onClick={() => generate.mutate()}
          disabled={generate.isPending || (!!job && job.status !== 'done' && job.status !== 'failed')}
        >
          Generate variants
        </button>
        {job && <JobStatusBadge status={job.status} />}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {variants?.map((variant) => (
          <button
            key={variant.id}
            onClick={() => setSelected(variant.id)}
            className="overflow-hidden rounded-lg"
            style={{
              border: `2px solid ${selected === variant.id ? 'var(--color-primary)' : 'transparent'}`,
            }}
          >
            <img src={variant.storage_url} alt={variant.variant_label} className="aspect-video w-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  )
}
