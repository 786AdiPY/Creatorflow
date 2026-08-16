import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { supabase } from '../../lib/supabase'
import { useJobPolling } from '../../hooks/useJobPolling'
import { JobStatusBadge } from '../../components/JobStatusBadge'
import type { Clip } from '../../types'

export function ClipsTab({ contentAssetId }: { contentAssetId: string | null }) {
  const [jobId, setJobId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: clips } = useQuery({
    queryKey: ['clips', contentAssetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clips')
        .select('*')
        .eq('content_asset_id', contentAssetId)
        .order('score', { ascending: false })
      if (error) throw error
      return data as Clip[]
    },
    enabled: !!contentAssetId,
  })

  const { data: job } = useJobPolling(jobId)

  const generate = useMutation({
    mutationFn: () => api.clips.generate(contentAssetId as string),
    onSuccess: (res) => setJobId(res.job_id),
  })

  if (job?.status === 'done') {
    queryClient.invalidateQueries({ queryKey: ['clips', contentAssetId] })
  }

  if (!contentAssetId) {
    return <p className="text-sm text-gray-500">Select a long-form content asset to find clip-worthy moments.</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
        >
          Find clips
        </button>
        {job && <JobStatusBadge status={job.status} />}
      </div>

      <div className="space-y-2">
        {clips?.map((clip) => (
          <div key={clip.id} className="flex items-center justify-between rounded-md border border-gray-200 px-4 py-2 dark:border-gray-800">
            <span className="text-sm">
              {(clip.start_ms / 1000).toFixed(1)}s – {(clip.end_ms / 1000).toFixed(1)}s
            </span>
            {clip.score != null && <span className="text-xs text-gray-500">score {clip.score.toFixed(2)}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
