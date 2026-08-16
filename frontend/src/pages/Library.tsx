// Library — where the six modules' actual output lives: pick a thumbnail,
// edit metadata, review clips, schedule/publish, moderate comments, read
// analytics. Studio orchestrates a run; this is where you manage the result.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  CalendarClock,
  Image,
  MessageSquare,
  Scissors,
  Tags,
  Upload,
  Workflow,
} from 'lucide-react';

import { AssetPicker } from '../components/AssetPicker';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import { uploadContentAsset } from '../lib/assets';
import Studio from './Studio';
import './Library.css';

const TABS = [
  { id: 'workflow', label: 'Workflow', icon: Workflow },
  { id: 'thumbnails', label: 'Thumbnails', icon: Image },
  { id: 'metadata', label: 'Metadata', icon: Tags },
  { id: 'clips', label: 'Clips', icon: Scissors },
  { id: 'schedule', label: 'Schedule', icon: CalendarClock },
  { id: 'moderation', label: 'Moderation', icon: MessageSquare },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function Library() {
  const [activeTab, setActiveTab] = useState<TabId>('workflow');
  const [contentAssetId, setContentAssetId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const asset = await uploadContentAsset(file);
      setContentAssetId(asset.id);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      alert(`Upload failed: ${(err as Error).message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="lib">
      <header className="lib-top">
        <Link to="/" className="lib-brand" aria-label="Back to CreatorFlow">
          <svg viewBox="0 0 32 32" className="lp-mark" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="currentColor" opacity="0.06" />
            <path d="M11 9v14l12-7-12-7Z" fill="currentColor" className="lp-mark__play" />
          </svg>
          <h1>CreatorFlow</h1>
        </Link>
        <div className="lib-top__right">
          <AssetPicker value={contentAssetId} onChange={setContentAssetId} refreshKey={refreshKey} />
          <label className="lib-btn">
            <Upload size={14} />
            {uploading ? 'Uploading…' : 'Upload'}
            <input
              type="file"
              accept="video/*,image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
                e.target.value = '';
              }}
            />
          </label>
        </div>
      </header>

      <div className="lib-body">
        <nav className="lib-tabs">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`lib-tab ${activeTab === tab.id ? 'is-active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {activeTab === 'workflow' ? (
          <div className="lib-panel lib-panel--flush">
            <Studio contentAssetId={contentAssetId} />
          </div>
        ) : (
          <div className="lib-panel">
            {!contentAssetId ? (
              <p className="lib-empty">Upload or select a content asset to get started.</p>
            ) : (
              <>
                {activeTab === 'thumbnails' && <ThumbnailsPanel contentAssetId={contentAssetId} />}
                {activeTab === 'metadata' && <MetadataPanel contentAssetId={contentAssetId} />}
                {activeTab === 'clips' && <ClipsPanel contentAssetId={contentAssetId} />}
                {activeTab === 'schedule' && <SchedulePanel contentAssetId={contentAssetId} />}
                {activeTab === 'moderation' && <ModerationPanel contentAssetId={contentAssetId} />}
                {activeTab === 'analytics' && <AnalyticsPanel contentAssetId={contentAssetId} />}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── thumbnails ───────────────────────────────────────────────────────────
interface ThumbRow {
  id: string;
  storage_url: string;
  variant_label: string;
}

function ThumbnailsPanel({ contentAssetId }: { contentAssetId: string }) {
  const [thumbs, setThumbs] = useState<ThumbRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    supabase
      .from('thumbnails')
      .select('*')
      .eq('content_asset_id', contentAssetId)
      .order('created_at', { ascending: false })
      .then(({ data }) => setThumbs(data ?? []));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentAssetId]);

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      await api.thumbnails.generate(contentAssetId);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <div className="lib-panel__head">
        <h2>Thumbnails</h2>
        <button className="lib-btn lib-btn--solid" onClick={generate} disabled={generating}>
          {generating ? 'Generating…' : 'Generate variants'}
        </button>
      </div>
      {error && <p className="lib-empty">{error}</p>}
      {thumbs.length === 0 ? (
        <p className="lib-empty">No thumbnails yet — generate some variants above.</p>
      ) : (
        <div className="lib-grid">
          {thumbs.map((t) => (
            <div
              key={t.id}
              className={`lib-thumb ${selected === t.id ? 'is-selected' : ''}`}
              onClick={() => setSelected(t.id)}
            >
              <img src={t.storage_url} alt={t.variant_label} />
              <span>{t.variant_label}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ── metadata ─────────────────────────────────────────────────────────────
interface DraftRow {
  id: string;
  title: string;
  description: string;
  tags: string[];
}

function MetadataPanel({ contentAssetId }: { contentAssetId: string }) {
  const [platform, setPlatform] = useState('youtube');
  const [draft, setDraft] = useState<DraftRow | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = (p: string) =>
    supabase
      .from('metadata_drafts')
      .select('*')
      .eq('content_asset_id', contentAssetId)
      .eq('platform', p)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setDraft(data));

  useEffect(() => {
    load(platform);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentAssetId, platform]);

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const row = await api.metadata.generate(contentAssetId, platform);
      setDraft(row);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await supabase
        .from('metadata_drafts')
        .update({ title: draft.title, description: draft.description, tags: draft.tags })
        .eq('id', draft.id);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="lib-panel__head">
        <h2>Metadata</h2>
        <div className="lib-row">
          <select className="lib-select" value={platform} onChange={(e) => setPlatform(e.target.value)}>
            <option value="youtube">YouTube</option>
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
          </select>
          <button className="lib-btn lib-btn--solid" onClick={generate} disabled={generating}>
            {generating ? 'Generating…' : 'Generate'}
          </button>
        </div>
      </div>
      {error && <p className="lib-empty">{error}</p>}
      {!draft ? (
        <p className="lib-empty">No draft for {platform} yet — generate one above.</p>
      ) : (
        <div className="lib-card">
          <div className="lib-field">
            <span>Title</span>
            <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </div>
          <div className="lib-field">
            <span>Description</span>
            <textarea
              rows={5}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </div>
          <div className="lib-field">
            <span>Tags</span>
            <input
              value={draft.tags.join(', ')}
              onChange={(e) => setDraft({ ...draft, tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })}
            />
          </div>
          <button className="lib-btn lib-btn--solid" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save draft'}
          </button>
        </div>
      )}
    </>
  );
}

// ── clips ────────────────────────────────────────────────────────────────
interface ClipRow {
  id: string;
  start_ms: number;
  end_ms: number;
  score: number | null;
}

function ClipsPanel({ contentAssetId }: { contentAssetId: string }) {
  const [clips, setClips] = useState<ClipRow[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    supabase
      .from('clips')
      .select('*')
      .eq('content_asset_id', contentAssetId)
      .order('score', { ascending: false })
      .then(({ data }) => setClips(data ?? []));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentAssetId]);

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      await api.clips.generate(contentAssetId);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <div className="lib-panel__head">
        <h2>Clips</h2>
        <button className="lib-btn lib-btn--solid" onClick={generate} disabled={generating}>
          {generating ? 'Finding…' : 'Find clips'}
        </button>
      </div>
      {error && <p className="lib-empty">{error}</p>}
      {clips.length === 0 ? (
        <p className="lib-empty">No clips yet — find some clip-worthy moments above.</p>
      ) : (
        <div className="lib-table-wrap">
          <table className="lib-table">
            <thead>
              <tr>
                <th>Start</th>
                <th>End</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {clips.map((c) => (
                <tr key={c.id}>
                  <td>{(c.start_ms / 1000).toFixed(1)}s</td>
                  <td>{(c.end_ms / 1000).toFixed(1)}s</td>
                  <td>{c.score != null ? c.score.toFixed(2) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ── schedule ─────────────────────────────────────────────────────────────
interface PostRow {
  id: string;
  status: 'pending' | 'posted' | 'failed';
  scheduled_time: string;
  connected_accounts: { platform: string } | null;
}

function SchedulePanel({ contentAssetId }: { contentAssetId: string }) {
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [platform, setPlatform] = useState('youtube');
  const [when, setWhen] = useState('');
  const [creating, setCreating] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    supabase
      .from('scheduled_posts')
      .select('id, status, scheduled_time, connected_accounts(platform)')
      .eq('content_asset_id', contentAssetId)
      .order('scheduled_time', { ascending: false })
      .then(({ data }) => setPosts((data as unknown as PostRow[]) ?? []));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentAssetId]);

  const create = async () => {
    setCreating(true);
    setError(null);
    try {
      const { data: draft } = await supabase
        .from('metadata_drafts')
        .select('id')
        .eq('content_asset_id', contentAssetId)
        .eq('platform', platform)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!draft) throw new Error(`No metadata draft for ${platform} yet — generate one in the Metadata tab first.`);

      const { data: thumb } = await supabase
        .from('thumbnails')
        .select('id')
        .eq('content_asset_id', contentAssetId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let { data: account } = await supabase
        .from('connected_accounts')
        .select('id')
        .eq('platform', platform)
        .eq('platform_account_id', 'studio-demo')
        .maybeSingle();
      if (!account) {
        const inserted = await supabase
          .from('connected_accounts')
          .insert({ platform, platform_account_id: 'studio-demo' })
          .select('id')
          .single();
        account = inserted.data;
      }

      await supabase.from('scheduled_posts').insert({
        content_asset_id: contentAssetId,
        connected_account_id: account!.id,
        metadata_draft_id: draft.id,
        thumbnail_id: thumb?.id ?? null,
        scheduled_time: when ? new Date(when).toISOString() : new Date().toISOString(),
      });
      setWhen('');
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const publishNow = async (id: string) => {
    setPublishingId(id);
    try {
      await api.publish.now(id);
      await load();
    } finally {
      setPublishingId(null);
    }
  };

  return (
    <>
      <div className="lib-panel__head">
        <h2>Schedule</h2>
      </div>

      <div className="lib-card">
        <div className="lib-row">
          <div className="lib-field" style={{ flex: 1 }}>
            <span>Platform</span>
            <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
              <option value="youtube">YouTube</option>
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
            </select>
          </div>
          <div className="lib-field" style={{ flex: 1 }}>
            <span>When</span>
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </div>
        </div>
        <button className="lib-btn lib-btn--solid" onClick={create} disabled={creating}>
          {creating ? 'Scheduling…' : 'Schedule post'}
        </button>
        {error && <p className="lib-empty">{error}</p>}
      </div>

      {posts.length > 0 && (
        <div className="lib-table-wrap" style={{ marginTop: 'var(--space-4)' }}>
          <table className="lib-table">
            <thead>
              <tr>
                <th>Platform</th>
                <th>When</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id}>
                  <td>{p.connected_accounts?.platform ?? '—'}</td>
                  <td>{new Date(p.scheduled_time).toLocaleString()}</td>
                  <td>
                    <span className={`lp-tag ${p.status === 'posted' ? 'lp-tag--pass' : p.status === 'failed' ? 'lp-tag--block' : 'lp-tag--warn'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td>
                    {p.status === 'pending' && (
                      <button
                        className="lib-btn lib-btn--sm"
                        onClick={() => publishNow(p.id)}
                        disabled={publishingId === p.id}
                      >
                        {publishingId === p.id ? 'Publishing…' : 'Publish now'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ── moderation ───────────────────────────────────────────────────────────
interface CommentRow {
  id: string;
  author: string;
  text: string;
}

function ModerationPanel({ contentAssetId }: { contentAssetId: string }) {
  const [comments, setComments] = useState<CommentRow[]>([]);

  const load = async () => {
    const { data: posts } = await supabase.from('scheduled_posts').select('id').eq('content_asset_id', contentAssetId);
    const ids = (posts ?? []).map((p) => p.id);
    if (ids.length === 0) return setComments([]);
    const { data } = await supabase
      .from('comments')
      .select('id, author, text')
      .in('scheduled_post_id', ids)
      .is('moderation_action', null);
    setComments(data ?? []);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentAssetId]);

  const act = async (id: string, action: 'approved' | 'hidden') => {
    await supabase.from('comments').update({ moderation_action: action }).eq('id', id);
    await load();
  };

  return (
    <>
      <div className="lib-panel__head">
        <h2>Moderation</h2>
      </div>
      {comments.length === 0 ? (
        <p className="lib-empty">Inbox zero — comments arrive once a platform connector fetches them for this asset's posts.</p>
      ) : (
        <div className="lib-card">
          {comments.map((c) => (
            <div key={c.id} className="lib-comment">
              <div>
                <div className="lib-comment__author">{c.author}</div>
                <div className="lib-comment__text">{c.text}</div>
              </div>
              <div className="lib-row">
                <button className="lib-btn lib-btn--sm" onClick={() => act(c.id, 'approved')}>
                  Approve
                </button>
                <button className="lib-btn lib-btn--sm" onClick={() => act(c.id, 'hidden')}>
                  Hide
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ── analytics ────────────────────────────────────────────────────────────
interface SnapshotRow {
  id: string;
  platform: string;
  fetched_at: string;
  metrics: { views?: number; likes?: number; comments?: number };
}

function AnalyticsPanel({ contentAssetId }: { contentAssetId: string }) {
  const [snapshots, setSnapshots] = useState<SnapshotRow[]>([]);

  useEffect(() => {
    (async () => {
      const { data: posts } = await supabase.from('scheduled_posts').select('id').eq('content_asset_id', contentAssetId);
      const ids = (posts ?? []).map((p) => p.id);
      if (ids.length === 0) return setSnapshots([]);
      const { data } = await supabase
        .from('analytics_snapshots')
        .select('*')
        .in('scheduled_post_id', ids)
        .order('fetched_at', { ascending: false });
      setSnapshots(data ?? []);
    })();
  }, [contentAssetId]);

  const totals = snapshots.reduce(
    (acc, s) => ({
      views: acc.views + (s.metrics.views ?? 0),
      likes: acc.likes + (s.metrics.likes ?? 0),
      comments: acc.comments + (s.metrics.comments ?? 0),
    }),
    { views: 0, likes: 0, comments: 0 },
  );

  return (
    <>
      <div className="lib-panel__head">
        <h2>Analytics</h2>
      </div>
      {snapshots.length === 0 ? (
        <p className="lib-empty">No analytics yet — publish a post to start collecting data.</p>
      ) : (
        <>
          <div className="lib-stats">
            <div className="lib-stat">
              <div className="lib-stat__label">Views</div>
              <div className="lib-stat__value">{totals.views.toLocaleString()}</div>
            </div>
            <div className="lib-stat">
              <div className="lib-stat__label">Likes</div>
              <div className="lib-stat__value">{totals.likes.toLocaleString()}</div>
            </div>
            <div className="lib-stat">
              <div className="lib-stat__label">Comments</div>
              <div className="lib-stat__value">{totals.comments.toLocaleString()}</div>
            </div>
          </div>
          <div className="lib-table-wrap">
            <table className="lib-table">
              <thead>
                <tr>
                  <th>Platform</th>
                  <th>Fetched</th>
                  <th>Views</th>
                  <th>Likes</th>
                </tr>
              </thead>
              <tbody>
                {snapshots.map((s) => (
                  <tr key={s.id}>
                    <td>{s.platform}</td>
                    <td>{new Date(s.fetched_at).toLocaleString()}</td>
                    <td>{s.metrics.views ?? '—'}</td>
                    <td>{s.metrics.likes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
