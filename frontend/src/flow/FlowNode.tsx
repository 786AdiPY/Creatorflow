import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Check, CircleDot, TriangleAlert } from 'lucide-react';

import type { FlowNode, NodeKind } from './types';
import { KIND_LABEL } from './types';

const KIND_CLASS: Record<NodeKind, string> = {
  trigger: 'is-trigger',
  generate: 'is-generate',
  action: 'is-action',
  gate: 'is-gate',
  output: 'is-output',
};

function FlowNodeImpl({ data, selected }: NodeProps<FlowNode>) {
  const Icon = data.icon || CircleDot;
  const showTarget = data.kind !== 'trigger';
  const showSource = data.kind !== 'output';

  return (
    <div className={`fn ${KIND_CLASS[data.kind]} ${selected ? 'is-selected' : ''}`}>
      {showTarget && <Handle type="target" position={Position.Left} className="fn__handle" />}

      <div className="fn__head">
        <span className="fn__icon" aria-hidden="true">
          <Icon size={15} strokeWidth={2} />
        </span>
        <span className="fn__kind">{KIND_LABEL[data.kind]}</span>
      </div>

      <div className="fn__body">
        <h4 className="fn__title">{data.label}</h4>
        <p className="fn__sub">{data.subtitle}</p>
      </div>

      <div className="fn__foot">
        {data.status === 'ready' ? (
          <span className="fn__status is-ready">
            <Check size={11} /> Configured
          </span>
        ) : (
          <span className="fn__status is-pending">
            <TriangleAlert size={11} /> Needs setup
          </span>
        )}
        {data.meta && <span className="fn__meta lp-mono">{data.meta}</span>}
      </div>

      {showSource && <Handle type="source" position={Position.Right} className="fn__handle" />}
    </div>
  );
}

export const FlowNodeView = memo(FlowNodeImpl);

export const nodeTypes = {
  module: FlowNodeView,
};
