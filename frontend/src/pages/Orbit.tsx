import { Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Rocket } from 'lucide-react';

import PipelineScene from '../three/PipelineScene';
import { KIND_COLOR, type OrbitKind, type OrbitNode } from '../three/orbitData';
import './Orbit.css';

const LEGEND: OrbitKind[] = ['trigger', 'generate', 'action', 'gate', 'output'];
const LEGEND_LABEL: Record<OrbitKind, string> = {
  trigger: 'Trigger',
  generate: 'Generate',
  action: 'Action',
  gate: 'Gate',
  output: 'Output',
};

export default function Orbit() {
  const [selected, setSelected] = useState<OrbitNode | null>(null);

  return (
    <div className="orbit">
      <Suspense fallback={<div className="orbit__loading">Warming up the engines…</div>}>
        <PipelineScene onSelect={setSelected} selectedId={selected?.id ?? null} />
      </Suspense>

      <div className="orbit__ui">
        <header className="orbit__top">
          <Link to="/" className="orbit__back">
            <ArrowLeft size={15} /> CreatorFlow
          </Link>
          <Link to="/library" className="orbit__cta">
            <Rocket size={14} /> Open the Studio
          </Link>
        </header>

        <div className="orbit__intro">
          <p className="orbit__eyebrow">The pipeline — in orbit</p>
          <h1>Nine modules. One live system.</h1>
          <p className="orbit__hint">Drag to rotate · Scroll to zoom · Click a node</p>
        </div>

        <ul className="orbit__legend">
          {LEGEND.map((k) => (
            <li key={k}>
              <i style={{ background: KIND_COLOR[k] }} />
              {LEGEND_LABEL[k]}
            </li>
          ))}
        </ul>

        {selected && (
          <div className="orbit__card" key={selected.id}>
            <span className="orbit__card-dot" style={{ background: KIND_COLOR[selected.kind] }} />
            <div>
              <p className="orbit__card-kind">{LEGEND_LABEL[selected.kind]}</p>
              <h3>{selected.label}</h3>
              <p className="orbit__card-sub">{selected.subtitle}</p>
            </div>
            <button className="orbit__card-close" onClick={() => setSelected(null)} aria-label="Dismiss">
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
