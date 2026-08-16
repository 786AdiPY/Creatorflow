// Thin client for the Python backend (backend/) — the operations that
// need a server-side secret (OpenRouter) or a mocked external call (publish).
// Everything is synchronous: no job queue, the endpoint returns the finished row.
import { API_URL } from './config';

async function call<T>(path: string, options: RequestInit = {}): Promise<T> {
  const base = API_URL.replace(/\/+$/, '');
  const sub = path.replace(/^\/+/, '');
  const url = base ? `${base}/${sub}` : `/${sub}`;
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${path} failed: ${res.status} ${body}`);
  }
  return res.json() as Promise<T>;
}

export interface Thumbnail {
  id: string;
  storage_url: string;
  variant_label: string;
}

export interface MetadataDraft {
  id: string;
  title: string;
  description: string;
  tags: string[];
}

export interface Clip {
  id: string;
  start_ms: number;
  end_ms: number;
  score: number | null;
}

export interface ScheduledPost {
  id: string;
  status: 'pending' | 'posted' | 'failed';
  platform_post_id: string | null;
}

export const api = {
  metadata: {
    generate: (contentAssetId: string, platform: string) =>
      call<MetadataDraft>('metadata/generate', {
        method: 'POST',
        body: JSON.stringify({ content_asset_id: contentAssetId, platform }),
      }),
  },
  thumbnails: {
    generate: (contentAssetId: string) =>
      call<Thumbnail[]>('thumbnails/generate', {
        method: 'POST',
        body: JSON.stringify({ content_asset_id: contentAssetId }),
      }),
  },
  clips: {
    generate: (contentAssetId: string) =>
      call<Clip>('clips/generate', {
        method: 'POST',
        body: JSON.stringify({ content_asset_id: contentAssetId }),
      }),
  },
  publish: {
    now: (scheduledPostId: string) =>
      call<ScheduledPost>('publish', {
        method: 'POST',
        body: JSON.stringify({ scheduled_post_id: scheduledPostId }),
      }),
  },
};
