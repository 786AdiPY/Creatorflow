import { Suspense, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ChromaticAberration, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';

import Node3D from './Node3D';
import FlowTube from './FlowTube';
import Shockwave from './Shockwave';
import HoloGrid from './HoloGrid';
import { ORBIT_NODES, ORBIT_EDGES, KIND_COLOR, type OrbitNode } from './orbitData';

const NODE_INDEX: Record<string, number> = Object.fromEntries(ORBIT_NODES.map((n, i) => [n.id, i]));

export default function PipelineScene({
  onSelect = () => {},
  selectedId = null,
  compact = false,
}: {
  onSelect?: (n: OrbitNode) => void;
  selectedId?: string | null;
  /** Small embedded preview (landing hero): no drag/zoom hijacking page
   * scroll, lighter particle/star counts, faster ambient autorotate. */
  compact?: boolean;
}) {
  const [reduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  );

  const byId = useMemo(() => Object.fromEntries(ORBIT_NODES.map((n) => [n.id, n])), []);

  return (
    <Canvas
      dpr={compact ? [1, 1.5] : [1, 1.75]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <PerspectiveCamera makeDefault position={compact ? [0, 1.8, 15] : [0, 2.6, 19]} fov={compact ? 50 : 46} />
      <color attach="background" args={['#07050a']} />
      <fog attach="fog" args={['#07050a', compact ? 11 : 14, compact ? 26 : 32]} />

      <ambientLight intensity={0.28} />
      <pointLight position={[-9, 6, 6]} intensity={45} color="#ff6b45" distance={30} />
      <pointLight position={[9, -6, -6]} intensity={45} color="#8a6bff" distance={30} />
      <pointLight position={[0, 8, -4]} intensity={20} color="#6fc1ef" distance={30} />

      <Suspense fallback={null}>
        <Stars
          radius={70}
          depth={45}
          count={compact ? 900 : 3200}
          factor={2.2}
          saturation={0}
          fade
          speed={reduced ? 0 : 0.35}
        />

        {!reduced && <Shockwave />}
        <HoloGrid />

        {ORBIT_EDGES.map(([from, to], i) => (
          <FlowTube
            key={`${from}-${to}`}
            from={byId[from].position}
            to={byId[to].position}
            color={KIND_COLOR[byId[to].kind]}
            speed={reduced ? 0 : 0.18 + (i % 3) * 0.05}
            introDelay={reduced ? -1 : NODE_INDEX[from] * 0.14 + 0.1}
          />
        ))}

        {ORBIT_NODES.map((n, i) => (
          <Node3D key={n.id} node={n} index={reduced ? -99 : i} onSelect={onSelect} selected={selectedId === n.id} />
        ))}
      </Suspense>

      <OrbitControls
        enablePan={false}
        enableZoom={!compact}
        enableRotate={!compact}
        minDistance={compact ? 12 : 9}
        maxDistance={compact ? 22 : 26}
        autoRotate={!reduced}
        autoRotateSpeed={compact ? 0.85 : 0.55}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.5}
      />

      {!reduced && (
        <EffectComposer multisampling={0}>
          <Bloom
            intensity={compact ? 0.95 : 1.15}
            luminanceThreshold={0.15}
            luminanceSmoothing={0.9}
            mipmapBlur
            radius={0.8}
          />
          <ChromaticAberration
            blendFunction={BlendFunction.NORMAL}
            offset={new THREE.Vector2(0.0003, 0.0003)}
            radialModulation={false}
            modulationOffset={0}
          />
          <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.15} />
          <Vignette eskil={false} offset={compact ? 0 : 0.22} darkness={compact ? 0 : 0.85} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
