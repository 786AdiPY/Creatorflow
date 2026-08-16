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

// ── shared: posts-for-asset (title + platform joined in) ──────────────────
interface Post {
  id: string;
  status: 'pending' | 'posted' | 'failed';
  scheduled_time: string;
  platform: string;
  title: string;
  error: string | null;
}

async function loadPosts(contentAssetId: string): Promise<Post[]> {
  const { data } = await supabase
    .from('scheduled_posts')
    .select('id, status, scheduled_time, platform_payload, connected_accounts(platform), metadata_drafts(title)')
    .eq('content_asset_id', contentAssetId)
    .order('scheduled_time', { ascending: false });
  return (data ?? []).map((p) => {
    const row = p as unknown as {
      id: string;
      status: Post['status'];
      scheduled_time: string;
      platform_payload: { error?: string } | null;
      connected_accounts: { platform: string } | null;
      metadata_drafts: { title: string } | null;
    };
    return {
      id: row.id,
      status: row.status,
      scheduled_time: row.scheduled_time,
      platform: row.connected_accounts?.platform ?? 'youtube',
      title: row.metadata_drafts?.title || 'Untitled post',
      error: row.platform_payload?.error ?? null,
    };
  });
}

function useAssetTitle(contentAssetId: string) {
  const [title, setTitle] = useState('this asset');
  useEffect(() => {
    supabase
      .from('content_assets')
      .select('storage_url')
      .eq('id', contentAssetId)
      .maybeSingle()
      .then(({ data }) => setTitle(data?.storage_url.split('/').pop() ?? 'this asset'));
  }, [contentAssetId]);
  return title;
}

function PlatformBadge({ platform }: { platform: string }) {
  const label: Record<string, string> = {
    youtube: 'YouTube',
    tiktok: 'TikTok',
    instagram: 'Instagram',
    x: 'X',
    linkedin: 'LinkedIn',
    threads: 'Threads',
  };
  return <span className={`lib-platform lib-platform--${platform}`}>{label[platform] ?? platform}</span>;
}

function StatusPill({ status }: { status: Post['status'] }) {
  const label: Record<Post['status'], string> = { pending: 'PENDING', posted: 'PUBLISHED', failed: 'FAILED' };
  return <span className={`lib-status lib-status--${status}`}>{label[status]}</span>;
}

/** Minimal SVG area chart — no charting library, matches the rest of this
 * codebase's hand-rolled-primitives approach (see lib/motion.tsx). */
function AreaChart({ points }: { points: { label: string; value: number }[] }) {
  if (points.length === 0) return <div className="lib-empty">Not enough data yet.</div>;
  const w = 600;
  const h = 130;
  const max = Math.max(...points.map((p) => p.value), 1);
  const step = points.length > 1 ? w / (points.length - 1) : 0;
  const coords = points.map((p, i) => [i * step, h - (p.value / max) * (h - 8) - 4] as const);
  const line = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${w},${h} L0,${h} Z`;
  const ticks = points.length <= 4 ? points : [points[0], points[Math.floor(points.length / 3)], points[Math.floor((points.length * 2) / 3)], points[points.length - 1]];
  return (
    <>
      <svg className="lib-area" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="lib-area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#lib-area-grad)" />
        <path d={line} fill="none" stroke="var(--color-primary)" strokeWidth="2" />
      </svg>
      <div className="lib-area__ticks">
        {ticks.map((t, i) => (
          <span key={i}>{t.label}</span>
        ))}
      </div>
    </>
  );
}

function Sparkline({ values, positive }: { values: number[]; positive: boolean }) {
  if (values.length < 2) return <svg className="lib-sparkline" viewBox="0 0 100 32" />;
  const w = 100;
  const h = 32;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const step = w / (values.length - 1);
  const line = values
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(h - ((v - min) / range) * (h - 4) - 2).toFixed(1)}`)
    .join(' ');
  return (
    <svg className="lib-sparkline" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <path d={line} fill="none" stroke={positive ? 'var(--color-good)' : 'var(--color-bad)'} strokeWidth="1.75" />
    </svg>
  );
}

