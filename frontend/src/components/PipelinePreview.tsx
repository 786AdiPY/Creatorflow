import { useMemo } from 'react';
import { ReactFlow, Background, BackgroundVariant, type NodeMouseHandler } from '@xyflow/react';

import { nodeTypes } from '../flow/FlowNode';
import { initialEdges, initialNodes } from '../flow/initialFlow';

/** A live, real @xyflow/react canvas embedded in the marketing page — not a
 * screenshot. Panning/zooming is intentionally muted so it doesn't fight
 * page scroll; dragging a node still works, so the first thing a visitor
 * touches on this page is the actual product surface. */
export default function PipelinePreview({ onNodeClick }: { onNodeClick?: NodeMouseHandler }) {
  const defaultEdgeOptions = useMemo(() => ({ type: 'smoothstep' as const }), []);

  return (
    <ReactFlow
      className="flow-shell flow-shell--preview"
      nodes={initialNodes}
      edges={initialEdges}
      nodeTypes={nodeTypes}
      defaultEdgeOptions={defaultEdgeOptions}
      fitView
      fitViewOptions={{ padding: 0.15 }}
      minZoom={0.1}
      maxZoom={1}
      nodesConnectable={false}
      elementsSelectable
      panOnDrag={false}
      panOnScroll={false}
      zoomOnScroll={false}
      zoomOnPinch={false}
      zoomOnDoubleClick={false}
      preventScrolling={false}
      onNodeClick={onNodeClick}
    >
      <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} />
    </ReactFlow>
  );
}
