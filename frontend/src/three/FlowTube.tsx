import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { createFlowTubeMaterial } from './shaders';

export default function FlowTube({
  from,
  to,
  color,
  speed = 0.22,
  particles = 2,
  introDelay = 0,
}: {
  from: [number, number, number];
  to: [number, number, number];
  color: string;
  speed?: number;
  particles?: number;
  /** seconds to wait before this tube starts drawing itself in */
  introDelay?: number;
}) {
  const curve = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const mid = a.clone().lerp(b, 0.5);
    // bow the midpoint off-axis so tubes read as arcs through space, not
    // flat lines — that's most of what sells the "3D" of it.
    const dir = b.clone().sub(a).normalize();
    const bow = new THREE.Vector3(-dir.y, dir.x, dir.z * 0.6).multiplyScalar(0.9);
    mid.add(bow);
    return new THREE.CatmullRomCurve3([a, mid, b]);
  }, [from, to]);

  const tubeGeo = useMemo(() => new THREE.TubeGeometry(curve, 64, 0.05, 8, false), [curve]);
  const tubeMat = useMemo(() => createFlowTubeMaterial(color), [color]);
  const particleRefs = useRef<THREE.Mesh[]>([]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    tubeMat.uniforms.uTime.value = t;
    tubeMat.uniforms.uSpeed.value = speed * 4;
    const drawT = Math.min(1, Math.max(0, (t - introDelay) / 0.7));
    tubeMat.uniforms.uDraw.value = drawT;

    particleRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      mesh.visible = drawT >= 1;
      if (drawT < 1) return;
      const offset = i / particles;
      const p = (t * speed + offset) % 1;
      const pos = curve.getPointAt(p);
      mesh.position.copy(pos);
      const s = 0.55 + 0.45 * Math.sin(p * Math.PI);
      mesh.scale.setScalar(s);
    });
  });

  return (
    <group>
      <mesh geometry={tubeGeo} material={tubeMat} />
      {Array.from({ length: particles }).map((_, i) => (
        <mesh key={i} ref={(el) => { if (el) particleRefs.current[i] = el; }}>
          <sphereGeometry args={[0.055, 8, 8]} />
          <meshBasicMaterial color={color} />
        </mesh>
      ))}
    </group>
  );
}
