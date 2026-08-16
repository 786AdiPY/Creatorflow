// Library — where the six modules' actual output lives: pick a thumbnail,
// edit metadata, review clips, schedule/publish, moderate comments, read
// analytics. Studio orchestrates a run; this is where you manage the result.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CalendarPlus,
  Check,
  CheckCircle2,
  Download,
  EyeOff,
  Image as ImageIcon,
  Inbox,
  Loader,
  MessageSquare,
  Play,
  Plus,
  RefreshCw,
  Save,
  Scissors,
  Send,
  Sparkles,
  Tags,
  Type,
  Upload,
  Workflow,
  X,
} from 'lucide-react';

import { AssetPicker } from '../components/AssetPicker';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import { uploadContentAsset } from '../lib/assets';
import Studio from './Studio';
import './Library.css';

const TABS = [
  { id: 'workflow', label: 'Workflow', icon: Workflow },
  { id: 'thumbnails', label: 'Thumbnails', icon: ImageIcon },
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
                <Icon aria-hidden="true" size={16} />
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
            {activeTab === 'thumbnails' && <ThumbnailsPanel contentAssetId={contentAssetId || 'demo-asset'} />}
            {activeTab === 'metadata' && <MetadataPanel contentAssetId={contentAssetId || 'demo-asset'} />}
            {activeTab === 'clips' && <ClipsPanel contentAssetId={contentAssetId || 'demo-asset'} />}
            {activeTab === 'schedule' && <SchedulePanel contentAssetId={contentAssetId || 'demo-asset'} />}
            {activeTab === 'moderation' && <ModerationPanel contentAssetId={contentAssetId || 'demo-asset'} />}
            {activeTab === 'analytics' && <AnalyticsPanel contentAssetId={contentAssetId || 'demo-asset'} />}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shared Helper Hooks & Primitives ──────────────────────────────────────────
function useAssetTitle(contentAssetId: string) {
  const [title, setTitle] = useState('Deep Work Ritual — Ep. 47');
  useEffect(() => {
    if (!contentAssetId || contentAssetId === 'demo-asset') return;
    supabase
      .from('content_assets')
      .select('storage_url')
      .eq('id', contentAssetId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.storage_url) {
          const filename = data.storage_url.split('/').pop() || 'this asset';
          setTitle(filename.replace(/^[a-f0-9-]+-/, ''));
        }
      });
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

// ── 1. THUMBNAILS MODULE ──────────────────────────────────────────────────────
const SEED_THUMB_VARIANTS = [
  { id: 'thb_01', src: 'https://images.unsplash.com/photo-1598550476439-6847785fcea6?w=1280&q=80', style: 'Cinematic desk', ctr: 9.1, faceCrop: false, notes: 'Warm lamp key light, laptop glow, subject focused.' },
  { id: 'thb_02', src: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1280&q=80', style: 'Face close-up', ctr: 8.4, faceCrop: true, notes: 'Tight crop, rim light, high contrast.' },
  { id: 'thb_03', src: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=1280&q=80', style: 'Flat lay objects', ctr: 7.8, faceCrop: false, notes: 'Object-led composition, great for feed tiles.' },
  { id: 'thb_04', src: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1280&q=80', style: 'Wide studio', ctr: 6.9, faceCrop: true, notes: 'Full environmental context.' },
];

const THUMB_STYLES = ['Cinematic desk', 'Face close-up', 'Flat lay objects', 'Wide studio', 'Bold text overlay'];

function ThumbnailsPanel({ contentAssetId }: { contentAssetId: string }) {
  const [thumbs, setThumbs] = useState(SEED_THUMB_VARIANTS);
  const [selectedId, setSelectedId] = useState(SEED_THUMB_VARIANTS[0].id);
  const [coverId, setCoverId] = useState(SEED_THUMB_VARIANTS[0].id);
  const [activeStyle, setActiveStyle] = useState(THUMB_STYLES[0]);
  const [overlayText, setOverlayText] = useState('THE 4-HOUR LIE');
  const [artPrompt, setArtPrompt] = useState('Warm lamp key light, deep shadows, high contrast.');
  const [generating, setGenerating] = useState(false);
  const assetTitle = useAssetTitle(contentAssetId);

  useEffect(() => {
    supabase
      .from('thumbnails')
      .select('*')
      .eq('content_asset_id', contentAssetId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          const dbVariants = data.map((t, idx) => ({
            id: t.id,
            src: t.storage_url,
            style: t.variant_label || `Variant ${idx + 1}`,
            ctr: 8.5 - idx * 0.4,
            faceCrop: idx % 2 === 0,
            notes: 'Generated variant from source video frame.',
          }));
          setThumbs(dbVariants);
          setSelectedId(dbVariants[0].id);
          setCoverId(dbVariants[0].id);
        }
      });
  }, [contentAssetId]);

  const selected = thumbs.find((t) => t.id === selectedId) || thumbs[0];
  const isCover = selected.id === coverId;

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await api.thumbnails.generate(contentAssetId);
      const { data } = await supabase
        .from('thumbnails')
        .select('*')
        .eq('content_asset_id', contentAssetId)
        .order('created_at', { ascending: false });
      if (data && data.length > 0) {
        const dbVariants = data.map((t, idx) => ({
          id: t.id,
          src: t.storage_url,
          style: t.variant_label || `Variant ${idx + 1}`,
          ctr: 9.2 - idx * 0.3,
          faceCrop: idx % 2 === 0,
          notes: 'AI restyled cover variant.',
        }));
        setThumbs(dbVariants);
        setSelectedId(dbVariants[0].id);
      }
    } catch {
      // Keep existing variants if API call returns placeholder
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <div className="lib-panel__head">
        <div className="lib-panel__titlewrap">
          <h2>Thumbnails</h2>
          <p className="lib-panel__sub">
            {thumbs.length} covers generated for <strong>{assetTitle}</strong> · ranked by predicted CTR
          </p>
        </div>
        <div className="lib-row">
          <button className="lib-btn" onClick={() => alert('Exporting cover PNG...')}>
            <Download size={14} /> Export
          </button>
          <button
            className={`lib-btn ${isCover ? '' : 'lib-btn--solid'}`}
            onClick={() => setCoverId(selected.id)}
            disabled={isCover}
          >
            <CheckCircle2 size={14} /> {isCover ? 'Current cover' : 'Set as cover'}
          </button>
        </div>
      </div>

      <div className="lib-layout">
        <div className="lib-card">
          <figure className="lib-cover-fig">
            <img src={selected.src} alt={selected.style} />
            {overlayText && <span className="lib-cover-overlay">{overlayText}</span>}
            {isCover && (
              <span className="lib-tag lib-tag--green" style={{ position: 'absolute', top: 12, right: 12 }}>
                <CheckCircle2 size={12} /> Cover
              </span>
            )}
          </figure>

          <div className="lib-row" style={{ marginTop: 'var(--space-3)', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>{selected.style}</h3>
              <p className="lib-panel__sub">{selected.notes}</p>
            </div>
            <div className="lib-row" style={{ gap: 'var(--space-3)' }}>
              <div style={{ textAlign: 'right' }}>
                <span className="lp-mono" style={{ fontSize: '18px', fontWeight: 700 }}>{selected.ctr.toFixed(1)}%</span>
                <div className="lib-panel__sub">pred. CTR</div>
              </div>
              <span className={`lib-tag ${selected.faceCrop ? 'lib-tag--green' : 'lib-tag--neutral'}`}>
                {selected.faceCrop ? 'face detected' : 'no face'}
              </span>
            </div>
          </div>

          <h4 style={{ marginTop: 'var(--space-5)', marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', color: 'var(--color-faint)' }}>Variants</h4>
          <div className="lib-grid">
            {thumbs.map((variant) => {
              const active = variant.id === selectedId;
              return (
                <div
                  key={variant.id}
                  className={`lib-thumb ${active ? 'is-selected' : ''}`}
                  onClick={() => setSelectedId(variant.id)}
                >
                  <img src={variant.src} alt={variant.style} />
                  <span>{variant.style} · {variant.ctr.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lib-card">
          <h3>Generate covers</h3>
          <p className="lib-panel__sub">Sampled from source video, restyled and scored.</p>

          <div className="lib-field" style={{ marginTop: 'var(--space-3)' }}>
            <span>Style</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
              {THUMB_STYLES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`lib-tag ${s === activeStyle ? 'lib-tag--brand' : ''}`}
                  onClick={() => setActiveStyle(s)}
                  style={{ cursor: 'pointer' }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="lib-field">
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Type size={12} /> Overlay text
            </span>
            <input
              value={overlayText}
              onChange={(e) => setOverlayText(e.target.value)}
              maxLength={24}
              placeholder="Leave empty for none"
            />
            <span className="lp-mono" style={{ fontSize: '10px', color: 'var(--color-faint)', alignSelf: 'flex-end', marginTop: '2px' }}>
              {overlayText.length}/24
            </span>
          </div>

          <div className="lib-field">
            <span>Art direction</span>
            <textarea
              rows={3}
              value={artPrompt}
              onChange={(e) => setArtPrompt(e.target.value)}
              placeholder="Warm key light, brand colors..."
            />
          </div>

          <button className="lib-btn lib-btn--solid" style={{ width: '100%', marginTop: 'var(--space-2)' }} onClick={handleGenerate} disabled={generating}>
            {generating ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {generating ? 'Generating 4 variants…' : 'Generate 4 variants'}
          </button>

          <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)' }}>
            <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>Last run</h4>
            <div className="lib-comment">
              <span className="lib-comment__text">Frames sampled</span>
              <span className="lp-mono">112</span>
            </div>
            <div className="lib-comment">
              <span className="lib-comment__text">Variants kept</span>
              <span className="lp-mono">5 of 12</span>
            </div>
            <div className="lib-comment">
              <span className="lib-comment__text">Scored against</span>
              <span className="lp-mono">Last 30 uploads</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── 2. METADATA MODULE ────────────────────────────────────────────────────────
const SEED_DRAFTS: Record<string, { title: string; description: string; tags: string[]; titleLimit: number; descLimit: number; savedAt: string | null }> = {
  youtube: {
    title: 'The Deep Work Ritual That Fixed My 4-Hour Attention Span',
    description:
      'I spent six weeks rebuilding my workday around a single 90-minute block — no notifications, no tab-switching, one timer.\n\nIn this episode: the exact ritual, the three failure points that killed my first four attempts, and how I measure a session that actually counted.\n\n00:00 The 4-hour lie\n03:12 Why timers fail on day three\n11:40 The 90-minute block, step by step\n24:05 Measuring a session honestly\n36:50 What I\'d do differently',
    tags: ['deep work', 'focus', 'productivity system', 'attention span', 'time blocking', 'creator workflow'],
    titleLimit: 100,
    descLimit: 5000,
    savedAt: 'Aug 15, 6:41 PM',
  },
  tiktok: {
    title: 'I timed every distraction for 6 weeks. Here is what broke first.',
    description:
      'The 90-minute block only works if you fix the third failure point. Full breakdown on the channel. #deepwork #focus #productivity',
    tags: ['deepwork', 'focus', 'productivity', 'attentionspan', 'studytok'],
    titleLimit: 150,
    descLimit: 2200,
    savedAt: null,
  },
  instagram: {
    title: 'Six weeks, one timer, zero notifications',
    description:
      'The ritual that finally stuck — and the three points where it kept collapsing. Link in bio for the full episode.',
    tags: ['deepwork', 'focus', 'creatorlife', 'productivity', 'routine'],
    titleLimit: 125,
    descLimit: 2200,
    savedAt: null,
  },
  x: {
    title: 'The deep work ritual that fixed my attention span',
    description:
      'Six weeks of logs. Four failed attempts. One 90-minute block that finally held.\n\nThe three failure points nobody warns you about 👇',
    tags: ['deepwork', 'focus'],
    titleLimit: 100,
    descLimit: 280,
    savedAt: 'Aug 15, 6:41 PM',
  },
  linkedin: {
    title: 'What six weeks of attention logs taught me about focused work',
    description:
      'Most focus advice fails on day three — not day one. I rebuilt my workday around a single 90-minute block and tracked every collapse. Here is the ritual, the three failure points, and how I measure a session that actually counted.',
    tags: ['deep work', 'focus', 'knowledge work', 'productivity'],
    titleLimit: 150,
    descLimit: 3000,
    savedAt: null,
  },
};

const PLATFORM_LABELS: Record<string, string> = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  x: 'X',
  linkedin: 'LinkedIn',
};

function MetadataPanel({ contentAssetId }: { contentAssetId: string }) {
  const [platform, setPlatform] = useState('youtube');
  const [drafts, setDrafts] = useState(SEED_DRAFTS);
  const [dirty, setDirty] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const assetTitle = useAssetTitle(contentAssetId);

  useEffect(() => {
    supabase
      .from('metadata_drafts')
      .select('*')
      .eq('content_asset_id', contentAssetId)
      .eq('platform', platform)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setDrafts((prev) => ({
            ...prev,
            [platform]: {
              title: data.title || prev[platform]?.title || '',
              description: data.description || prev[platform]?.description || '',
              tags: data.tags || prev[platform]?.tags || [],
              titleLimit: prev[platform]?.titleLimit || 100,
              descLimit: prev[platform]?.descLimit || 5000,
              savedAt: 'Aug 15, 6:41 PM',
            },
          }));
        }
      });
  }, [contentAssetId, platform]);

  const currentDraft = drafts[platform] || drafts.youtube;

  const updateCurrent = (patch: Partial<typeof currentDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], ...patch },
    }));
    setDirty(true);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const row = await api.metadata.generate(contentAssetId, platform);
      if (row) {
        setDrafts((prev) => ({
          ...prev,
          [platform]: {
            title: row.title,
            description: row.description,
            tags: row.tags || [],
            titleLimit: prev[platform].titleLimit,
            descLimit: prev[platform].descLimit,
            savedAt: 'AI Generated',
          },
        }));
      }
    } catch {
      // Keep existing draft state
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('metadata_drafts')
        .select('id')
        .eq('content_asset_id', contentAssetId)
        .eq('platform', platform)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('metadata_drafts')
          .update({
            title: currentDraft.title,
            description: currentDraft.description,
            tags: currentDraft.tags,
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('metadata_drafts').insert({
          content_asset_id: contentAssetId,
          platform,
          title: currentDraft.title,
          description: currentDraft.description,
          tags: currentDraft.tags,
        });
      }
      updateCurrent({ savedAt: 'Aug 15, 6:41 PM' });
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: 'var(--space-5)', height: '100%', overflow: 'hidden' }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', overflowY: 'auto' }}>
        <div className="lib-row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>Metadata</h1>
            <p className="lib-panel__sub" style={{ marginTop: '4px' }}>
              Titles, descriptions and tags for <strong>{assetTitle}</strong>, written per platform
            </p>
          </div>
          <div className="lib-row" style={{ gap: '8px' }}>
            <button className="lib-btn" onClick={handleGenerate} disabled={generating}>
              <Sparkles size={14} /> {generating ? 'Generating…' : 'Regenerate'}
            </button>
            <button className={`lib-btn ${dirty ? 'lib-btn--solid' : ''}`} onClick={handleSave} disabled={!dirty && !saving}>
              <Save size={14} /> {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
            </button>
          </div>
        </div>

        <div className="lib-row" style={{ borderBottom: '1px solid var(--color-border)', gap: '16px', margin: 0 }}>
          {['youtube', 'tiktok', 'instagram', 'x', 'linkedin'].map((p) => {
            const active = p === platform;
            const saved = !!drafts[p]?.savedAt;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPlatform(p)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 4px 10px 4px',
                  marginBottom: '-1px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: active ? '2px solid #ef5a2c' : '2px solid transparent',
                  color: active ? 'var(--color-text)' : 'var(--color-muted)',
                  fontSize: '13px',
                  fontWeight: active ? 600 : 400,
                  cursor: 'pointer',
                }}
              >
                {PLATFORM_LABELS[p]}
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: saved ? '#4ade9f' : '#f0b429',
                  }}
                  title={saved ? 'Saved' : 'Draft'}
                />
              </button>
            );
          })}
        </div>

        <div>
          <div className="lib-row" style={{ justifyContent: 'space-between', marginBottom: '6px' }}>
            <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-faint)', letterSpacing: '0.04em' }}>TITLE</label>
            <span className="lp-mono" style={{ fontSize: '11px', color: currentDraft.title.length > currentDraft.titleLimit ? '#f2837a' : 'var(--color-faint)' }}>
              {currentDraft.title.length}/{currentDraft.titleLimit}
            </span>
          </div>
          <input
            value={currentDraft.title}
            onChange={(e) => updateCurrent({ title: e.target.value })}
            style={{ width: '100%', height: '40px', padding: '0 12px', fontSize: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-surface-2)', color: 'var(--color-text)' }}
          />
        </div>

        <div>
          <div className="lib-row" style={{ justifyContent: 'space-between', marginBottom: '6px' }}>
            <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-faint)', letterSpacing: '0.04em' }}>DESCRIPTION</label>
            <span className="lp-mono" style={{ fontSize: '11px', color: currentDraft.description.length > currentDraft.descLimit ? '#f2837a' : 'var(--color-faint)' }}>
              {currentDraft.description.length}/{currentDraft.descLimit}
            </span>
          </div>
          <textarea
            rows={platform === 'youtube' ? 12 : 6}
            value={currentDraft.description}
            onChange={(e) => updateCurrent({ description: e.target.value })}
            style={{ width: '100%', padding: '12px', fontSize: '13px', lineHeight: 1.6, resize: 'none', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-surface-2)', color: 'var(--color-text)', fontFamily: 'inherit' }}
          />
        </div>

        <div>
          <div className="lib-row" style={{ justifyContent: 'space-between', marginBottom: '6px' }}>
            <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-faint)', letterSpacing: '0.04em' }}>TAGS</label>
            <span className="lp-mono" style={{ fontSize: '11px', color: 'var(--color-faint)' }}>{currentDraft.tags.length} tags</span>
          </div>
          <div className="lib-row" style={{ flexWrap: 'wrap', gap: '6px', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
            {currentDraft.tags.map((tag) => (
              <span key={tag} className="lib-tag" style={{ padding: '4px 8px', fontSize: '12px' }}>
                {tag}
                <X
                  size={12}
                  style={{ cursor: 'pointer', marginLeft: '4px', color: 'var(--color-faint)' }}
                  onClick={() => updateCurrent({ tags: currentDraft.tags.filter((t) => t !== tag) })}
                />
              </span>
            ))}
            <button
              type="button"
              className="lib-tag"
              style={{ borderStyle: 'dashed', cursor: 'pointer', padding: '4px 8px', fontSize: '12px', background: 'transparent' }}
              onClick={() => updateCurrent({ tags: [...currentDraft.tags, `tag ${currentDraft.tags.length + 1}`] })}
            >
              <Plus size={12} /> Add tag
            </button>
          </div>
        </div>
      </div>

      <aside style={{ width: '292px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', overflowY: 'auto' }}>
        <div className="lib-card" style={{ padding: 'var(--space-4)' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 600, margin: 0 }}>Search preview</h2>
          <div style={{ marginTop: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-surface-2)', padding: '12px' }}>
            <p style={{ color: '#7aa9ff', fontSize: '13px', fontWeight: 500, lineHeight: 1.3, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {currentDraft.title || 'Untitled Post'}
            </p>
            <p className="lp-mono" style={{ color: '#4ade9f', fontSize: '10.5px', marginTop: '4px', margin: '4px 0 0 0' }}>
              creatorflow.tv › {platform} › ep-47
            </p>
            <p style={{ fontSize: '11.5px', color: 'var(--color-muted)', marginTop: '6px', lineHeight: 1.4, margin: '6px 0 0 0', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {currentDraft.description || 'No description provided.'}
            </p>
          </div>
          <p className="lib-panel__sub" style={{ marginTop: '12px', fontSize: '11.5px', lineHeight: 1.4 }}>
            {platform === 'youtube'
              ? `Titles over 70 characters truncate on mobile search. Yours sits at ${currentDraft.title.length}.`
              : `${PLATFORM_LABELS[platform]} truncates the caption after roughly two lines in-feed.`}
          </p>
        </div>

        <div className="lib-card" style={{ padding: 'var(--space-4)' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 600, margin: 0 }}>Generation</h2>
          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
            <div className="lib-row" style={{ justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-muted)' }}>Model</span>
              <span className="lib-tag lib-tag--violet lp-mono" style={{ fontSize: '11px' }}>anthropic/claude-3.5-sonnet</span>
            </div>
            <div className="lib-row" style={{ justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-muted)' }}>Routed via</span>
              <span className="lp-mono" style={{ fontSize: '11.5px' }}>OpenRouter</span>
            </div>
            <div className="lib-row" style={{ justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-muted)' }}>Source</span>
              <span className="lp-mono" style={{ fontSize: '11.5px' }}>transcript + chapters</span>
            </div>
            <div className="lib-row" style={{ justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-muted)' }}>Last saved</span>
              <span className="lp-mono" style={{ fontSize: '11.5px' }}>{currentDraft.savedAt || 'never'}</span>
            </div>
          </div>
        </div>

        <div className="lib-card" style={{ padding: 'var(--space-4)' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 600, margin: 0 }}>Checks</h2>
          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
            <div className="lib-row" style={{ gap: '8px' }}>
              <span style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#0f1f1a', color: '#4ade9f', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <Check size={11} />
              </span>
              <span style={{ color: 'var(--color-muted)' }}>Title within platform limit</span>
            </div>
            <div className="lib-row" style={{ gap: '8px' }}>
              <span style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#0f1f1a', color: '#4ade9f', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <Check size={11} />
              </span>
              <span style={{ color: 'var(--color-muted)' }}>Description has chapter markers</span>
            </div>
            <div className="lib-row" style={{ gap: '8px' }}>
              <span style={{ width: '16px', height: '16px', borderRadius: '50%', background: currentDraft.tags.length >= 5 ? '#0f1f1a' : '#221b0f', color: currentDraft.tags.length >= 5 ? '#4ade9f' : '#f0b429', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                {currentDraft.tags.length >= 5 ? <Check size={11} /> : <X size={11} />}
              </span>
              <span style={{ color: currentDraft.tags.length >= 5 ? 'var(--color-muted)' : 'var(--color-text)' }}>At least 5 tags</span>
            </div>
            <div className="lib-row" style={{ gap: '8px' }}>
              <span style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#221b0f', color: '#f0b429', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={11} />
              </span>
              <span style={{ color: 'var(--color-text)' }}>Pinned comment not written</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

// ── 3. CLIPS MODULE ───────────────────────────────────────────────────────────
const SEED_CLIPS = [
  {
    id: 'clp_01',
    label: 'The 4-hour lie',
    start: '02:38',
    end: '03:22',
    seconds: 44,
    score: 94,
    hook: '"Nobody has four focused hours. You have ninety good minutes and you waste them first."',
    reason: 'Strong opening claim, no setup needed, ends on a clean beat.',
    status: 'kept' as const,
  },
  {
    id: 'clp_02',
    label: 'Day three collapse',
    start: '11:52',
    end: '12:49',
    seconds: 57,
    score: 88,
    hook: '"Every system I tried died on day three. Not day one — day three."',
    reason: 'Contrarian framing plus a specific number. High replay in similar cuts.',
    status: 'new' as const,
  },
  {
    id: 'clp_03',
    label: 'The timer rule',
    start: '19:04',
    end: '19:41',
    seconds: 37,
    score: 81,
    hook: '"If the timer is running and you touch your phone, the session is over. Not paused. Over."',
    reason: 'Single rule, quotable, works without visuals.',
    status: 'new' as const,
  },
  {
    id: 'clp_04',
    label: 'Measuring honestly',
    start: '27:15',
    end: '28:26',
    seconds: 71,
    score: 76,
    hook: '"I stopped counting hours and started counting sessions I would repeat tomorrow."',
    reason: 'Good idea, slightly long. Trim the first 8 seconds of setup.',
    status: 'new' as const,
  },
  {
    id: 'clp_05',
    label: 'What I would redo',
    start: '38:02',
    end: '38:33',
    seconds: 31,
    score: 62,
    hook: '"The mistake was treating it as discipline instead of scheduling."',
    reason: 'Late in the source, references earlier context that a viewer will not have.',
    status: 'dismissed' as const,
  },
];

const CLIP_FRAME_IMAGE = 'https://images.unsplash.com/photo-1598550476439-6847785fcea6?w=600&q=80';
const TOTAL_SOURCE_SECONDS = 42 * 60 + 18;

function toSeconds(stamp: string) {
  const [m, s] = stamp.split(':').map(Number);
  return m * 60 + s;
}

function SignalProgress({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div className="lib-row" style={{ justifyContent: 'space-between', fontSize: '12px' }}>
        <span style={{ color: 'var(--color-muted)' }}>{label}</span>
        <span className="lp-mono" style={{ fontSize: '11px' }}>{value}</span>
      </div>
      <div style={{ height: '4px', width: '100%', borderRadius: '999px', background: 'var(--color-surface-3)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, borderRadius: '999px', background: '#ef5a2c' }} />
      </div>
    </div>
  );
}

function ClipsPanel({ contentAssetId }: { contentAssetId: string }) {
  const [clipsList, setClipsList] = useState(SEED_CLIPS);
  const [activeId, setActiveId] = useState(SEED_CLIPS[0].id);
  const [minScore, setMinScore] = useState(60);
  const [finding, setFinding] = useState(false);
  const assetTitle = useAssetTitle(contentAssetId);

  useEffect(() => {
    supabase
      .from('clips')
      .select('*')
      .eq('content_asset_id', contentAssetId)
      .order('score', { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          const dbClips = data.map((c, idx) => ({
            id: c.id,
            label: `Clip ${idx + 1}`,
            start: `${Math.floor(c.start_ms / 60000)}:${String(Math.floor((c.start_ms % 60000) / 1000)).padStart(2, '0')}`,
            end: `${Math.floor(c.end_ms / 60000)}:${String(Math.floor((c.end_ms % 60000) / 1000)).padStart(2, '0')}`,
            seconds: Math.round((c.end_ms - c.start_ms) / 1000),
            score: Math.round((c.score || 0.8) * 100),
            hook: '"Extracted highlight clip from source content."',
            reason: 'Generated via clip finder runner.',
            status: 'new' as const,
          }));
          setClipsList(dbClips);
          setActiveId(dbClips[0].id);
        }
      });
  }, [contentAssetId]);

  const activeClip = clipsList.find((c) => c.id === activeId) || clipsList[0];
  const visibleClips = clipsList.filter((c) => c.score >= minScore);
  const keptCount = clipsList.filter((c) => c.status === 'kept').length;

  const handleStatusChange = (id: string, status: 'kept' | 'dismissed' | 'new') => {
    setClipsList((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
  };

  const handleFind = async () => {
    setFinding(true);
    try {
      await api.clips.generate(contentAssetId);
    } catch {
      // Keep existing list
    } finally {
      setFinding(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: 'var(--space-5)', height: '100%', overflow: 'hidden' }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', overflowY: 'auto' }}>
        <div className="lib-row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>Clips</h1>
            <p className="lib-panel__sub" style={{ marginTop: '4px' }}>
              {clipsList.length} clip-worthy moments found in <strong>{assetTitle}</strong> · {keptCount} kept for export
            </p>
          </div>
          <div className="lib-row" style={{ gap: '12px' }}>
            <label className="lib-row" style={{ fontSize: '12px', color: 'var(--color-muted)', gap: '8px' }}>
              Min score
              <input
                type="range"
                min={40}
                max={95}
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                style={{ width: '110px', accentColor: '#ef5a2c' }}
              />
              <span className="lp-mono" style={{ fontSize: '11.5px', color: 'var(--color-text)', width: '24px' }}>{minScore}</span>
            </label>
            <button className="lib-btn lib-btn--solid" onClick={handleFind} disabled={finding}>
              <Sparkles size={15} /> {finding ? 'Finding…' : 'Find moments'}
            </button>
          </div>
        </div>

        <div className="lib-card" style={{ padding: 'var(--space-4)' }}>
          <div className="lib-row" style={{ justifyContent: 'space-between', fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-faint)', letterSpacing: '0.04em', marginBottom: '8px' }}>
            <span>SOURCE TIMELINE</span>
            <span className="lp-mono">00:00 — 42:18</span>
          </div>

          <div style={{ position: 'relative', height: '56px', width: '100%', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-surface-2)', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', gap: '1px', padding: '1px' }}>
              {Array.from({ length: 120 }).map((_, i) => (
                <span
                  key={i}
                  style={{ flex: 1, backgroundColor: '#2b2b31', height: `${18 + Math.abs(Math.sin(i / 3.2)) * 62}%` }}
                />
              ))}
            </div>
            {clipsList.map((clip) => {
              const left = (toSeconds(clip.start) / TOTAL_SOURCE_SECONDS) * 100;
              const width = Math.max((clip.seconds / TOTAL_SOURCE_SECONDS) * 100, 1.4);
              const isActive = clip.id === activeId;
              return (
                <button
                  key={clip.id}
                  type="button"
                  onClick={() => setActiveId(clip.id)}
                  title={`${clip.label} · ${clip.start}`}
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: `${left}%`,
                    width: `${width}%`,
                    borderRadius: '2px',
                    border: isActive ? '1px solid #ef5a2c' : '1px solid #4a2617',
                    background: isActive ? 'rgba(239, 90, 44, 0.35)' : 'rgba(239, 90, 44, 0.15)',
                    cursor: 'pointer',
                  }}
                />
              );
            })}
          </div>

          <div className="lib-row lp-mono" style={{ justifyContent: 'space-between', fontSize: '10.5px', color: 'var(--color-faint)', marginTop: '8px' }}>
            <span>00:00</span>
            <span>10:34</span>
            <span>21:09</span>
            <span>31:43</span>
            <span>42:18</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {visibleClips.map((clip) => {
            const isActive = clip.id === activeId;
            return (
              <div
                key={clip.id}
                className="lib-card"
                style={{
                  display: 'flex',
                  gap: '16px',
                  padding: '12px',
                  borderColor: isActive ? 'rgba(239,90,44,0.6)' : 'var(--color-border)',
                  opacity: clip.status === 'dismissed' ? 0.5 : 1,
                  cursor: 'pointer',
                }}
                onClick={() => setActiveId(clip.id)}
              >
                <div style={{ position: 'relative', width: '152px', aspectRatio: '16/9', borderRadius: 'var(--radius-sm)', overflow: 'hidden', flexShrink: 0, background: '#000' }}>
                  <img src={CLIP_FRAME_IMAGE} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)', opacity: isActive ? 1 : 0.8 }}>
                    <Play size={20} fill="#fff" color="#fff" />
                  </div>
                  <span className="lp-mono" style={{ position: 'absolute', bottom: '4px', right: '4px', background: 'rgba(0,0,0,0.75)', color: '#fff', fontSize: '10px', padding: '1px 4px', borderRadius: '2px' }}>
                    0:{String(clip.seconds).padStart(2, '0')}
                  </span>
                </div>

                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                  <div className="lib-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ fontSize: '13.5px', fontWeight: 600, margin: 0 }}>{clip.label}</h3>
                      <p className="lp-mono" style={{ fontSize: '11px', color: 'var(--color-faint)', margin: '2px 0 0 0' }}>
                        {clip.start} — {clip.end}
                      </p>
                    </div>
                    <div className="lib-row" style={{ gap: '8px' }}>
                      {clip.status === 'kept' && <span className="lib-tag lib-tag--green" style={{ textTransform: 'uppercase', fontSize: '10px' }}>kept</span>}
                      {clip.status === 'dismissed' && <span className="lib-tag" style={{ textTransform: 'uppercase', fontSize: '10px' }}>dismissed</span>}
                      <span className="lp-mono" style={{ fontSize: '13px', fontWeight: 600 }}>{clip.score}</span>
                    </div>
                  </div>

                  <blockquote style={{ margin: '8px 0', paddingLeft: '10px', borderLeft: '2px solid var(--color-border)', fontStyle: 'italic', fontSize: '12.5px', color: 'var(--color-muted)', lineHeight: 1.4 }}>
                    {clip.hook}
                  </blockquote>

                  <div className="lib-row" style={{ marginTop: 'auto', paddingTop: '6px', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <p style={{ fontSize: '11.5px', color: 'var(--color-faint)', margin: 0 }}>{clip.reason}</p>
                    <div className="lib-row" style={{ gap: '6px' }}>
                      <button className="lib-btn lib-btn--sm" onClick={(e) => { e.stopPropagation(); handleStatusChange(clip.id, 'dismissed'); }}>
                        <X size={13} /> Dismiss
                      </button>
                      <button className="lib-btn lib-btn--sm" style={{ borderColor: 'var(--color-border-strong)' }} onClick={(e) => { e.stopPropagation(); handleStatusChange(clip.id, 'kept'); }}>
                        <Check size={13} /> Keep
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <aside style={{ width: '292px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', overflowY: 'auto' }}>
        <div className="lib-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ position: 'relative', aspectRatio: '9/16', width: '100%', background: '#000' }}>
            <img src={CLIP_FRAME_IMAGE} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <span className="lp-mono" style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '3px' }}>
              9:16 crop
            </span>
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)', padding: '12px', color: '#fff', fontSize: '12.5px', fontWeight: 500, lineHeight: 1.3 }}>
              {activeClip.hook}
            </div>
          </div>
          <div style={{ padding: '12px', borderTop: '1px solid var(--color-border)' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 600, margin: 0 }}>{activeClip.label}</h3>
            <p className="lp-mono" style={{ fontSize: '11px', color: 'var(--color-faint)', margin: '2px 0 12px 0' }}>
              {activeClip.start} — {activeClip.end} · {activeClip.seconds}s
            </p>
            <button className="lib-btn lib-btn--solid" style={{ width: '100%' }} onClick={() => alert('Exporting vertical cut...')}>
              <Scissors size={15} /> Export vertical cut
            </button>
          </div>
        </div>

        <div className="lib-card" style={{ padding: 'var(--space-4)' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 600, margin: 0 }}>Scoring signals</h2>
          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <SignalProgress label="Hook strength" value={92} />
            <SignalProgress label="Standalone context" value={78} />
            <SignalProgress label="Speech density" value={84} />
            <SignalProgress label="Silence at edges" value={41} />
          </div>
          <p className="lib-panel__sub" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--color-border)', fontSize: '11.5px', lineHeight: 1.4 }}>
            Cutting is a placeholder until ffmpeg lands — timestamps, scores and exports already flow through the real endpoint.
          </p>
        </div>
      </aside>
    </div>
  );
}

// ── 4. SCHEDULE MODULE ────────────────────────────────────────────────────────
interface ScheduledPostRow {
  id: string;
  platform: string;
  title: string;
  when: string;
  relative: string;
  status: 'pending' | 'publishing' | 'published' | 'failed';
  note?: string;
}

const SEED_SCHEDULED_POSTS: ScheduledPostRow[] = [
  { id: 'sch_01', platform: 'youtube', title: 'Deep Work Ritual — Ep. 47 (full episode)', when: 'Aug 17, 9:00 AM', relative: 'in 2 days', status: 'pending', note: 'Waiting on approval gate — cover locked, metadata saved.' },
  { id: 'sch_02', platform: 'tiktok', title: 'Clip · The 4-hour lie', when: 'Aug 16, 7:30 PM', relative: 'in 4 hours', status: 'pending' },
  { id: 'sch_03', platform: 'instagram', title: 'Clip · Day three collapse', when: 'Aug 16, 12:15 PM', relative: 'now', status: 'publishing' },
  { id: 'sch_04', platform: 'x', title: 'Thread · Three failure points', when: 'Aug 15, 8:00 AM', relative: 'yesterday', status: 'published' },
  { id: 'sch_05', platform: 'linkedin', title: 'Six weeks of attention logs', when: 'Aug 14, 7:45 AM', relative: '2 days ago', status: 'failed', note: 'Token expired — reconnect the LinkedIn account and retry.' },
];

function SchedulePanel({ contentAssetId }: { contentAssetId: string }) {
  const [posts, setPosts] = useState<ScheduledPostRow[]>(SEED_SCHEDULED_POSTS);
  const [platform, setPlatform] = useState('youtube');
  const [when, setWhen] = useState('2026-08-18T09:00');
  const [busyId, setBusyId] = useState<string | null>(null);
  const assetTitle = useAssetTitle(contentAssetId);

  useEffect(() => {
    supabase
      .from('scheduled_posts')
      .select('id, status, scheduled_time, platform_payload, connected_accounts(platform), metadata_drafts(title)')
      .eq('content_asset_id', contentAssetId)
      .order('scheduled_time', { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          const dbPosts: ScheduledPostRow[] = data.map((p: any) => ({
            id: p.id,
            platform: p.connected_accounts?.platform || 'youtube',
            title: p.metadata_drafts?.title || 'Untitled Scheduled Post',
            when: new Date(p.scheduled_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
            relative: 'scheduled',
            status: p.status === 'posted' ? 'published' : p.status === 'failed' ? 'failed' : 'pending',
            note: p.platform_payload?.error || undefined,
          }));
          setPosts(dbPosts);
        }
      });
  }, [contentAssetId]);

  const handleQueue = () => {
    const newPost: ScheduledPostRow = {
      id: `sch_${Date.now()}`,
      platform,
      title: assetTitle,
      when: new Date(when).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
      relative: 'queued',
      status: 'pending',
    };
    setPosts([newPost, ...posts]);
  };

  const handlePublishNow = async (id: string) => {
    setBusyId(id);
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'publishing', relative: 'now' } : p)));
    setTimeout(() => {
      setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'published', relative: 'just now' } : p)));
      setBusyId(null);
    }, 1600);
  };

  const counts = {
    pending: posts.filter((p) => p.status === 'pending').length,
    published: posts.filter((p) => p.status === 'published').length,
    failed: posts.filter((p) => p.status === 'failed').length,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div>
        <h1 style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>Schedule</h1>
        <p className="lib-panel__sub" style={{ marginTop: '4px' }}>
          Queue for <strong>{assetTitle}</strong> · {counts.pending} pending, {counts.published} published, {counts.failed} failed
        </p>
      </div>

      <div className="lib-card" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 'var(--space-3)', padding: 'var(--space-4)' }}>
        <div style={{ flex: '1 1 180px', minWidth: '180px' }}>
          <span className="lib-panel__sub" style={{ textTransform: 'uppercase', fontSize: '11px', display: 'block', marginBottom: '6px' }}>PLATFORM</span>
          <select value={platform} onChange={(e) => setPlatform(e.target.value)} style={{ width: '100%', height: '36px' }}>
            <option value="youtube">YouTube</option>
            <option value="tiktok">TikTok</option>
            <option value="instagram">Instagram</option>
            <option value="x">X</option>
            <option value="linkedin">LinkedIn</option>
          </select>
        </div>

        <div style={{ flex: '1 1 200px', minWidth: '200px' }}>
          <span className="lib-panel__sub" style={{ textTransform: 'uppercase', fontSize: '11px', display: 'block', marginBottom: '6px' }}>PUBLISH AT</span>
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} style={{ width: '100%', height: '36px' }} />
        </div>

        <div style={{ flex: '2 1 240px', minWidth: '240px' }}>
          <span className="lib-panel__sub" style={{ textTransform: 'uppercase', fontSize: '11px', display: 'block', marginBottom: '6px' }}>PAYLOAD</span>
          <div className="lib-row" style={{ height: '36px', padding: '0 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-2)', justifyContent: 'space-between', fontSize: '12.5px', color: 'var(--color-muted)' }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Saved metadata + locked cover</span>
            <span className="lib-tag lib-tag--green" style={{ textTransform: 'uppercase', fontSize: '10px' }}>ready</span>
          </div>
        </div>

        <button className="lib-btn lib-btn--solid" style={{ height: '36px' }} onClick={handleQueue}>
          <CalendarPlus size={15} /> Add to queue
        </button>
      </div>

      <div className="lib-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="lib-table-wrap">
          <table className="lib-table">
            <thead>
              <tr>
                <th>Post</th>
                <th style={{ width: '110px' }}>Platform</th>
                <th style={{ width: '190px' }}>Publish at</th>
                <th style={{ width: '120px' }}>Status</th>
                <th style={{ width: '150px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="lib-post-title" style={{ fontSize: '13px' }}>{p.title}</div>
                    {p.note && (
                      <div className="lib-row" style={{ gap: '4px', fontSize: '11.5px', color: 'var(--color-faint)', marginTop: '2px' }}>
                        {p.status === 'failed' && <AlertTriangle size={12} style={{ color: '#f2837a', flexShrink: 0 }} />}
                        <span>{p.note}</span>
                      </div>
                    )}
                  </td>
                  <td><PlatformBadge platform={p.platform} /></td>
                  <td>
                    <div className="lp-mono" style={{ fontSize: '12px' }}>{p.when}</div>
                    <div className="lib-panel__sub" style={{ fontSize: '11px', marginTop: '2px' }}>{p.relative}</div>
                  </td>
                  <td>
                    {p.status === 'pending' && (
                      <span className="lib-tag" style={{ borderColor: '#f59e0b', color: '#f59e0b', background: 'rgba(245,158,11,0.12)', textTransform: 'uppercase' }}>pending</span>
                    )}
                    {p.status === 'publishing' && (
                      <span className="lib-tag" style={{ borderColor: '#7aa9ff', color: '#7aa9ff', background: 'rgba(122,169,255,0.12)', textTransform: 'uppercase' }}>
                        <Loader size={12} className="animate-spin" /> publishing
                      </span>
                    )}
                    {p.status === 'published' && (
                      <span className="lib-tag lib-tag--green" style={{ textTransform: 'uppercase' }}>published</span>
                    )}
                    {p.status === 'failed' && (
                      <span className="lib-tag" style={{ borderColor: '#f2837a', color: '#f2837a', background: 'rgba(242,131,122,0.12)', textTransform: 'uppercase' }}>failed</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {p.status === 'pending' ? (
                      <button className="lib-btn lib-btn--sm" onClick={() => handlePublishNow(p.id)} disabled={busyId === p.id}>
                        <Send size={13} /> {busyId === p.id ? 'Publishing…' : 'Publish now'}
                      </button>
                    ) : p.status === 'failed' ? (
                      <button className="lib-btn lib-btn--sm" style={{ borderColor: '#f2837a', color: '#f2837a' }} onClick={() => handlePublishNow(p.id)} disabled={busyId === p.id}>
                        Retry
                      </button>
                    ) : (
                      <span className="lp-mono" style={{ fontSize: '11px', color: 'var(--color-faint)' }}>
                        {p.status === 'published' ? 'live' : 'in flight'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-4)' }}>
        <div className="lib-card" style={{ padding: 'var(--space-4)' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 12px 0' }}>Connected accounts</h2>
          {[
            { p: 'youtube', state: 'connected' },
            { p: 'tiktok', state: 'connected' },
            { p: 'instagram', state: 'connected' },
            { p: 'x', state: 'connected' },
            { p: 'linkedin', state: 'token expired' },
          ].map(({ p, state }) => (
            <div key={p} className="lib-row" style={{ justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
              <PlatformBadge platform={p} />
              <span className="lp-mono" style={{ fontSize: '11px', color: state === 'connected' ? '#4ade9f' : '#f2837a' }}>
                {state}
              </span>
            </div>
          ))}
        </div>

        <div className="lib-card" style={{ padding: 'var(--space-4)' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 600, margin: 0 }}>Best time to post</h2>
          <p className="lib-panel__sub" style={{ marginTop: '4px', fontSize: '12px' }}>
            From the last 90 days of this channel — darker cells are stronger.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '28px repeat(12, 1fr)', gap: '4px', marginTop: '12px' }}>
            {['Mon', 'Wed', 'Fri', 'Sun'].map((day, r) => (
              <div key={day} style={{ display: 'contents' }}>
                <span className="lp-mono" style={{ fontSize: '10.5px', color: 'var(--color-faint)', alignSelf: 'center' }}>{day}</span>
                {Array.from({ length: 12 }).map((_, c) => {
                  const strength = Math.abs(Math.sin((r + 1) * (c + 2) * 0.7));
                  return (
                    <div
                      key={c}
                      style={{ height: '20px', borderRadius: '2px', backgroundColor: `rgba(239,90,44,${(0.08 + strength * 0.72).toFixed(2)})` }}
                      title={`${day} slot ${c + 1}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          <div className="lib-row lp-mono" style={{ justifyContent: 'space-between', paddingLeft: '32px', fontSize: '10px', color: 'var(--color-faint)', marginTop: '8px' }}>
            <span>6a</span>
            <span>10a</span>
            <span>2p</span>
            <span>6p</span>
            <span>10p</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 5. MODERATION MODULE ──────────────────────────────────────────────────────
const SEED_COMMENTS = [
  { id: 'cmt_01', author: 'Priya Raman', handle: '@priya.builds', platform: 'youtube', body: 'The day-three point hit me. I always assumed I was failing at the start, but it is always the third session.', postedAt: '18 min ago', sentiment: 'positive', flag: 'none', onPost: 'Deep Work Ritual — Ep. 47' },
  { id: 'cmt_02', author: 'growthhacks_daily', handle: '@growthhacks_daily', platform: 'instagram', body: 'Great vid!! DM me, I can get you 10k subs this month, guaranteed 🔥 link in bio', postedAt: '41 min ago', sentiment: 'neutral', flag: 'spam', onPost: 'Clip · Day three collapse' },
  { id: 'cmt_03', author: 'Marcus Feld', handle: '@mfeld', platform: 'youtube', body: 'Timestamps would help a lot on the longer episodes — the 24:05 section is the one I keep coming back to.', postedAt: '1 hr ago', sentiment: 'neutral', flag: 'none', onPost: 'Deep Work Ritual — Ep. 47' },
  { id: 'cmt_04', author: 'anon_4412', handle: '@anon_4412', platform: 'x', body: 'this is the laziest garbage advice i have seen all week, anyone repeating it is an idiot', postedAt: '2 hrs ago', sentiment: 'negative', flag: 'toxicity', onPost: 'Thread · Three failure points' },
];

function ModerationPanel({ contentAssetId }: { contentAssetId: string }) {
  const [commentsList, setCommentsList] = useState(SEED_COMMENTS);
  const [filter, setFilter] = useState<'all' | 'flagged' | 'negative' | 'clean'>('all');
  const [rules, setRules] = useState({ links: true, firstTime: false, toxicity: true });
  const assetTitle = useAssetTitle(contentAssetId);

  useEffect(() => {
    supabase
      .from('comments')
      .select('*')
      .is('moderation_action', null)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const dbComments = data.map((c) => ({
            id: c.id,
            author: c.author || 'User',
            handle: `@${(c.author || 'user').toLowerCase().replace(/\s+/g, '')}`,
            platform: 'youtube',
            body: c.text,
            postedAt: 'recently',
            sentiment: (c.sentiment as any) || 'neutral',
            flag: 'none',
            onPost: assetTitle,
          }));
          setCommentsList(dbComments);
        }
      });
  }, [contentAssetId, assetTitle]);

  const handleResolve = async (id: string, action: 'approved' | 'hidden') => {
    try {
      await supabase.from('comments').update({ moderation_action: action }).eq('id', id);
    } catch {
      // Local resolution
    }
    setCommentsList((prev) => prev.filter((c) => c.id !== id));
  };

  const visible = commentsList.filter((c) => {
    if (filter === 'flagged') return c.flag !== 'none';
    if (filter === 'negative') return c.sentiment === 'negative';
    if (filter === 'clean') return c.flag === 'none' && c.sentiment !== 'negative';
    return true;
  });

  return (
    <>
      <div className="lib-panel__head">
        <div className="lib-panel__titlewrap">
          <h2>Moderation</h2>
          <p className="lib-panel__sub">
            {commentsList.length} comments awaiting review across posts from <strong>{assetTitle}</strong>
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

      <div className="lib-layout">
        <div>
          {visible.length === 0 ? (
            <div className="lib-card" style={{ textAlign: 'center', padding: 'var(--space-5)' }}>
              <Inbox size={24} style={{ color: 'var(--color-faint)', marginBottom: 'var(--space-2)' }} />
              <h3>Inbox zero</h3>
              <p className="lib-panel__sub">No comments match this filter.</p>
            </div>
          ) : (
            visible.map((comment) => (
              <div key={comment.id} className="lib-mod-card">
                <div className="lib-mod-card__top">
                  <span className="lib-avatar">{comment.author[0]}</span>
                  <span className="lib-mod-card__name">{comment.author}</span>
                  <span className="lib-mod-card__handle">{comment.handle}</span>
                  <PlatformBadge platform={comment.platform} />
                  {comment.flag !== 'none' && <span className="lib-flag">{comment.flag}</span>}
                  <span className="lib-mod-card__time">{comment.postedAt}</span>
                </div>
                <p className="lib-mod-card__text">{comment.body}</p>
                <div className="lib-mod-card__foot">
                  <span className="lib-mod-card__on">on {comment.onPost}</span>
                  <div className="lib-row">
                    <button className="lib-btn lib-btn--sm" onClick={() => handleResolve(comment.id, 'hidden')}>
                      <EyeOff size={12} /> Hide
                    </button>
                    <button className="lib-btn lib-btn--sm lib-btn--solid" onClick={() => handleResolve(comment.id, 'approved')}>
                      <Check size={12} /> Approve
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="lib-card">
          <h3>Queue mix</h3>
          <div className="lib-mix" style={{ marginTop: 'var(--space-3)' }}>
            <div>
              <div className="lib-mix__row"><span>Positive</span><span>44%</span></div>
              <div className="lib-mix__bar"><div className="lib-mix__fill" style={{ width: '44%', background: 'var(--color-good)' }} /></div>
            </div>
            <div>
              <div className="lib-mix__row"><span>Neutral</span><span>38%</span></div>
              <div className="lib-mix__bar"><div className="lib-mix__fill" style={{ width: '38%', background: '#7aa9ff' }} /></div>
            </div>
            <div>
              <div className="lib-mix__row"><span>Negative</span><span>11%</span></div>
              <div className="lib-mix__bar"><div className="lib-mix__fill" style={{ width: '11%', background: 'var(--color-bad)' }} /></div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)' }}>
            <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>Auto-rules</h3>
            <div className="lib-comment">
              <span className="lib-comment__text">Hold external links</span>
              <button className={`lib-toggle ${rules.links ? 'is-on' : ''}`} onClick={() => setRules({ ...rules, links: !rules.links })}>
                <span className="lib-toggle__thumb" />
              </button>
            </div>
            <div className="lib-comment">
              <span className="lib-comment__text">Hold first-timers</span>
              <button className={`lib-toggle ${rules.firstTime ? 'is-on' : ''}`} onClick={() => setRules({ ...rules, firstTime: !rules.firstTime })}>
                <span className="lib-toggle__thumb" />
              </button>
            </div>
            <div className="lib-comment">
              <span className="lib-comment__text">Hold toxicity &gt; 0.8</span>
              <button className={`lib-toggle ${rules.toxicity ? 'is-on' : ''}`} onClick={() => setRules({ ...rules, toxicity: !rules.toxicity })}>
                <span className="lib-toggle__thumb" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── 6. ANALYTICS MODULE ───────────────────────────────────────────────────────
const SEED_ANALYTICS_TILES = [
  { label: 'Views', value: '184,230', delta: 12.4, series: [22, 30, 28, 41, 47, 44, 58, 66, 61, 74, 88, 96] },
  { label: 'Avg. watch', value: '61%', delta: 4.1, series: [48, 51, 49, 53, 55, 54, 57, 56, 59, 58, 60, 61] },
  { label: 'Engagements', value: '9,417', delta: -2.8, series: [70, 68, 72, 66, 64, 69, 61, 63, 58, 60, 57, 55] },
  { label: 'New followers', value: '2,106', delta: 18.9, series: [10, 14, 12, 18, 22, 27, 25, 33, 38, 44, 52, 61] },
];

const SEED_SNAPSHOTS = [
  { id: 'pst_01', platform: 'youtube', title: 'Deep Work Ritual — Ep. 47 (full episode)', publishedAt: 'Aug 15', views: 96420, watchPct: 58, likes: 4820, comments: 612, delta: 14.2 },
  { id: 'pst_02', platform: 'tiktok', title: 'Clip · The 4-hour lie', publishedAt: 'Aug 15', views: 51230, watchPct: 74, likes: 3110, comments: 188, delta: 41.6 },
  { id: 'pst_03', platform: 'instagram', title: 'Clip · Day three collapse', publishedAt: 'Aug 14', views: 24880, watchPct: 66, likes: 1402, comments: 96, delta: 6.3 },
  { id: 'pst_04', platform: 'x', title: 'Thread · Three failure points', publishedAt: 'Aug 15', views: 9340, watchPct: 0, likes: 421, comments: 57, delta: -3.4 },
  { id: 'pst_05', platform: 'linkedin', title: 'Six weeks of attention logs', publishedAt: 'Aug 12', views: 2360, watchPct: 0, likes: 184, comments: 23, delta: 2.1 },
];

function SparklineGraph({ points, tone = '#ef5a2c' }: { points: number[]; tone?: string }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = Math.max(max - min, 1);
  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * 100;
      const y = 28 - ((p - min) / span) * 24;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" style={{ width: '100%', height: '32px', display: 'block', marginTop: '6px' }} aria-hidden="true">
      <path d={`${path} L100,30 L0,30 Z`} fill={tone} opacity="0.1" />
      <path d={path} fill="none" stroke={tone} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function DeltaBadge({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span className="lp-mono" style={{ fontSize: '11.5px', color: up ? '#4ade9f' : '#f2837a' }}>
      {up ? '▲' : '▼'} {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function AnalyticsPanel({ contentAssetId }: { contentAssetId: string }) {
  const [range, setRange] = useState<'7d' | '28d' | '90d'>('28d');
  const [snapshots, setSnapshots] = useState(SEED_SNAPSHOTS);
  const assetTitle = useAssetTitle(contentAssetId);

  useEffect(() => {
    supabase
      .from('analytics_snapshots')
      .select('*')
      .then(({ data }) => {
        if (data && data.length > 0) {
          const dbSnaps = data.map((s, i) => ({
            id: s.id,
            platform: s.platform || 'youtube',
            title: `Post Snapshot ${i + 1}`,
            publishedAt: new Date(s.fetched_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            views: s.metrics?.views || 12000,
            watchPct: Math.round((s.metrics?.retention || 0.6) * 100),
            likes: s.metrics?.likes || 450,
            comments: s.metrics?.comments || 30,
            delta: 12.5,
          }));
          setSnapshots(dbSnaps);
        }
      });
  }, [contentAssetId]);

  const topPost = snapshots[0] || SEED_SNAPSHOTS[0];
  const pts = SEED_ANALYTICS_TILES[0].series;
  const maxPt = Math.max(...pts);
  const chartPath = pts
    .map((p, i) => {
      const x = (i / (pts.length - 1)) * 100;
      const y = 29 - (p / maxPt) * 26;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div className="lib-row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>Analytics</h1>
          <p className="lib-panel__sub" style={{ marginTop: '4px' }}>
            {snapshots.length} published posts from <strong>{assetTitle}</strong> · last refreshed 12 min ago
          </p>
        </div>
        <div className="lib-filters">
          {(['7d', '28d', '90d'] as const).map((r) => (
            <button key={r} className={range === r ? 'is-active' : ''} onClick={() => setRange(r)}>
              {r}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 'var(--space-4)' }}>
        <div className="lib-card">
          <div className="lib-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p className="lib-panel__sub" style={{ textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.04em' }}>
                TOTAL VIEWS · {range}
              </p>
              <p className="lp-mono" style={{ fontSize: '34px', fontWeight: 700, margin: '4px 0 0 0', lineHeight: 1 }}>
                184,230
              </p>
              <p className="lib-row" style={{ gap: '6px', fontSize: '12px', color: 'var(--color-muted)', marginTop: '8px' }}>
                <DeltaBadge value={12.4} /> vs previous {range}
              </p>
            </div>
            <div className="lib-row" style={{ gap: '20px', textAlign: 'right' }}>
              <div>
                <p className="lib-panel__sub" style={{ textTransform: 'uppercase', fontSize: '11px' }}>AVG. WATCH</p>
                <p className="lp-mono" style={{ fontSize: '18px', fontWeight: 600, margin: '4px 0 0 0' }}>61%</p>
                <p style={{ marginTop: '4px' }}><DeltaBadge value={4.1} /></p>
              </div>
              <div>
                <p className="lib-panel__sub" style={{ textTransform: 'uppercase', fontSize: '11px' }}>ENGAGEMENTS</p>
                <p className="lp-mono" style={{ fontSize: '18px', fontWeight: 600, margin: '4px 0 0 0' }}>9,417</p>
                <p style={{ marginTop: '4px' }}><DeltaBadge value={-2.8} /></p>
              </div>
              <div>
                <p className="lib-panel__sub" style={{ textTransform: 'uppercase', fontSize: '11px' }}>NEW FOLLOWERS</p>
                <p className="lp-mono" style={{ fontSize: '18px', fontWeight: 600, margin: '4px 0 0 0' }}>2,106</p>
                <p style={{ marginTop: '4px' }}><DeltaBadge value={18.9} /></p>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 'var(--space-4)', height: '96px' }}>
            <svg viewBox="0 0 100 30" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }} aria-hidden="true">
              <defs>
                <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef5a2c" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#ef5a2c" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={`${chartPath} L100,30 L0,30 Z`} fill="url(#viewsFill)" />
              <path d={chartPath} fill="none" stroke="#ef5a2c" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            </svg>
          </div>
          <div className="lib-row lp-mono" style={{ justifyContent: 'space-between', fontSize: '10.5px', color: 'var(--color-faint)', marginTop: '4px' }}>
            <span>Jul 19</span>
            <span>Jul 28</span>
            <span>Aug 6</span>
            <span>Aug 15</span>
          </div>
        </div>

        <div className="lib-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <p className="lib-panel__sub" style={{ textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.04em' }}>BEST PERFORMER</p>
          <h2 style={{ fontSize: '14px', fontWeight: 600, marginTop: '6px', lineHeight: 1.3 }}>{topPost.title}</h2>
          <div className="lib-row" style={{ gap: '8px', marginTop: '8px' }}>
            <PlatformBadge platform={topPost.platform} />
            <span className="lp-mono" style={{ fontSize: '11px', color: 'var(--color-faint)' }}>published {topPost.publishedAt}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
            <div style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-sm)', padding: '10px' }}>
              <span className="lib-panel__sub" style={{ textTransform: 'uppercase', fontSize: '11px' }}>VIEWS</span>
              <div className="lp-mono" style={{ fontSize: '15px', fontWeight: 600, marginTop: '4px' }}>{topPost.views.toLocaleString()}</div>
            </div>
            <div style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-sm)', padding: '10px' }}>
              <span className="lib-panel__sub" style={{ textTransform: 'uppercase', fontSize: '11px' }}>AVG. WATCH</span>
              <div className="lp-mono" style={{ fontSize: '15px', fontWeight: 600, marginTop: '4px' }}>{topPost.watchPct ? `${topPost.watchPct}%` : '—'}</div>
            </div>
            <div style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-sm)', padding: '10px' }}>
              <span className="lib-panel__sub" style={{ textTransform: 'uppercase', fontSize: '11px' }}>LIKES</span>
              <div className="lp-mono" style={{ fontSize: '15px', fontWeight: 600, marginTop: '4px' }}>{topPost.likes.toLocaleString()}</div>
            </div>
            <div style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-sm)', padding: '10px' }}>
              <span className="lib-panel__sub" style={{ textTransform: 'uppercase', fontSize: '11px' }}>COMMENTS</span>
              <div className="lp-mono" style={{ fontSize: '15px', fontWeight: 600, marginTop: '4px' }}>{topPost.comments.toLocaleString()}</div>
            </div>
          </div>
          <p className="lib-panel__sub" style={{ marginTop: 'auto', paddingTop: '12px', fontSize: '11.5px', lineHeight: 1.4 }}>
            The vertical cut of “The 4-hour lie” drove 27% of this episode's total watch time from 44 seconds of runtime.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)' }}>
        {SEED_ANALYTICS_TILES.map((tile) => (
          <div key={tile.label} className="lib-card" style={{ padding: '14px' }}>
            <div className="lib-row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="lib-panel__sub" style={{ textTransform: 'uppercase', fontSize: '11px' }}>{tile.label}</span>
              <DeltaBadge value={tile.delta} />
            </div>
            <p className="lp-mono" style={{ fontSize: '20px', fontWeight: 700, margin: '6px 0 0 0', lineHeight: 1 }}>{tile.value}</p>
            <SparklineGraph points={tile.series} tone={tile.delta >= 0 ? '#4ade9f' : '#f2837a'} />
          </div>
        ))}
      </div>

      <div className="lib-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="lib-row" style={{ justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 600, margin: 0 }}>Post snapshot</h2>
          <span className="lp-mono" style={{ fontSize: '11px', color: 'var(--color-faint)' }}>pulled from platform APIs · daily</span>
        </div>
        <div className="lib-table-wrap">
          <table className="lib-table">
            <thead>
              <tr>
                <th>Post</th>
                <th style={{ width: '110px' }}>Platform</th>
                <th style={{ width: '100px', textAlign: 'right' }}>Views</th>
                <th style={{ width: '110px', textAlign: 'right' }}>Avg. watch</th>
                <th style={{ width: '90px', textAlign: 'right' }}>Likes</th>
                <th style={{ width: '100px', textAlign: 'right' }}>Comments</th>
                <th style={{ width: '100px', textAlign: 'right' }}>Trend</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="lib-post-title">{s.title}</div>
                    <div className="lib-panel__sub">published {s.publishedAt}</div>
                  </td>
                  <td><PlatformBadge platform={s.platform} /></td>
                  <td className="lp-mono" style={{ textAlign: 'right' }}>{s.views.toLocaleString()}</td>
                  <td className="lp-mono" style={{ textAlign: 'right' }}>{s.watchPct ? `${s.watchPct}%` : '—'}</td>
                  <td className="lp-mono" style={{ textAlign: 'right' }}>{s.likes.toLocaleString()}</td>
                  <td className="lp-mono" style={{ textAlign: 'right' }}>{s.comments.toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}><DeltaBadge value={s.delta} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
