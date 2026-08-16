import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '../../api/client'
import { useJobPolling } from '../../hooks/useJobPolling'
import { JobStatusBadge } from '../../components/JobStatusBadge'
import type { Platform } from '../../types'

export function MetadataTab({ contentAssetId }: { contentAssetId: string | null }) {
  const [platform, setPlatform] = useState<Platform>('youtube')
  const [jobId, setJobId] = useState<string | null>(null)
  const [draft, setDraft] = useState({ title: '', description: '', tags: '' })

  const { data: job } = useJobPolling(jobId)

  const generate = useMutation({
    mutationFn: () => api.metadata.generate(contentAssetId as string, platform),
    onSuccess: (res) => setJobId(res.job_id),
  })

  if (!contentAssetId) {
    return <p className="text-sm text-gray-500">Select a content asset to generate metadata.</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700"
          value={platform}
          onChange={(e) => setPlatform(e.target.value as Platform)}
        >
          <option value="youtube">YouTube</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
        </select>
        <button
          className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
        >
          Generate metadata
        </button>
        {job && <JobStatusBadge status={job.status} />}
      </div>

      <div className="space-y-2">
        <input
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
          placeholder="Title"
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        />
        <textarea
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
          placeholder="Description"
          rows={4}
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        />
        <input
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
          placeholder="Tags (comma separated)"
          value={draft.tags}
          onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
        />
      </div>
    </div>
  )
}
