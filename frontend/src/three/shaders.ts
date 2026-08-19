import * as THREE from 'three';

/** Fresnel-rim energy core: a pulsing hot center with a bright rim that
 * flares toward the viewer's grazing angle — reads as "glowing plasma",
 * not "colored sphere". Bloom picks up the rim automatically since it's
 * driven well past 1.0 in brightness. */
export function createNodeCoreMaterial(color: string) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uTime: { value: 0 },
      uHover: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewDir = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uTime;
      uniform float uHover;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        float fresnel = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewDir)), 0.0), 2.1);
        float pulse = 0.7 + 0.3 * sin(uTime * 2.4);
        vec3 core = uColor * (0.5 + 0.35 * pulse);
        vec3 rim = uColor * (1.9 + uHover * 1.6);
        vec3 col = mix(core, rim, fresnel);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

/** Flowing energy along a tube: bands scroll along the U axis (tube
 * length) and taper toward the tube's edges (V axis) for a glass-conduit
 * look. `uDraw` reveals the tube from source to target for the entrance
 * animation — texels past it are discarded. */
export function createFlowTubeMaterial(color: string) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uTime: { value: 0 },
      uSpeed: { value: 0.25 },
      uDraw: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uTime;
      uniform float uSpeed;
      uniform float uDraw;
      varying vec2 vUv;
      void main() {
        if (vUv.x > uDraw) discard;
        float edge = 1.0 - smoothstep(0.25, 0.5, abs(vUv.y - 0.5));
        float band = sin((vUv.x * 14.0) - uTime * uSpeed * 20.0) * 0.5 + 0.5;
        band = pow(band, 3.0);
        // a narrow bright comet exactly at the current draw edge — fades
        // in over a short window and back out just as fast, so it reads
        // as a travelling pulse during the reveal instead of a permanent
        // blown-out glow once the tube has finished drawing in.
        float head = smoothstep(uDraw - 0.08, uDraw, vUv.x) - smoothstep(uDraw, uDraw + 0.015, vUv.x);
        head = clamp(head, 0.0, 1.0) * 2.4;
        float glow = (0.26 + band * 0.48 + head) * edge;
        gl_FragColor = vec4(uColor * glow, glow);
      }
    `,
  });
}
