import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/** A single expanding ring pulse from the origin at scene start — the
 * "power on" beat that kicks off the entrance sequence. Unmounts itself
 * once spent (parent can just leave it mounted; it just goes invisible). */
export default function Shockwave() {
  const ring = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const dur = 1.6;
    if (t > dur || !ring.current || !mat.current) {
      if (ring.current) ring.current.visible = false;
      return;
    }
    const p = t / dur;
    const scale = THREE.MathUtils.lerp(0.4, 13, 1 - Math.pow(1 - p, 3));
    ring.current.scale.setScalar(scale);
    mat.current.opacity = (1 - p) * 0.55;
  });

  return (
    <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.92, 1, 64]} />
      <meshBasicMaterial ref={mat} color="#ff8563" transparent opacity={0.5} side={THREE.DoubleSide} />
    </mesh>
  );
}
