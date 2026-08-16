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
    return <p className="text-sm text-gray-500">Select a content asset to generate thumbnails.</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
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
            className={`overflow-hidden rounded-lg border-2 ${
              selected === variant.id ? 'border-purple-600' : 'border-transparent'
            }`}
          >
            <img src={variant.storage_url} alt={variant.variant_label} className="aspect-video w-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  )
}
