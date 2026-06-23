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
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { MobiusConfig } from './mobiusConfig';

type Props = {
  mouseRef: React.MutableRefObject<{ x: number; y: number }>;
  color: string;
  reducedMotion: boolean;
  config: MobiusConfig;
};

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

export function MobiusScene({ mouseRef, color, reducedMotion, config }: Props) {
  const groupRef = useRef<THREE.Group>(null);

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

  const outerDiameter = useMemo(() => {
    geometry.computeBoundingSphere();
    return (geometry.boundingSphere?.radius ?? 1) * 2;
  }, [geometry]);

  // The roll uniform — mutated each frame; shared with the compiled shader.
  const phase = useRef({ value: 0 });

  // Material with the in-place "roll" shader.
  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      emissive: new THREE.Color(color),
      side: THREE.DoubleSide,
    });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uPhase = phase.current;
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
    };
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => () => material.dispose(), [material]);

  // Material params that don't need a recompile.
  material.roughness = config.roughness;
  material.metalness = config.metalness;
  material.emissiveIntensity = config.emissiveIntensity;

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

    // Color
    currentColor.current.lerp(targetColor.current, 1 - Math.exp(-d / 0.2));
    material.color.copy(currentColor.current);
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
    const tiltY = mx * 0.3;
    group.rotation.x += (tiltX - group.rotation.x) * lerp;
    group.rotation.y += (tiltY - group.rotation.y) * lerp;
  });

  return (
    <>
      {/* Soft, balanced studio lighting for a clean matte read (no harsh banding). */}
      <ambientLight intensity={0.45} />
      <directionalLight position={[-3, 4, 5]} intensity={1.7} />
      <directionalLight position={[4, 1, 3]} intensity={0.6} />
      <directionalLight position={[0, -3, -2]} intensity={0.4} />

      <group ref={groupRef} scale={0}>
        <mesh geometry={geometry} material={material} />
      </group>
    </>
  );
}
