'use client';

/**
 * MobiusScene — lean möbius centerpiece.
 *
 * A twisted, fluted triangular tube is baked once into a BufferGeometry with
 * welded seams (no duplicated edge vertices), so normals are continuous and the
 * surface is seamless. The "roll" is a tiny vertex shader that rotates each
 * cross-section by an animated phase (a rigid rotation about the tube tangent —
 * the baked normal rotates with it, so lighting stays correct). The shape stays
 * put (apex up) while the twist flows around the loop.
 *
 * All shape/motion/material values come from a MobiusConfig (editable live via
 * the dev tuner). No transmission, no post-processing, no per-frame CPU rebuild.
 */

import { useMemo, useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { MobiusConfig } from './mobiusConfig';

type Props = {
  mouseRef: React.MutableRefObject<{ x: number; y: number }>;
  color: string;
  reducedMotion: boolean;
  isLight: boolean;
  active: boolean;
  config: MobiusConfig;
};

// Cap the render loop well below the display refresh. The transmission pass
// re-renders the whole scene each frame — the dominant GPU cost — so rendering
// the subtle roll at ~38fps (instead of 60/120Hz) frees most of the frame
// budget for smooth scroll compositing, with no visible loss on the animation.
const TARGET_FPS = 38;

const ANCHOR_SELECTOR = '[data-mobius-anchor="hero"]';

/**
 * Twisted, fluted triangular tube baked into a seamless BufferGeometry.
 *
 * Path: rounded triangle (deltoid), apex up. A fluted cross-section is swept
 * along it, rotating `twistTurns` turns (distributed by arc length). Both the
 * radial seam and the closing-loop seam are welded by wrapping the indices (the
 * loop seam uses an offset equal to the accumulated twist), so the whole surface
 * shares vertices and `computeVertexNormals` yields continuous normals.
 *
 * Per-vertex `aCenter` (ring center) and `aAxis` (tube tangent) are stored so
 * the shader can rotate each cross-section in place for the roll.
 */
function buildMobiusTube(cfg: MobiusConfig): THREE.BufferGeometry {
  const PR = cfg.pathRadius;
  const TA = cfg.triAmount;
  const TR = cfg.tubeRadius;
  const FC = cfg.fluteCount;
  const FD = cfg.fluteDepth;
  const sides = Math.max(3, Math.round(cfg.radialSegments));
  const rings = Math.max(3, Math.round(cfg.tubularSegments));
  const totalTwist = cfg.twistTurns * Math.PI * 2;

  // ── Pass 1: sample the path, frame, tangent, and (full-loop) arc length ──
  const cxs = new Float64Array(rings);
  const cys = new Float64Array(rings);
  const txs = new Float64Array(rings);
  const tys = new Float64Array(rings);
  const nxs = new Float64Array(rings);
  const nys = new Float64Array(rings);
  const arc = new Float64Array(rings);
  for (let i = 0; i < rings; i++) {
    const u = (i / rings) * Math.PI * 2;
    const sinU = Math.sin(u);
    const cosU = Math.cos(u);
    const sin2U = 2 * sinU * cosU;
    const cos2U = 1 - 2 * sinU * sinU;

    const cx = PR * (-sinU + TA * sin2U);
    const cy = PR * (cosU + TA * cos2U);

    let tx = PR * (-cosU + 2 * TA * cos2U);
    let ty = PR * (-sinU - 2 * TA * sin2U);
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl;
    ty /= tl;

    cxs[i] = cx;
    cys[i] = cy;
    txs[i] = tx;
    tys[i] = ty;
    nxs[i] = ty;
    nys[i] = -tx;
    arc[i] = i > 0 ? arc[i - 1] + Math.hypot(cx - cxs[i - 1], cy - cys[i - 1]) : 0;
  }
  // Full loop length includes the wrap segment from the last ring back to the first.
  const totalArc = (arc[rings - 1] || 0) + Math.hypot(cxs[0] - cxs[rings - 1], cys[0] - cys[rings - 1]) || 1;

  // ── Pass 2: sweep the fluted cross-section (no duplicated seam rows/cols) ──
  const positions: number[] = [];
  const center: number[] = [];
  const axis: number[] = [];
  for (let i = 0; i < rings; i++) {
    const cx = cxs[i];
    const cy = cys[i];
    const nx = nxs[i];
    const ny = nys[i];
    const twist = totalTwist * (arc[i] / totalArc);
    for (let k = 0; k < sides; k++) {
      const theta = (k / sides) * Math.PI * 2 + twist;
      const ct = Math.cos(theta);
      const st = Math.sin(theta);
      const r = TR * (1 + FD * Math.cos(FC * theta));
      positions.push(cx + r * ct * nx, cy + r * ct * ny, r * st);
      center.push(cx, cy);
      axis.push(txs[i], tys[i]);
    }
  }

  // ── Indices: wrap both seams. The loop seam offsets the next ring's column
  //    by the accumulated twist so the welded vertices line up. ──
  const indices: number[] = [];
  const seamOffset = ((Math.round(cfg.twistTurns * sides) % sides) + sides) % sides;
  for (let i = 0; i < rings; i++) {
    const iN = (i + 1) % rings;
    const off = i === rings - 1 ? seamOffset : 0;
    for (let k = 0; k < sides; k++) {
      const kN = (k + 1) % sides;
      const a = i * sides + k;
      const c = i * sides + kN;
      const b = iN * sides + ((k + off) % sides);
      const d = iN * sides + ((kN + off) % sides);
      indices.push(a, b, d, a, d, c);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aCenter', new THREE.Float32BufferAttribute(center, 2));
  geometry.setAttribute('aAxis', new THREE.Float32BufferAttribute(axis, 2));
  geometry.computeVertexNormals();
  return geometry;
}

export function MobiusScene({ mouseRef, color, reducedMotion, isLight, active, config }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  // Keep the latest config available to the (long-lived) frame loop.
  const cfgRef = useRef(config);
  cfgRef.current = config;

  const geometry = useMemo(
    () => buildMobiusTube(config),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      config.pathRadius,
      config.triAmount,
      config.tubeRadius,
      config.fluteCount,
      config.fluteDepth,
      config.radialSegments,
      config.tubularSegments,
      config.twistTurns,
    ],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);

  // Inner core: a plain SMOOTH tube on the same triangle path — no twist, no
  // flutes, no roll, fewer segments. Just thickness + color (cheap + clean).
  const innerGeometry = useMemo(
    () =>
      buildMobiusTube({
        ...config,
        tubeRadius: config.innerTubeRadius,
        twistTurns: 0,
        fluteDepth: 0,
        fluteCount: 1,
        radialSegments: 16,
        tubularSegments: 180,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.pathRadius, config.triAmount, config.innerTubeRadius],
  );
  useEffect(() => () => innerGeometry.dispose(), [innerGeometry]);

  const outerDiameter = useMemo(() => {
    geometry.computeBoundingSphere();
    return (geometry.boundingSphere?.radius ?? 1) * 2;
  }, [geometry]);

  // Procedural room environment (no network) so the glass has something to
  // reflect/refract — without it, transmission reads as a flat tint.
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const invalidate = useThree((s) => s.invalidate);

  // Drive the demand-mode loop ourselves at a capped frame rate. The rAF tick is
  // cheap (a timestamp check); it only triggers an actual render every ~1/38s.
  // When the hero scrolls offscreen, `active` is false and we render nothing.
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = 0;
    const minInterval = 1000 / TARGET_FPS;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last >= minInterval) {
        last = now;
        invalidate();
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, invalidate]);

  const envTexture = useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const tex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    return tex;
  }, [gl]);
  useEffect(() => {
    scene.environment = envTexture;
    return () => {
      if (scene.environment === envTexture) scene.environment = null;
      envTexture.dispose();
    };
  }, [scene, envTexture]);

  // Shader uniforms — mutated on config change / each frame; shared with the
  // compiled shader (roll phase + gradient core).
  const phase = useRef({ value: 0 });
  const uColorB = useRef({ value: new THREE.Color('#a070ff') });
  const uUseGradient = useRef({ value: 0 });
  const uGradScale = useRef({ value: 0.7 });
  // Inner-shape fresnel uniforms.
  const uInnerCenter = useRef({ value: new THREE.Color('#3aa0ff') });
  const uInnerEdge = useRef({ value: new THREE.Color('#ff4ad0') });
  const uInnerFresnel = useRef({ value: 2.5 });
  const uInnerGlow = useRef({ value: 1 });

  // Frosted-acrylic glass material with the in-place "roll" shader plus a
  // gradient core blended along the loop height.
  const material = useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(color),
      emissive: new THREE.Color(color),
      side: THREE.DoubleSide,
    });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uPhase = phase.current;
      shader.uniforms.uColorB = uColorB.current;
      shader.uniforms.uUseGradient = uUseGradient.current;
      shader.uniforms.uGradScale = uGradScale.current;
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform float uPhase;
          attribute vec2 aCenter;
          attribute vec2 aAxis;
          vec3 mobiusRoll(vec3 v, vec3 ax, float ang) {
            float c = cos(ang); float s = sin(ang);
            return v * c + cross(ax, v) * s + ax * dot(ax, v) * (1.0 - c);
          }`,
        )
        .replace(
          '#include <beginnormal_vertex>',
          `vec3 mAxis = normalize(vec3(aAxis, 0.0));
          vec3 objectNormal = mobiusRoll(normal, mAxis, uPhase);
          #ifdef USE_TANGENT
            vec3 objectTangent = vec3( tangent.xyz );
          #endif`,
        )
        .replace(
          '#include <begin_vertex>',
          `vec3 mCenter = vec3(aCenter, 0.0);
          vec3 transformed = mCenter + mobiusRoll(position - mCenter, normalize(vec3(aAxis, 0.0)), uPhase);`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform vec3 uColorB;
          uniform float uUseGradient, uGradScale;`,
        )
        .replace(
          '#include <normal_fragment_begin>',
          `#include <normal_fragment_begin>
          // Color core: surfaces facing the camera take the core color; it fades
          // to clear (the white base) toward the grazing / silhouette edges.
          float coreFade = pow(clamp(1.0 - dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), uGradScale);
          vec3 cored = mix(uColorB, diffuseColor.rgb, coreFade);
          diffuseColor.rgb = mix(diffuseColor.rgb, cored, uUseGradient);`,
        );
    };
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => () => material.dispose(), [material]);

  // Inner-shape material: a static, smooth fresnel two-color blend (center color
  // facing the camera -> edge color at grazing). No roll shader, no env — cheap.
  const innerMaterial = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#000'),
      roughness: 0.5,
      metalness: 0,
      envMapIntensity: 0,
      side: THREE.DoubleSide,
    });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uCenterColor = uInnerCenter.current;
      shader.uniforms.uEdgeColor = uInnerEdge.current;
      shader.uniforms.uFresnelPower = uInnerFresnel.current;
      shader.uniforms.uGlow = uInnerGlow.current;
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform vec3 uCenterColor, uEdgeColor;
          uniform float uFresnelPower, uGlow;`,
        )
        .replace(
          '#include <normal_fragment_begin>',
          `#include <normal_fragment_begin>
          float fres = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), uFresnelPower);
          vec3 fcol = mix(uCenterColor, uEdgeColor, fres);
          diffuseColor.rgb = fcol;
          totalEmissiveRadiance += fcol * uGlow;`,
        );
    };
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => () => innerMaterial.dispose(), [innerMaterial]);

  // flatShading toggling requires a recompile, so guard it behind an effect.
  useEffect(() => {
    material.flatShading = config.flatShading;
    material.needsUpdate = true;
  }, [config.flatShading, material]);

  // Material params that don't need a recompile.
  material.roughness = config.roughness;
  material.metalness = config.metalness;
  material.emissiveIntensity = config.emissiveIntensity;
  material.transmission = config.transmission;
  material.thickness = isLight ? config.thicknessLight : config.thickness;
  material.ior = config.ior;
  material.iridescence = config.iridescence;
  material.envMapIntensity = config.envIntensity;
  // tint 0 => no attenuation (clear); higher => shorter distance => stronger color.
  material.attenuationDistance = config.tint > 0.001 ? 0.1 + (1 - config.tint) * 1.9 : Infinity;
  // Semi-transparent frosted shell so the inner core shows through reliably.
  material.transparent = config.glassOpacity < 0.999;
  material.opacity = config.glassOpacity;
  uColorB.current.value.setHSL(config.hueB / 360, config.satB, config.lightB);
  uUseGradient.current.value = config.useGradient ? config.coreStrength : 0;
  uGradScale.current.value = config.gradientScale;
  uInnerCenter.current.value.setHSL(config.innerCenterHue / 360, config.innerCenterSat, config.innerCenterLight);
  uInnerEdge.current.value.setHSL(config.innerEdgeHue / 360, config.innerEdgeSat, config.innerEdgeLight);
  uInnerFresnel.current.value = config.innerFresnelPower;
  uInnerGlow.current.value = config.innerGlow;

  // Color lerp targets.
  const currentColor = useRef(new THREE.Color(color));
  const targetColor = useRef(new THREE.Color(color));
  useEffect(() => {
    targetColor.current.set(color);
  }, [color]);

  const anchorRef = useRef<HTMLElement | null>(null);
  const entranceStartRef = useRef<number | null>(null);
  const scratchVec = useRef(new THREE.Vector3());
  const scratchDir = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const cfg = cfgRef.current;

    const d = Math.min(delta, 0.033);
    const camera = state.camera as THREE.PerspectiveCamera;
    const vw = Math.max(state.size.width, 1);
    const vh = Math.max(state.size.height, 1);

    // Color — clear glass: a white surface, with the theme color carried as the
    // transmission tint (light through the glass picks it up) + a faint glow.
    currentColor.current.lerp(targetColor.current, 1 - Math.exp(-d / 0.2));
    material.color.setRGB(1, 1, 1);
    material.attenuationColor.copy(currentColor.current);
    material.emissive.copy(currentColor.current);

    // Roll — advance the cross-section phase (surface flows in place)
    phase.current.value += (reducedMotion ? cfg.rollSpeed * 0.3 : cfg.rollSpeed) * d;

    // Entrance
    if (entranceStartRef.current === null) entranceStartRef.current = state.clock.elapsedTime;
    const elapsed = state.clock.elapsedTime - entranceStartRef.current;
    const entrance = 1 - Math.pow(1 - Math.min(1, elapsed / 0.7), 3);

    // Anchor + fit
    const visibleHeight =
      2 * Math.abs(camera.position.z) * Math.tan(((camera.fov * Math.PI) / 180) / 2);
    let targetX = 0;
    let targetY = 0;
    let fitScale = 0.5;

    let anchor = anchorRef.current;
    if (!anchor || !document.body.contains(anchor)) {
      anchor = document.querySelector<HTMLElement>(ANCHOR_SELECTOR);
      anchorRef.current = anchor;
    }
    if (anchor) {
      const rect = anchor.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const ndcX = (centerX / vw) * 2 - 1;
      const ndcY = -(centerY / vh) * 2 + 1;
      scratchVec.current.set(ndcX, ndcY, 0.5).unproject(camera);
      scratchDir.current.copy(scratchVec.current).sub(camera.position).normalize();
      const t = (0 - camera.position.z) / scratchDir.current.z;
      targetX = camera.position.x + scratchDir.current.x * t;
      targetY = camera.position.y + scratchDir.current.y * t;
      const bandWorldHeight = (rect.height / vh) * visibleHeight;
      fitScale = (bandWorldHeight * 0.95) / outerDiameter;
    }
    fitScale = Math.max(0.15, Math.min(fitScale, 1.1));

    const mx = reducedMotion ? 0 : mouseRef.current.x;
    const my = reducedMotion ? 0 : mouseRef.current.y;
    const lerp = reducedMotion ? 0.1 : 1 - Math.exp(-d / 0.18);

    const posX = targetX + mx * 0.12;
    const posY = targetY + my * 0.08;
    group.position.x += (posX - group.position.x) * lerp;
    group.position.y += (posY - group.position.y) * lerp;

    const scaleTarget = fitScale * entrance;
    group.scale.x += (scaleTarget - group.scale.x) * lerp;
    group.scale.y += (scaleTarget - group.scale.y) * lerp;
    group.scale.z += (scaleTarget - group.scale.z) * lerp;

    const tiltX = cfg.baseTiltX + -my * 0.16;
    const tiltY = cfg.baseTiltY + mx * 0.3;
    group.rotation.x += (tiltX - group.rotation.x) * lerp;
    group.rotation.y += (tiltY - group.rotation.y) * lerp;

    // Optional whole-shape auto-rotation (for inspecting; 0 by default).
    const mesh = meshRef.current;
    if (mesh) {
      mesh.rotation.x += cfg.autoRotateX * d;
      mesh.rotation.y += cfg.autoRotateY * d;
      mesh.rotation.z += cfg.autoRotateZ * d;
    }
  });

  // Key light direction from azimuth/elevation.
  const az = (config.lightAzimuth * Math.PI) / 180;
  const el = (config.lightElevation * Math.PI) / 180;
  const keyPos: [number, number, number] = [
    Math.sin(az) * Math.cos(el) * 8,
    Math.sin(el) * 8,
    Math.cos(az) * Math.cos(el) * 8,
  ];

  return (
    <>
      {/* Config-driven studio lighting: key (by azimuth/elevation) + fills. */}
      <ambientLight intensity={config.ambient} />
      <directionalLight position={keyPos} intensity={config.keyStrength} />
      <directionalLight position={[0, 0.5, 8]} intensity={config.fillFront} />
      <directionalLight position={[7, 1, 2]} intensity={config.fillSide} />

      <group ref={groupRef} scale={0}>
        <mesh ref={meshRef} geometry={geometry} material={material} />
        {config.innerEnabled && (
          <mesh geometry={innerGeometry} material={innerMaterial} scale={config.innerScale} />
        )}
      </group>
    </>
  );
}
