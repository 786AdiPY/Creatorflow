import { useMemo } from 'react';
import * as THREE from 'three';

/** A faint circular grid disc beneath the constellation — reads as a
 * "holographic platform" the nodes are floating above, which does a lot
 * for selling depth/scale in an otherwise empty starfield. */
export default function HoloGrid() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: { uColor: { value: new THREE.Color('#ff6b45') } },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          varying vec2 vUv;
          void main() {
            vec2 p = vUv * 2.0 - 1.0;
            float r = length(p);
            if (r > 1.0) discard;
            float rings = smoothstep(0.0, 0.015, abs(fract(r * 9.0) - 0.5) - 0.47);
            float fade = pow(1.0 - r, 2.6);
            float alpha = (1.0 - rings) * fade * 0.14;
            gl_FragColor = vec4(uColor, alpha);
          }
        `,
      }),
    [],
  );

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.7, -5.2, 0]} material={material}>
      <circleGeometry args={[13, 64]} />
    </mesh>
  );
}
