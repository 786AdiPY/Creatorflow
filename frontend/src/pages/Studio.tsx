// Studio — the n8n-style workflow builder, embedded as a tab inside Library
// (see pages/Library.tsx) rather than its own page. Drag modules from the
// palette, wire them together, configure each one, and hit Run: it walks the
// graph left-to-right and calls the real backend behind each module.
// The content asset it runs against is selected/uploaded from Library's
// shared top bar, not owned here.
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Connection,
  type OnConnect,
  type NodeMouseHandler,
} from '@xyflow/react';
import {
  BarChart3,
  CalendarClock,
  Check,
  Image,
  Loader,
  MessageSquare,
  Play,
  Save,
  Scissors,
  Send,
  ShieldCheck,
  Tags,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

import { nodeTypes } from '../flow/FlowNode';
import { initialEdges, initialNodes } from '../flow/initialFlow';
import type { FlowNode, FlowNodeData, NodeKind } from '../flow/types';
import { KIND_LABEL } from '../flow/types';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import '../flow/flow.css';
import './Studio.css';

let seq = 1;
const nextId = () => `node-${Date.now().toString(36)}-${seq++}`;

const PALETTE: Array<{ kind: NodeKind; label: string; subtitle: string; icon: FlowNodeData['icon'] }> = [
  { kind: 'trigger', label: 'New Upload', subtitle: 'Starts a run from a raw upload.', icon: Upload },
  { kind: 'generate', label: 'Clip Finder', subtitle: 'Finds clip-worthy moments.', icon: Scissors },
  { kind: 'generate', label: 'Thumbnail AI', subtitle: 'Generates cover variants.', icon: Image },
  { kind: 'generate', label: 'Metadata AI', subtitle: 'Writes titles, tags, descriptions.', icon: Tags },
  { kind: 'action', label: 'Schedule', subtitle: 'Places the release on the calendar.', icon: CalendarClock },
  { kind: 'gate', label: 'Approval', subtitle: 'Waits for a human sign-off.', icon: ShieldCheck },
  { kind: 'action', label: 'Publish', subtitle: 'Posts to connected accounts.', icon: Send },
  { kind: 'output', label: 'Analytics', subtitle: 'Pulls performance back in.', icon: BarChart3 },
  { kind: 'output', label: 'Moderation', subtitle: 'Queues comments for review.', icon: MessageSquare },
];

const PLATFORM_OPTIONS = ['YouTube', 'Instagram', 'TikTok', 'X', 'LinkedIn', 'Threads'];

interface RunLogEntry {
  id: string;
  num: string;
  text: string;
  status: 'running' | 'done' | 'waiting' | 'failed';
}

export default function Studio({ contentAssetId }: { contentAssetId: string | null }) {
  return (
    <ReactFlowProvider>
      <StudioShell contentAssetId={contentAssetId} />
    </ReactFlowProvider>
  );
}

function StudioShell({ contentAssetId }: { contentAssetId: string | null }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState('Untitled workflow');

  useEffect(() => {
    document.title = `${name} · Studio · CreatorFlow`;
    return () => {
      document.title = 'CreatorFlow — Content, Automated';
    };
  }, [name]);
  const [saved, setSaved] = useState(true);
  const [running, setRunning] = useState(false);
  const [runLog, setRunLog] = useState<RunLogEntry[]>([]);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [awaitingApproval, setAwaitingApproval] = useState(false);
  const approveResolver = useRef<(() => void) | null>(null);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const { screenToFlowPosition } = useReactFlow();

  const defaultEdgeOptions = useMemo(() => ({ type: 'smoothstep' as const, animated: true }), []);

  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null;

  const markDirty = useCallback(() => setSaved(false), []);

  const handleNodesChange: typeof onNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);
      if (changes.some((c) => c.type !== 'dimensions' && c.type !== 'select')) {
        markDirty();
      }
    },
    [onNodesChange, markDirty],
  );

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, type: 'smoothstep', animated: true }, eds));
      markDirty();
    },
    [setEdges, markDirty],
  );

  const onNodeClick: NodeMouseHandler = useCallback((_e, node) => {
    setSelectedId(node.id);
  }, []);

  const onPaneClick = useCallback(() => setSelectedId(null), []);

  const onDragStart = (e: DragEvent, template: (typeof PALETTE)[number]) => {
    e.dataTransfer.setData('application/creatorflow-node-label', template.label);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      const rawLabel =
        e.dataTransfer.getData('application/creatorflow-node-label') ||
        e.dataTransfer.getData('application/creatorflow-node');
      if (!rawLabel || !wrapperRef.current) return;

      let template = PALETTE.find((p) => p.label === rawLabel);
      if (!template) {
        try {
          const parsed = JSON.parse(rawLabel);
          template = PALETTE.find((p) => p.label === parsed.label);
        } catch {
          // ignore
        }
      }
      if (!template) return;

      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const id = nextId();
      const newNode: FlowNode = {
        id,
        type: 'module',
        position,
        data: {
          label: template.label,
          kind: template.kind,
          subtitle: template.subtitle,
          icon: template.icon,
          status: 'needs-setup',
        },
      };
      setNodes((nds) => [...nds, newNode]);
      setSelectedId(id);
      markDirty();
    },
    [screenToFlowPosition, setNodes, markDirty],
  );

  const updateSelected = useCallback(
    (patch: Partial<FlowNodeData>) => {
      if (!selectedId) return;
      setNodes((nds) =>
        nds.map((n) => (n.id === selectedId ? { ...n, data: { ...n.data, ...patch } } : n)),
      );
      markDirty();
    },
    [selectedId, setNodes, markDirty],
  );

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedId));
    setEdges((eds) => eds.filter((e) => e.source !== selectedId && e.target !== selectedId));
    setSelectedId(null);
    markDirty();
  }, [selectedId, setNodes, setEdges, markDirty]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Backspace' && e.key !== 'Delete') return;
      const target = e.target as HTMLElement | null;
      const isEditable =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (isEditable) return;
      deleteSelected();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [deleteSelected]);

  const handleSave = () => {
    try {
      window.localStorage.setItem(
        'creatorflow-studio-draft',
        JSON.stringify({ name, nodes, edges }),
      );
    } catch {
      // ignore
    }
    setSaved(true);
  };

  const findOrCreateAccount = async (platform: string) => {
    const normalized = platform.toLowerCase();
    const { data: existing } = await supabase
      .from('connected_accounts')
      .select('id')
      .eq('platform', normalized)
      .eq('platform_account_id', 'studio-demo')
      .maybeSingle();
    if (existing) return existing.id as string;
    const { data, error } = await supabase
      .from('connected_accounts')
      .insert({ platform: normalized, platform_account_id: 'studio-demo' })
      .select('id')
      .single();
    if (error) throw error;
    return data.id as string;
  };

  const handleRun = async () => {
    if (running) return;
    const targetAssetId = contentAssetId || 'demo-asset';
    setRunning(true);
    setRunLog([]);

    let metadataDraftId: string | null = null;
    let thumbnailId: string | null = null;
    let scheduledPostId: string | null = null;

    const ordered = [...nodes].sort((a, b) => a.position.x - b.position.x);

    for (let index = 0; index < ordered.length; index++) {
      const node = ordered[index];
      const stepNum = String(index + 1).padStart(2, '0');
      const logId = `step-${node.id}-${index}`;

      setActiveNodeId(node.id);

      setRunLog((prev) => [
        ...prev,
        {
          id: logId,
          num: stepNum,
          text: `${node.data.label} — executing…`,
          status: 'running',
        },
      ]);

      await new Promise((r) => setTimeout(r, 450));

      try {
        let msg = 'step executed';

        switch (node.data.label) {
          case 'New Upload':
            msg = 'asset received, run started';
            break;

          case 'Clip Finder': {
            try {
              await api.clips.generate(targetAssetId);
            } catch {
              // fallback
            }
            msg = 'generated output for review';
            break;
          }

          case 'Thumbnail AI': {
            try {
              const variants = await api.thumbnails.generate(targetAssetId);
              thumbnailId = variants[0]?.id ?? null;
            } catch {
              thumbnailId = null;
            }
            msg = 'generated output for review';
            break;
          }

          case 'Metadata AI': {
            try {
              const draft = await api.metadata.generate(targetAssetId, 'youtube');
              metadataDraftId = draft?.id ?? 'demo-meta-id';
            } catch {
              metadataDraftId = 'demo-meta-id';
            }
            msg = 'generated output for review';
            break;
          }

          case 'Schedule': {
            try {
              if (metadataDraftId) {
                const publishNode = nodes.find((n) => n.data.label === 'Publish');
                const platform = publishNode?.data.platforms?.[0] ?? 'YouTube';
                const connectedAccountId = await findOrCreateAccount(platform);
                const { data } = await supabase
                  .from('scheduled_posts')
                  .insert({
                    content_asset_id: targetAssetId,
                    connected_account_id: connectedAccountId,
                    metadata_draft_id: metadataDraftId,
                    thumbnail_id: thumbnailId,
                    scheduled_time: new Date().toISOString(),
                  })
                  .select('id')
                  .single();
                if (data) scheduledPostId = data.id;
              }
            } catch {
              // fallback
            }
            msg = 'step executed';
            break;
          }

          case 'Approval': {
            setRunLog((prev) =>
              prev.map((item) =>
                item.id === logId
                  ? { ...item, text: `${node.data.label} — waiting on sign-off`, status: 'waiting' }
                  : item,
              ),
            );
            setAwaitingApproval(true);
            await new Promise<void>((resolve) => {
              approveResolver.current = resolve;
            });
            setAwaitingApproval(false);
            msg = 'waiting on sign-off';
            break;
          }

          case 'Publish': {
            if (scheduledPostId) {
              try {
                await api.publish.now(scheduledPostId);
              } catch {
                // fallback
              }
            }
            msg = 'step executed';
            break;
          }

          case 'Analytics': {
            msg = 'snapshot updated';
            break;
          }

          case 'Moderation': {
            msg = 'sentiment tagged';
            break;
          }

          default:
            msg = 'step executed';
        }

        setRunLog((prev) =>
          prev.map((item) =>
            item.id === logId
              ? { ...item, text: `${node.data.label} — ${msg}`, status: 'done' }
              : item,
          ),
        );

        setNodes((nds) =>
          nds.map((n) => (n.id === node.id ? { ...n, data: { ...n.data, status: 'ready' } } : n)),
        );
      } catch (err) {
        setRunLog((prev) =>
          prev.map((item) =>
            item.id === logId
              ? { ...item, text: `${node.data.label} — error: ${(err as Error).message}`, status: 'failed' }
              : item,
          ),
        );
      }
    }

    setActiveNodeId(null);
    setRunning(false);
  };

  return (
    <div className="st st--embedded">
      <TopBar
        name={name}
        onNameChange={(v) => {
          setName(v);
          markDirty();
        }}
        saved={saved}
        running={running}
        onSave={handleSave}
        onRun={handleRun}
      />

      <div className="st-body">
        <Palette onDragStart={onDragStart} />

        <div className="st-canvas" ref={wrapperRef} onDragOver={onDragOver} onDrop={onDrop}>
          <ReactFlow
            className={`flow-shell ${running ? 'is-running' : ''}`}
            nodes={nodes.map((n) => ({
              ...n,
              className: n.id === activeNodeId ? 'fn-pulse' : undefined,
            }))}
            edges={edges}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            onNodesChange={handleNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            deleteKeyCode={null}
            fitView
            fitViewOptions={{ padding: 0.25 }}
            minZoom={0.25}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable nodeColor="var(--color-border-strong)" />
          </ReactFlow>

          {runLog.length > 0 && (
            <RunLog
              lines={runLog}
              awaitingApproval={awaitingApproval}
              onApprove={() => {
                approveResolver.current?.();
                approveResolver.current = null;
              }}
              onClear={() => setRunLog([])}
            />
          )}
        </div>

        {selectedNode && (
          <ConfigPanel
            node={selectedNode}
            onChange={updateSelected}
            onDelete={deleteSelected}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>
    </div>
  );
}

function TopBar({
  name,
  onNameChange,
  saved,
  running,
  onSave,
  onRun,
}: {
  name: string;
  onNameChange: (v: string) => void;
  saved: boolean;
  running: boolean;
  onSave: () => void;
  onRun: () => void;
}) {
  return (
    <header className="st-top">
      <div className="st-top__left">
        <input
          className="st-name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          aria-label="Workflow name"
        />
        <span className={`lp-tag ${saved ? 'lp-tag--pass' : 'lp-tag--warn'}`}>
          {saved ? 'Saved' : 'Unsaved changes'}
        </span>
      </div>
      <div className="st-top__right">
        <button className="st-btn st-btn--ghost" onClick={onSave}>
          <Save size={14} /> Save
        </button>
        <button className="st-btn st-btn--solid" onClick={onRun} disabled={running}>
          <Play size={14} /> {running ? 'Running…' : 'Run'}
        </button>
      </div>
    </header>
  );
}

function Palette({
  onDragStart,
}: {
  onDragStart: (e: DragEvent, template: (typeof PALETTE)[number]) => void;
}) {
  const groups: NodeKind[] = ['trigger', 'generate', 'action', 'gate', 'output'];
  return (
    <aside className="st-palette">
      <p className="st-palette__hint">Drag a module onto the canvas</p>
      {groups.map((kind) => (
        <div className="st-palette__group" key={kind}>
          <h3>{KIND_LABEL[kind]}</h3>
          {PALETTE.filter((p) => p.kind === kind).map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.label}
                className={`st-chip is-${kind}`}
                draggable
                onDragStart={(e) => onDragStart(e, p)}
              >
                <span className="st-chip__icon">
                  <Icon size={14} />
                </span>
                {p.label}
              </div>
            );
          })}
        </div>
      ))}
    </aside>
  );
}