function Delta({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="lib-delta lib-delta--flat">—</span>;
  const up = pct >= 0;
  return (
    <span className={`lib-delta ${up ? 'lib-delta--up' : 'lib-delta--down'}`}>
      {up ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

// ── schedule ─────────────────────────────────────────────────────────────
function SchedulePanel({ contentAssetId }: { contentAssetId: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [accounts, setAccounts] = useState<{ id: string; platform: string }[]>([]);
  const [platform, setPlatform] = useState('youtube');
  const [when, setWhen] = useState('');
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const assetTitle = useAssetTitle(contentAssetId);

  const load = async () => {
    setPosts(await loadPosts(contentAssetId));
    const { data } = await supabase.from('connected_accounts').select('id, platform');
    setAccounts(data ?? []);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentAssetId]);

  const counts = {
    pending: posts.filter((p) => p.status === 'pending').length,
    posted: posts.filter((p) => p.status === 'posted').length,
    failed: posts.filter((p) => p.status === 'failed').length,
  };

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
    setBusyId(id);
    try {
      await api.publish.now(id);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="lib-panel__head">
        <div className="lib-panel__titlewrap">
          <h2>Schedule</h2>
          <p className="lib-panel__sub">
            Queue for <strong>{assetTitle}</strong> · {counts.pending} pending, {counts.posted} published, {counts.failed} failed
          </p>
        </div>
      </div>

      <div className="lib-card">
        <div className="lib-compose">
          <div className="lib-field" style={{ marginBottom: 0 }}>
            <span>Platform</span>
            <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
              <option value="youtube">YouTube</option>
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
            </select>
          </div>
          <div className="lib-field" style={{ marginBottom: 0 }}>
            <span>Publish at</span>
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </div>
          <button className="lib-btn lib-btn--solid" onClick={create} disabled={creating}>
            {creating ? 'Adding…' : 'Add to queue'}
          </button>
        </div>
        {error && <p className="lib-empty">{error}</p>}
      </div>

      {posts.length > 0 && (
        <div className="lib-table-wrap" style={{ marginTop: 'var(--space-4)' }}>
          <table className="lib-table">
            <thead>
              <tr>
                <th>Post</th>
                <th>Platform</th>
                <th>Publish at</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id}>
                  <td style={{ whiteSpace: 'normal' }}>
                    <div className="lib-post-title">{p.title}</div>
                    {p.error && <div className="lib-post-note">{p.error}</div>}
                  </td>
                  <td>
                    <PlatformBadge platform={p.platform} />
                  </td>
                  <td>{new Date(p.scheduled_time).toLocaleString()}</td>
                  <td>
                    <StatusPill status={p.status} />
                  </td>
                  <td>
                    {(p.status === 'pending' || p.status === 'failed') && (
                      <button className="lib-btn lib-btn--sm" onClick={() => publishNow(p.id)} disabled={busyId === p.id}>
                        {busyId === p.id ? 'Publishing…' : p.status === 'failed' ? 'Retry' : 'Publish now'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="lib-card" style={{ marginTop: 'var(--space-4)' }}>
        <h3 style={{ marginBottom: 'var(--space-3)' }}>Connected accounts</h3>
        {accounts.length === 0 ? (
          <p className="lib-empty">No accounts connected yet — one gets created the first time you schedule a post to a platform.</p>
        ) : (
          accounts.map((a) => (
            <div key={a.id} className="lib-account-row">
              <PlatformBadge platform={a.platform} />
              <span className="lib-delta lib-delta--up">connected</span>
            </div>
          ))
        )}
      </div>
    </>
  );
}

// ── moderation ───────────────────────────────────────────────────────────
interface Comment {
  id: string;
  author: string;
  text: string;
  sentiment: string | null;
  moderation_action: string | null;
  fetched_at: string;
  post_title: string;
}

function ModerationPanel({ contentAssetId }: { contentAssetId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [resolved, setResolved] = useState<Comment[]>([]);
  const [filter, setFilter] = useState<'all' | 'flagged' | 'negative' | 'clean'>('all');
  const assetTitle = useAssetTitle(contentAssetId);

  const load = async () => {
    const posts = await loadPosts(contentAssetId);
    const ids = posts.map((p) => p.id);
    if (ids.length === 0) return;
    const byId = Object.fromEntries(posts.map((p) => [p.id, p.title]));

    const { data: pending } = await supabase
      .from('comments')
      .select('id, author, text, sentiment, moderation_action, fetched_at, scheduled_post_id')
      .in('scheduled_post_id', ids)
      .is('moderation_action', null)
      .order('fetched_at', { ascending: false });
    setComments((pending ?? []).map((c) => ({ ...c, post_title: byId[c.scheduled_post_id] ?? 'a post' })));

    const { data: done } = await supabase
      .from('comments')
      .select('id, author, text, sentiment, moderation_action, fetched_at, scheduled_post_id')
      .in('scheduled_post_id', ids)
      .not('moderation_action', 'is', null)
      .order('fetched_at', { ascending: false })
      .limit(3);
    setResolved((done ?? []).map((c) => ({ ...c, post_title: byId[c.scheduled_post_id] ?? 'a post' })));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentAssetId]);

  const act = async (id: string, action: 'approved' | 'hidden') => {
    await supabase.from('comments').update({ moderation_action: action }).eq('id', id);
    await load();
  };

  const visible = comments.filter((c) => {
    if (filter === 'all') return true;
    if (filter === 'negative') return c.sentiment === 'negative';
    if (filter === 'clean') return c.sentiment === 'positive' || c.sentiment === null;
    return false; // 'flagged' has no source field yet — nothing matches, honestly
  });

  const mix = ['positive', 'neutral', 'negative'].map((k) => ({
    key: k,
    count: comments.filter((c) => (k === 'neutral' ? !c.sentiment : c.sentiment === k)).length,
  }));
  const mixTotal = comments.length || 1;

  return (
    <>
      <div className="lib-panel__head">
        <div className="lib-panel__titlewrap">
          <h2>Moderation</h2>
          <p className="lib-panel__sub">
            {comments.length} comment{comments.length === 1 ? '' : 's'} awaiting review across posts from <strong>{assetTitle}</strong>
          </p>
        </div>
        <div className="lib-filters">
          {(['all', 'flagged', 'negative', 'clean'] as const).map((f) => (
            <button key={f} className={filter === f ? 'is-active' : ''} onClick={() => setFilter(f)}>
              {f[0].toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="lib-mod-layout">
        <div>
          {visible.length === 0 ? (
            <p className="lib-empty">
              {comments.length === 0
                ? "Inbox zero — comments arrive once a platform connector fetches them for this asset's posts."
                : 'No comments match this filter.'}
            </p>
          ) : (
            visible.map((c) => (
              <div key={c.id} className="lib-mod-card">
                <div className="lib-mod-card__top">
                  <span className="lib-avatar">{c.author.slice(0, 1).toUpperCase()}</span>
                  <span className="lib-mod-card__name">{c.author}</span>
                  {c.sentiment && <span className="lib-flag">{c.sentiment}</span>}
                  <span className="lib-mod-card__time">{new Date(c.fetched_at).toLocaleString()}</span>
                </div>
                <p className="lib-mod-card__text">{c.text}</p>
                <div className="lib-mod-card__foot">
                  <span className="lib-mod-card__on">on {c.post_title}</span>
                  <div className="lib-row">
                    <button className="lib-btn lib-btn--sm" onClick={() => act(c.id, 'hidden')}>
                      Hide
                    </button>
                    <button className="lib-btn lib-btn--sm lib-btn--solid" onClick={() => act(c.id, 'approved')}>
                      Approve
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div>
          <div className="lib-card">
            <h3 style={{ marginBottom: 'var(--space-3)' }}>Queue mix</h3>
            <div className="lib-mix">
              {mix.map((m) => (
                <div key={m.key}>
                  <div className="lib-mix__row">
                    <span style={{ textTransform: 'capitalize' }}>{m.key}</span>
                    <span>{Math.round((m.count / mixTotal) * 100)}%</span>
                  </div>
                  <div className="lib-mix__bar">
                    <div
                      className="lib-mix__fill"
                      style={{
                        width: `${(m.count / mixTotal) * 100}%`,
                        background: m.key === 'positive' ? 'var(--color-good)' : m.key === 'negative' ? 'var(--color-bad)' : 'var(--color-info)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="lib-panel__sub" style={{ marginTop: 'var(--space-2)' }}>
              Based on the <span className="lp-mono">sentiment</span> field where a connector has set it.
            </p>
          </div>

          <div className="lib-card" style={{ marginTop: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-3)' }}>Recently resolved</h3>
            {resolved.length === 0 ? (
              <p className="lib-empty">Approve or hide a comment to see it here.</p>
            ) : (
              resolved.map((c) => (
                <div key={c.id} className="lib-account-row">
                  <span style={{ fontSize: 'var(--font-size-sm)' }}>{c.author}</span>
                  <span className={`lib-delta ${c.moderation_action === 'approved' ? 'lib-delta--up' : 'lib-delta--down'}`}>
                    {c.moderation_action}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── analytics ────────────────────────────────────────────────────────────
interface Snapshot {
  id: string;
  scheduled_post_id: string;
  platform: string;
  fetched_at: string;
  metrics: { views?: number; likes?: number; comments?: number; retention?: number };
}

const RANGES = { '7d': 7, '28d': 28, '90d': 90 } as const;
type RangeKey = keyof typeof RANGES;

function sum(snaps: Snapshot[], key: 'views' | 'likes' | 'comments') {
  return snaps.reduce((acc, s) => acc + (s.metrics[key] ?? 0), 0);
}
function avg(snaps: Snapshot[], key: 'retention') {
  const vals = snaps.map((s) => s.metrics[key]).filter((v): v is number => v != null);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}
function pctDelta(current: number, prior: number) {
  if (prior === 0) return current === 0 ? 0 : null;
  return ((current - prior) / prior) * 100;
}

function AnalyticsPanel({ contentAssetId }: { contentAssetId: string }) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [range, setRange] = useState<RangeKey>('28d');
  const assetTitle = useAssetTitle(contentAssetId);

  useEffect(() => {
    (async () => {
      const loadedPosts = await loadPosts(contentAssetId);
      setPosts(loadedPosts);
      const ids = loadedPosts.map((p) => p.id);
      if (ids.length === 0) return setSnapshots([]);
      const { data } = await supabase
        .from('analytics_snapshots')
        .select('*')
        .in('scheduled_post_id', ids)
        .order('fetched_at', { ascending: true });
      setSnapshots(data ?? []);
    })();
  }, [contentAssetId]);

  const days = RANGES[range];
  const now = Date.now();
  const currentStart = now - days * 86_400_000;
  const priorStart = now - 2 * days * 86_400_000;

  const current = snapshots.filter((s) => new Date(s.fetched_at).getTime() >= currentStart);
  const prior = snapshots.filter((s) => {
    const t = new Date(s.fetched_at).getTime();
    return t >= priorStart && t < currentStart;
  });

  const publishedPosts = posts.filter((p) => p.status === 'posted');

  if (snapshots.length === 0) {
    return (
      <>
        <div className="lib-panel__head">
          <h2>Analytics</h2>
        </div>
        <p className="lib-empty">No analytics yet — publish a post to start collecting data.</p>
      </>
    );
  }

  const views = { cur: sum(current, 'views'), prior: sum(prior, 'views') };
  const likes = { cur: sum(current, 'likes'), prior: sum(prior, 'likes') };
  const comments = { cur: sum(current, 'comments'), prior: sum(prior, 'comments') };
  const watch = { cur: avg(current, 'retention'), prior: avg(prior, 'retention') };

  // daily totals for the area chart
  const byDay = new Map<string, number>();
  for (const s of current) {
    const d = new Date(s.fetched_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    byDay.set(d, (byDay.get(d) ?? 0) + (s.metrics.views ?? 0));
  }
  const chartPoints = [...byDay.entries()].map(([label, value]) => ({ label, value }));

  // sparkline series per metric = daily current-window totals (reuse chart grouping)
  const sparkValues = (key: 'views' | 'likes' | 'comments') => {
    const m = new Map<string, number>();
    for (const s of current) {
      const d = new Date(s.fetched_at).toLocaleDateString();
      m.set(d, (m.get(d) ?? 0) + (s.metrics[key] ?? 0));
    }
    return [...m.values()];
  };

  // best performer = post with highest summed views in the current window
  const viewsByPost = new Map<string, number>();
  for (const s of current) viewsByPost.set(s.scheduled_post_id, (viewsByPost.get(s.scheduled_post_id) ?? 0) + (s.metrics.views ?? 0));
  const bestId = [...viewsByPost.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const bestPost = publishedPosts.find((p) => p.id === bestId);
  const bestSnaps = current.filter((s) => s.scheduled_post_id === bestId);

  return (
    <>
      <div className="lib-panel__head">
        <div className="lib-panel__titlewrap">
          <h2>Analytics</h2>
          <p className="lib-panel__sub">
            {publishedPosts.length} published post{publishedPosts.length === 1 ? '' : 's'} from <strong>{assetTitle}</strong>
          </p>
        </div>
        <div className="lib-range">
          {(Object.keys(RANGES) as RangeKey[]).map((r) => (
            <button key={r} className={range === r ? 'is-active' : ''} onClick={() => setRange(r)}>
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="lib-chart-card">
        <div className="lib-card">
          <div className="lib-chart-card__head">
            <div>
              <div className="lib-stat__label">Total views · {range}</div>
              <div className="lib-chart-big">{views.cur.toLocaleString()}</div>
              <Delta pct={pctDelta(views.cur, views.prior)} />
            </div>
            <div className="lib-chart-card__mini">
              <div>
                <div className="lib-stat__label">Avg. watch</div>
                <strong>{watch.cur != null ? `${Math.round(watch.cur * 100)}%` : '—'}</strong>
                <div>
                  <Delta pct={watch.cur != null && watch.prior != null ? pctDelta(watch.cur, watch.prior) : null} />
                </div>
              </div>
              <div>
                <div className="lib-stat__label">Engagements</div>
                <strong>{(likes.cur + comments.cur).toLocaleString()}</strong>
                <div>
                  <Delta pct={pctDelta(likes.cur + comments.cur, likes.prior + comments.prior)} />
                </div>
              </div>
            </div>
          </div>
          <AreaChart points={chartPoints} />
        </div>

        <div className="lib-card lib-best">
          <div className="lib-stat__label">Best performer</div>
          {bestPost ? (
            <>
              <div className="lib-best__title">{bestPost.title}</div>
              <div className="lib-row">
                <PlatformBadge platform={bestPost.platform} />
                <span className="lib-panel__sub">published {new Date(bestPost.scheduled_time).toLocaleDateString()}</span>
              </div>
              <div className="lib-best__grid">
                <div>
                  Views
                  <strong>{sum(bestSnaps, 'views').toLocaleString()}</strong>
                </div>
                <div>
                  Likes
                  <strong>{sum(bestSnaps, 'likes').toLocaleString()}</strong>
                </div>
                <div>
                  Comments
                  <strong>{sum(bestSnaps, 'comments').toLocaleString()}</strong>
                </div>
                <div>
                  Avg. watch
                  <strong>{avg(bestSnaps, 'retention') != null ? `${Math.round(avg(bestSnaps, 'retention')! * 100)}%` : '—'}</strong>
                </div>
              </div>
              <p className="lib-best__note">Highest view count among this asset's posts in the last {range}.</p>
            </>
          ) : (
            <p className="lib-empty">No published posts in this window yet.</p>
          )}
        </div>
      </div>

      <div className="lib-sparktiles">
        {(
          [
            { label: 'Views', key: 'views' as const, cur: views.cur, prior: views.prior },
            { label: 'Likes', key: 'likes' as const, cur: likes.cur, prior: likes.prior },
            { label: 'Comments', key: 'comments' as const, cur: comments.cur, prior: comments.prior },
          ]
        ).map((tile) => {
          const delta = pctDelta(tile.cur, tile.prior);
          return (
            <div key={tile.key} className="lib-sparktile">
              <div className="lib-sparktile__head">
                <span className="lib-stat__label">{tile.label}</span>
                <Delta pct={delta} />
              </div>
              <div className="lib-stat__value">{tile.cur.toLocaleString()}</div>
              <Sparkline values={sparkValues(tile.key)} positive={delta === null || delta >= 0} />
            </div>
          );
        })}
        <div className="lib-sparktile">
          <div className="lib-sparktile__head">
            <span className="lib-stat__label">Avg. watch</span>
            <Delta pct={watch.cur != null && watch.prior != null ? pctDelta(watch.cur, watch.prior) : null} />
          </div>
          <div className="lib-stat__value">{watch.cur != null ? `${Math.round(watch.cur * 100)}%` : '—'}</div>
        </div>
      </div>

      <div className="lib-table-wrap">
        <table className="lib-table">
          <thead>
            <tr>
              <th>Post</th>
              <th>Platform</th>
              <th>Views</th>
              <th>Avg. watch</th>
              <th>Likes</th>
              <th>Comments</th>
              <th>Trend</th>
            </tr>
          </thead>
          <tbody>
            {publishedPosts.map((p) => {
              const postCur = current.filter((s) => s.scheduled_post_id === p.id);
              const postPrior = prior.filter((s) => s.scheduled_post_id === p.id);
              const v = sum(postCur, 'views');
              if (v === 0 && postCur.length === 0) return null;
              return (
                <tr key={p.id}>
                  <td style={{ whiteSpace: 'normal' }}>
                    <div className="lib-post-title">{p.title}</div>
                    <div className="lib-panel__sub">published {new Date(p.scheduled_time).toLocaleDateString()}</div>
                  </td>
                  <td>
                    <PlatformBadge platform={p.platform} />
                  </td>
                  <td>{v.toLocaleString()}</td>
                  <td>{avg(postCur, 'retention') != null ? `${Math.round(avg(postCur, 'retention')! * 100)}%` : '—'}</td>
                  <td>{sum(postCur, 'likes').toLocaleString()}</td>
                  <td>{sum(postCur, 'comments').toLocaleString()}</td>
                  <td>
                    <Delta pct={pctDelta(v, sum(postPrior, 'views'))} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
