import { useRef, useState, useMemo, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';

import type { OrbitNode } from './orbitData';
import { KIND_COLOR } from './orbitData';
import { createNodeCoreMaterial } from './shaders';

const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

export default function Node3D({
  node,
  index,
  onSelect,
  selected,
}: {
  node: OrbitNode;
  index: number;
  onSelect: (n: OrbitNode) => void;
  selected: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);
  const wire = useRef<THREE.Mesh>(null);
  const [hover, setHover] = useState(false);
  const color = KIND_COLOR[node.kind];
  const basePos = useMemo(() => new THREE.Vector3(...node.position), [node.position]);
  const phase = useMemo(() => index * 1.37, [index]);
  const coreMat = useMemo(() => createNodeCoreMaterial(color), [color]);
  const introDelay = index * 0.14;

  // Start invisible; useFrame drives scale every frame from here on, so
  // this only needs to run once, before first paint (avoids a one-frame
  // flash at full size, and avoids the `scale` JSX prop fighting useFrame
  // on every hover-triggered re-render).
  useLayoutEffect(() => {
    group.current?.scale.setScalar(0);
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const introT = Math.min(1, Math.max(0, (t - introDelay) / 0.85));
    const pop = introT <= 0 ? 0 : easeOutBack(introT);

    if (group.current) {
      group.current.position.set(
        basePos.x,
        basePos.y + (introT >= 1 ? Math.sin(t * 0.6 + phase) * 0.22 : 0),
        basePos.z,
      );
      group.current.scale.setScalar(Math.max(0, pop));
    }
    if (core.current) {
      core.current.rotation.x = t * 0.25 + phase;
      core.current.rotation.y = t * 0.35 + phase;
      const targetScale = hover || selected ? 1.35 : 1;
      core.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.15);
    }
    if (wire.current) {
      wire.current.rotation.x = -t * 0.18;
      wire.current.rotation.z = t * 0.12;
    }
    coreMat.uniforms.uTime.value = t;
    coreMat.uniforms.uHover.value = THREE.MathUtils.lerp(
      coreMat.uniforms.uHover.value,
      hover || selected ? 1 : 0,
      0.15,
    );
  });

  return (
    <group
      ref={group}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHover(false);
        document.body.style.cursor = 'auto';
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node);
      }}
    >
      <mesh ref={core} material={coreMat}>
        <icosahedronGeometry args={[0.62, 1]} />
      </mesh>
      <mesh ref={wire} scale={1.7}>
        <icosahedronGeometry args={[0.62, 0]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={hover || selected ? 0.5 : 0.22} />
      </mesh>
      <pointLight color={color} intensity={hover || selected ? 6 : 2.2} distance={4.5} />

      <Billboard position={[0, 1.05, 0]}>
        <Text
          fontSize={0.32}
          color={hover || selected ? '#ffffff' : '#d6cab6'}
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.012}
          outlineColor="#0a0806"
        >
          {node.label}
        </Text>
        {(hover || selected) && (
          <Text
            position={[0, -0.34, 0]}
            fontSize={0.16}
            maxWidth={3.2}
            color="#a3957f"
            anchorX="center"
            anchorY="top"
            textAlign="center"
          >
            {node.subtitle}
          </Text>
        )}
      </Billboard>
    </group>
  );
}
