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
    return <p className="muted">Select a content asset to generate metadata.</p>
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div className="row">
        <select className="select" style={{ width: 'auto' }} value={platform} onChange={(e) => setPlatform(e.target.value as Platform)}>
          <option value="youtube">YouTube</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
        </select>
        <button className="btn btn--primary" onClick={() => generate.mutate()} disabled={generate.isPending}>
          Generate metadata
        </button>
        {job && <JobStatusBadge status={job.status} />}
      </div>

      <div className="stack">
        <input
          className="input"
          placeholder="Title"
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        />
        <textarea
          className="textarea"
          placeholder="Description"
          rows={4}
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        />
        <input
          className="input"
          placeholder="Tags (comma separated)"
          value={draft.tags}
          onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
        />
      </div>
    </div>
  )
}
