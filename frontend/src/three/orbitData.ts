export type OrbitKind = 'trigger' | 'generate' | 'action' | 'gate' | 'output';

export interface OrbitNode {
  id: string;
  label: string;
  subtitle: string;
  kind: OrbitKind;
  position: [number, number, number];
}

export const KIND_COLOR: Record<OrbitKind, string> = {
  trigger: '#ff6b45',
  generate: '#b79bf6',
  action: '#6fc1ef',
  gate: '#f0b74c',
  output: '#4fd18b',
};

export const ORBIT_NODES: OrbitNode[] = [
  { id: 'ingest', label: 'New Upload', subtitle: 'Raw footage lands from studio or storage', kind: 'trigger', position: [-7, 0, 0] },
  { id: 'clip', label: 'Clip Finder', subtitle: 'Scores the source for clip-worthy moments', kind: 'generate', position: [-3.6, 2.4, 1.8] },
  { id: 'thumbnail', label: 'Thumbnail AI', subtitle: 'Generates on-brand cover variants', kind: 'generate', position: [-3.6, 0, -2.2] },
  { id: 'metadata', label: 'Metadata AI', subtitle: 'Titles, descriptions and tags, per platform', kind: 'generate', position: [-3.6, -2.4, 1.8] },
  { id: 'schedule', label: 'Schedule', subtitle: 'Slots the release onto the calendar', kind: 'action', position: [0, 0, 0] },
  { id: 'approval', label: 'Approval', subtitle: 'Holds for a human sign-off before it goes out', kind: 'gate', position: [3.4, 1.4, -1.2] },
  { id: 'publish', label: 'Publish', subtitle: 'Posts to every connected account', kind: 'action', position: [7, 0, 0] },
  { id: 'analytics', label: 'Analytics', subtitle: 'Views, retention and comments, pulled back in', kind: 'output', position: [10.4, 2.2, 1.8] },
  { id: 'moderation', label: 'Moderation', subtitle: 'Flags and files comments for review', kind: 'output', position: [10.4, -2.2, -1.8] },
];

export const ORBIT_EDGES: Array<[string, string]> = [
  ['ingest', 'clip'],
  ['ingest', 'thumbnail'],
  ['ingest', 'metadata'],
  ['clip', 'schedule'],
  ['thumbnail', 'schedule'],
  ['metadata', 'schedule'],
  ['schedule', 'approval'],
  ['approval', 'publish'],
  ['publish', 'analytics'],
  ['publish', 'moderation'],
];
