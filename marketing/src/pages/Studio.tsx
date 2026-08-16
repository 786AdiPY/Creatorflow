// Studio — the n8n-style workflow builder. Drag modules from the palette,
// wire them together, configure each one, and (locally) simulate a run.
//
// Scope note: this is the visual builder surface. Wiring "Run" to a real
// execution — actually kicking off the jobs the console/backend already
// exposes — is the next integration step, not something this page fakes.
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
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
  type Node,
  type OnConnect,
  type NodeMouseHandler,
} from '@xyflow/react';
import {
  ArrowLeft,
  BarChart3,
  CalendarClock,
  Check,
  ExternalLink,
  Image,
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
import { CONSOLE_URL } from '../lib/config';
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

export default function Studio() {
  return (
    <ReactFlowProvider>
      <StudioShell />
    </ReactFlowProvider>
  );
}

function StudioShell() {
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
  const [runLog, setRunLog] = useState<string[]>([]);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const { screenToFlowPosition } = useReactFlow();

  const defaultEdgeOptions = useMemo(() => ({ type: 'smoothstep' as const, animated: true }), []);

  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null;

  const markDirty = useCallback(() => setSaved(false), []);

  const handleNodesChange: typeof onNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);
      // Mounting/resizing fires 'dimensions' and 'select' changes that aren't
      // user edits — only those should flip the save state.
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
    e.dataTransfer.setData('application/creatorflow-node', JSON.stringify(template));
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData('application/creatorflow-node');
      if (!raw || !wrapperRef.current) return;
      const template = JSON.parse(raw) as (typeof PALETTE)[number];
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

  // React Flow's built-in deleteKeyCode fires even while typing in the name
  // field or a config panel input — handle it ourselves so Backspace in a
  // text field edits text instead of deleting the selected node.
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
      // localStorage unavailable (private mode, etc.) — save is best-effort only.
    }
    setSaved(true);
  };

  const handleRun = () => {
    if (running) return;
    setRunning(true);
    setRunLog([]);
    const ordered = [...nodes].sort((a, b) => a.position.x - b.position.x);
    ordered.forEach((node, i) => {
      window.setTimeout(() => {
        setActiveNodeId(node.id);
        setRunLog((log) => [...log, logLineFor(node)]);
        if (i === ordered.length - 1) {
          window.setTimeout(() => {
            setActiveNodeId(null);
            setRunning(false);
          }, 500);
        }
      }, i * 550);
    });
  };

  return (
    <div className="st">
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
          >
            <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable nodeColor="var(--color-border-strong)" />
          </ReactFlow>

          {runLog.length > 0 && <RunLog lines={runLog} running={running} onClear={() => setRunLog([])} />}
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

function logLineFor(node: Node<FlowNodeData>): string {
  const { label, kind } = node.data;
  switch (kind) {
    case 'trigger':
      return `${label} — asset received, run started`;
    case 'generate':
      return `${label} — generated output for review`;
    case 'gate':
      return `${label} — waiting on sign-off`;
    case 'action':
      return `${label} — step executed`;
    default:
      return `${label} — updated`;
  }
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
        <Link to="/" className="st-back" aria-label="Back to CreatorFlow">
          <ArrowLeft size={16} />
        </Link>
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
        <a className="st-btn st-btn--ghost" href={CONSOLE_URL} target="_blank" rel="noreferrer">
          Console <ExternalLink size={13} />
        </a>
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

function RunLog({ lines, running, onClear }: { lines: string[]; running: boolean; onClear: () => void }) {
  return (
    <div className="st-log">
      <div className="st-log__head">
        <span className="lp-mono">Run log</span>
        {!running && (
          <button className="st-icon-btn" onClick={onClear} aria-label="Clear log">
            <X size={13} />
          </button>
        )}
      </div>
      <div className="st-log__body">
        {lines.map((l, i) => (
          <div className="st-log__line lp-mono" key={i}>
            <span className="st-log__i">{String(i + 1).padStart(2, '0')}</span>
            {l}
          </div>
        ))}
        {running && <span className="st-log__caret" />}
      </div>
    </div>
  );
}