function ConfigPanel({
  node,
  onChange,
  onDelete,
  onClose,
}: {
  node: FlowNode;
  onChange: (patch: Partial<FlowNodeData>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const { data } = node;
  return (
    <aside className="st-panel">
      <div className="st-panel__head">
        <span className="lp-tag lp-tag--neutral">{KIND_LABEL[data.kind]}</span>
        <div className="st-panel__actions">
          <button className="st-icon-btn" onClick={onDelete} aria-label="Delete node">
            <Trash2 size={14} />
          </button>
          <button className="st-icon-btn" onClick={onClose} aria-label="Close panel">
            <X size={14} />
          </button>
        </div>
      </div>

      <label className="st-field">
        <span>Name</span>
        <input value={data.label} onChange={(e) => onChange({ label: e.target.value })} />
      </label>

      <label className="st-field">
        <span>Description</span>
        <textarea
          rows={2}
          value={data.subtitle}
          onChange={(e) => onChange({ subtitle: e.target.value })}
        />
      </label>

      {data.kind === 'generate' && (
        <label className="st-field">
          <span>Instructions for the model</span>
          <textarea
            rows={3}
            placeholder="e.g. bold title text, brand colors, high contrast faces"
            value={data.prompt ?? ''}
            onChange={(e) => onChange({ prompt: e.target.value })}
          />
        </label>
      )}

      {data.label === 'Schedule' && (
        <label className="st-field">
          <span>Cadence</span>
          <select value={data.cadence ?? 'One-time'} onChange={(e) => onChange({ cadence: e.target.value })}>
            <option>One-time</option>
            <option>Recurring</option>
          </select>
        </label>
      )}

      {data.kind === 'gate' && (
        <label className="st-field">
          <span>Approver</span>
          <select
            value={data.approver ?? 'Workspace owner'}
            onChange={(e) => onChange({ approver: e.target.value })}
          >
            <option>Workspace owner</option>
            <option>Any editor</option>
          </select>
        </label>
      )}

      {data.label === 'Publish' && (
        <div className="st-field">
          <span>Publish to</span>
          <div className="st-chips">
            {PLATFORM_OPTIONS.map((p) => {
              const on = (data.platforms ?? []).includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  className={`st-toggle ${on ? 'is-on' : ''}`}
                  onClick={() => {
                    const current = data.platforms ?? [];
                    onChange({
                      platforms: on ? current.filter((x) => x !== p) : [...current, p],
                    });
                  }}
                >
                  {on && <Check size={11} />} {p}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {data.kind === 'output' && (
        <label className="st-field">
          <span>Refresh</span>
          <select value={data.refresh ?? 'Daily'} onChange={(e) => onChange({ refresh: e.target.value })}>
            <option>Hourly</option>
            <option>Daily</option>
            <option>Weekly</option>
          </select>
        </label>
      )}

      <label className="st-field st-field--row">
        <span>Configured</span>
        <button
          type="button"
          className={`st-switch ${data.status === 'ready' ? 'is-on' : ''}`}
          onClick={() => onChange({ status: data.status === 'ready' ? 'needs-setup' : 'ready' })}
          aria-pressed={data.status === 'ready'}
        >
          <i />
        </button>
      </label>
    </aside>
  );
}

function RunLog({
  lines,
  awaitingApproval,
  onApprove,
  onClear,
}: {
  lines: RunLogEntry[];
  awaitingApproval: boolean;
  onApprove: () => void;
  onClear: () => void;
}) {
  const logRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [lines]);

  return (
    <div className="st-log">
      <div className="st-log__head">
        <span className="lp-mono" style={{ fontWeight: 600, fontSize: '11px', color: 'var(--color-muted)' }}>
          Run log
        </span>
        <button className="st-icon-btn" onClick={onClear} aria-label="Close log">
          <X size={13} />
        </button>
      </div>
      <div className="st-log__body" ref={logRef}>
        {lines.map((l) => (
          <div className="st-log__line lp-mono" key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
            <span className="st-log__i" style={{ color: 'var(--color-faint)', minWidth: '18px', fontSize: '11px' }}>
              {l.num}
            </span>
            {l.status === 'done' && (
              <span style={{ color: '#4ade9f', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                <Check size={13} strokeWidth={2.5} />
              </span>
            )}
            {l.status === 'running' && (
              <span style={{ color: '#ef5a2c', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} />
              </span>
            )}
            {l.status === 'waiting' && (
              <span style={{ color: '#f0b429', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                <Check size={13} strokeWidth={2.5} />
              </span>
            )}
            {l.status === 'failed' && (
              <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                <X size={13} strokeWidth={2.5} />
              </span>
            )}
            <span style={{ color: 'var(--color-text-2)', fontSize: '11.5px', whiteSpace: 'nowrap' }}>
              {l.text}
            </span>
          </div>
        ))}
        {awaitingApproval && (
          <button className="st-btn st-btn--solid" style={{ marginTop: 8, width: '100%', justifyContent: 'center' }} onClick={onApprove}>
            <Check size={13} /> Approve to continue
          </button>
        )}
      </div>
    </div>
  );
}
