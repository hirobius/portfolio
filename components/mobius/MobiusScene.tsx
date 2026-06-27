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
import { useDemandRenderLoop } from './useDemandRenderLoop';
import { useAnchorFit } from './useAnchorFit';
import { useMobiusMaterial } from './useMobiusMaterial';
import { useMobiusMaterialLite } from './useMobiusMaterialLite';
import type { MobiusConfig } from './mobiusConfig';

type Props = {
  mouseRef: React.MutableRefObject<{ x: number; y: number }>;
  color: string;
  reducedMotion: boolean;
  isLight: boolean;
  active: boolean;
  config: MobiusConfig;
  // 'glass' = the MeshPhysicalMaterial (transmission + inner core + env IBL), used
  // on every real GPU; 'lite' = the transmission-free fresnel fallback (no inner
  // mesh, no env) for software rasterizers. Chosen by device tier (see capability).
  variant: 'glass' | 'lite';
  // Demand-loop target frame rate — lower tiers cap it lower (see qualityForTier).
  fps: number;
};

// The render loop is capped well below the display refresh (the demand loop's
// target fps comes from the device tier — see qualityForTier). The transmission
// pass re-renders the whole scene each frame — the dominant GPU cost — so running
// the subtle roll at ~30-38fps (instead of 60/120Hz) frees most of the frame
// budget for smooth scroll compositing, with no visible loss on the animation.

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

export function MobiusScene({ mouseRef, color, reducedMotion, isLight, active, config, variant, fps }: Props) {
  const isGlass = variant === 'glass';
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

  // Entrance: a few warm-up frames (invisible) absorb the first-render hitch (the
  // shader compile + transmission-target build land there), then the canvas fades
  // in via a CSS transition (compositor-driven, so it stays smooth at the capped
  // render rate). The scale is held fixed so it's a pure fade, not a grow.
  const warmupRef = useRef(0);
  const fadeStartedRef = useRef(false);

  // Render scheduling: throttle the demand loop to the tier's target fps while the
  // hero is on screen; render nothing once it scrolls away.
  useDemandRenderLoop(active, fps);

  // Env IBL only exists for the glass — the lite fallback is unlit/emissive, so
  // it needs nothing to reflect or refract (and skipping it keeps lite truly cheap).
  const envTexture = useMemo(() => {
    if (!isGlass) return null;
    const pmrem = new THREE.PMREMGenerator(gl);
    const tex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    return tex;
  }, [gl, isGlass]);
  useEffect(() => {
    if (!envTexture) return;
    scene.environment = envTexture;
    return () => {
      if (scene.environment === envTexture) scene.environment = null;
      envTexture.dispose();
    };
  }, [scene, envTexture]);

  // Materials: both hooks run (hooks can't be conditional), but only the selected
  // material is attached to a rendered mesh below — so transmission/env cost is
  // incurred only in glass mode. The glass hook owns the frosted shell + inner
  // core; the lite hook owns the transmission-free fresnel shell.
  const { material: glassMaterial, innerMaterial } = useMobiusMaterial({ config, color, isLight, reducedMotion });
  const { material: liteMaterial } = useMobiusMaterialLite({ config, color, reducedMotion });
  const material = isGlass ? glassMaterial : liteMaterial;

  // Fit: glue the shape to the hero's [data-mobius-anchor] box. Returns a base
  // transform { x, y, scale } re-measured only on layout changes (see hook); the
  // frame loop below composes it with parallax, the config scale, and tilt.
  const fitRef = useAnchorFit(ANCHOR_SELECTOR, outerDiameter);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const cfg = cfgRef.current;

    const d = Math.min(delta, 0.033);

    // Entrance — hold invisible for a few warm-up frames (the shader compile /
    // transmission-target build land here), then hand the fade to a CSS opacity
    // transition. The compositor runs it smoothly at display refresh while the
    // glass itself only re-renders at the capped rate — no full-refresh load.
    if (!fadeStartedRef.current) {
      warmupRef.current += 1;
      if (warmupRef.current > 4) {
        fadeStartedRef.current = true;
        const canvas = state.gl.domElement;
        canvas.style.transition = 'opacity 0.6s ease-out';
        canvas.style.opacity = '1';
      }
    }

    // Position: the fixed glued base (+ a subtle cursor parallax on desktop).
    // No scroll-reactive motion — the canvas scrolls with the page itself.
    const mx = reducedMotion ? 0 : mouseRef.current.x;
    const my = reducedMotion ? 0 : mouseRef.current.y;
    const lerp = reducedMotion ? 0.1 : 1 - Math.exp(-d / 0.1);

    const posX = fitRef.current.x + mx * 0.12;
    const posY = fitRef.current.y + my * 0.08;
    group.position.x += (posX - group.position.x) * lerp;
    group.position.y += (posY - group.position.y) * lerp;

    // Scale is fixed at the fit size (× the config's overall-size multiplier) —
    // the entrance is a pure opacity fade, so the shape never grows on screen.
    group.scale.setScalar(fitRef.current.scale * (cfg.scale ?? 1));

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

  // No scene lights: the glass reads entirely from transmission + the attenuation
  // tint + the gradient-core shader. The studio lights contributed nothing to the
  // shipped look (verified), so they're gone.
  return (
    <>
      <group ref={groupRef} scale={0}>
        <mesh ref={meshRef} geometry={geometry} material={material} />
        {isGlass && config.innerEnabled && (
          <mesh geometry={innerGeometry} material={innerMaterial} scale={config.innerScale} />
        )}
      </group>
    </>
  );
}
