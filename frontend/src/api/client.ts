import { supabase } from '../lib/supabase'
import type { Job } from '../types'

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

async function callFunction<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...(await authHeader()),
    ...(options.headers ?? {}),
  }
  const res = await fetch(`${FUNCTIONS_URL}/${path}`, { ...options, headers })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`${path} failed: ${res.status} ${body}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  content: {
    create: (payload: { source_type: 'upload' | 'generated'; storage_url: string }) =>
      callFunction<{ id: string }>('content', { method: 'POST', body: JSON.stringify(payload) }),
    get: (id: string) => callFunction(`content/${id}`),
  },
  thumbnails: {
    generate: (contentAssetId: string, stylePrompt?: string) =>
      callFunction<{ job_id: string }>('thumbnails-generate', {
        method: 'POST',
        body: JSON.stringify({ content_asset_id: contentAssetId, style_prompt: stylePrompt }),
      }),
    list: (contentAssetId: string) => callFunction(`thumbnails/${contentAssetId}`),
  },
  metadata: {
    generate: (contentAssetId: string, platform: string) =>
      callFunction<{ job_id: string }>('metadata-generate', {
        method: 'POST',
        body: JSON.stringify({ content_asset_id: contentAssetId, platform }),
      }),
    update: (id: string, patch: Record<string, unknown>) =>
      callFunction(`metadata/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  },
  schedule: {
    create: (payload: {
      content_asset_id: string
      connected_account_id: string
      metadata_draft_id: string
      thumbnail_id?: string
      scheduled_time: string
    }) => callFunction('schedule', { method: 'POST', body: JSON.stringify(payload) }),
    list: (range?: string) => callFunction(`schedule${range ? `?range=${range}` : ''}`),
    remove: (id: string) => callFunction(`schedule/${id}`, { method: 'DELETE' }),
  },
  analytics: {
    forPost: (scheduledPostId: string) => callFunction(`analytics/${scheduledPostId}`),
    summary: (range?: string) => callFunction(`analytics-summary${range ? `?range=${range}` : ''}`),
  },
  comments: {
    list: (scheduledPostId: string) => callFunction(`comments/${scheduledPostId}`),
    action: (id: string, action: 'hide' | 'flag' | 'approve') =>
      callFunction(`comments/${id}/action`, { method: 'POST', body: JSON.stringify({ action }) }),
  },
  clips: {
    generate: (contentAssetId: string) =>
      callFunction<{ job_id: string }>('clips-generate', {
        method: 'POST',
        body: JSON.stringify({ content_asset_id: contentAssetId }),
      }),
    list: (contentAssetId: string) => callFunction(`clips/${contentAssetId}`),
  },
  jobs: {
    get: (id: string) => callFunction<Job>(`jobs/${id}`),
  },
}
