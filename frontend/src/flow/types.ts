import type { LucideIcon } from 'lucide-react';
import type { Edge, Node } from '@xyflow/react';

export type NodeKind = 'trigger' | 'generate' | 'action' | 'gate' | 'output';

export interface FlowNodeData extends Record<string, unknown> {
  label: string;
  kind: NodeKind;
  subtitle: string;
  icon: LucideIcon;
  status: 'ready' | 'needs-setup';
  meta?: string;
  platforms?: string[];
  prompt?: string;
  cadence?: string;
  approver?: string;
  refresh?: string;
}

export type FlowNode = Node<FlowNodeData, 'module'>;
export type FlowEdge = Edge;

export const KIND_LABEL: Record<NodeKind, string> = {
  trigger: 'Trigger',
  generate: 'Generate',
  action: 'Action',
  gate: 'Gate',
  output: 'Output',
};
