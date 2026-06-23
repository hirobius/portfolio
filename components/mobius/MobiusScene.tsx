'use client';

/**
 * MobiusScene — lean möbius centerpiece.
 *
 * A twisted, fluted triangular tube is baked once into a BufferGeometry. The
 * "roll" is done the way the original does it: a tiny vertex shader rotates each
 * cross-section by an animated phase (a rigid rotation about the tube tangent,
 * so the baked normals just rotate with it and lighting stays correct). The
 * shape stays put — apex up — while the twist flows around the loop.
 *
 * It anchors to the hero band, tilts toward the cursor, and flips color with
 * the theme. No transmission, no post-processing, no per-frame CPU rebuild.
 */

import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

type Props = {
  mouseRef: React.MutableRefObject<{ x: number; y: number }>;
  color: string;
  reducedMotion: boolean;
};

const ANCHOR_SELECTOR = '[data-mobius-anchor="hero"]';

// Twisted, fluted triangular tube. The flutes add radius outward, so the path
// corners must stay rounder than the flute's outer radius or the tube pinches.
const PATH_RADIUS = 0.7; // overall scale of the triangle
const TRI_AMOUNT = 0.1; // deltoid roundness: lower = rounder corners (avoids pinching)
const TUBE_RADIUS = 0.22; // base radius of the cross-section
const FLUTE_COUNT = 6; // sculpted ridges around the cross-section
const FLUTE_DEPTH = 0.24; // how pronounced the rounded ridges are
const RADIAL_SEGMENTS = 48; // smooth rounded ridges (no flat-shaded banding)
const TUBULAR_SEGMENTS = 420; // segments along the loop
const TWIST_TURNS = 2.0; // the ridges spiral this many turns; the phase flows them around

const BASE_TILT_X = -0.34; // forward lean so the triangle reads like a tilted "A"
const ROLL_SPEED = 0.5; // radians/sec the cross-section phase advances (the "roll")

/**
 * Twisted, fluted triangular tube baked into a BufferGeometry.
 *
 * Path: rounded triangle (deltoid), apex up. A fluted cross-section is swept
 * along it, rotating TWIST_TURNS times (distributed by arc length for an even
 * spiral). Per-vertex `aCenter` (ring center) and `aAxis` (tube tangent) are
 * stored so the shader can rotate each cross-section in place for the roll.
 */
function buildMobiusTube(): THREE.BufferGeometry {
  const positions: number[] = [];
  const center: number[] = [];
  const axis: number[] = [];
  const indices: number[] = [];
  const sides = RADIAL_SEGMENTS;
  const rings = TUBULAR_SEGMENTS;

  // ── Pass 1: sample the path, its planar frame, the tangent, and arc length ──
  const cxs = new Float64Array(rings + 1);
  const cys = new Float64Array(rings + 1);
  const txs = new Float64Array(rings + 1);
  const tys = new Float64Array(rings + 1);
  const nxs = new Float64Array(rings + 1);
  const nys = new Float64Array(rings + 1);
  const arc = new Float64Array(rings + 1);
  for (let i = 0; i <= rings; i++) {
    const u = (i / rings) * Math.PI * 2;
    const sinU = Math.sin(u);
    const cosU = Math.cos(u);
    const sin2U = 2 * sinU * cosU;
    const cos2U = 1 - 2 * sinU * sinU;

    // Rounded equilateral-triangle path (deltoid form), apex toward +y.
    const cx = PATH_RADIUS * (-sinU + TRI_AMOUNT * sin2U);
    const cy = PATH_RADIUS * (cosU + TRI_AMOUNT * cos2U);

    // Planar frame: tangent T = dC/du, in-plane normal N = T rotated −90°, B = z.
    let tx = PATH_RADIUS * (-cosU + 2 * TRI_AMOUNT * cos2U);
    let ty = PATH_RADIUS * (-sinU - 2 * TRI_AMOUNT * sin2U);
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
  const totalArc = arc[rings] || 1;
  const totalTwist = TWIST_TURNS * Math.PI * 2;

  // ── Pass 2: sweep the fluted cross-section, twisting by arc length ──
  for (let i = 0; i <= rings; i++) {
    const cx = cxs[i];
    const cy = cys[i];
    const nx = nxs[i];
    const ny = nys[i];
    const twist = totalTwist * (arc[i] / totalArc);
    for (let k = 0; k <= sides; k++) {
      const theta = (k / sides) * Math.PI * 2 + twist;
      const ct = Math.cos(theta);
      const st = Math.sin(theta);
      const r = TUBE_RADIUS * (1 + FLUTE_DEPTH * Math.cos(FLUTE_COUNT * theta));
      // vertex = C + r·(ct·N + st·B), with B = (0, 0, 1)
      positions.push(cx + r * ct * nx, cy + r * ct * ny, r * st);
      center.push(cx, cy);
      axis.push(txs[i], tys[i]);
    }
  }

  const row = sides + 1;
  for (let i = 0; i < rings; i++) {
    for (let k = 0; k < sides; k++) {
      const a = i * row + k;
      const b = a + row;
      const c = a + 1;
      const d = b + 1;
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

export function MobiusScene({ mouseRef, color, reducedMotion }: Props) {
  const groupRef = useRef<THREE.Group>(null);

  const geometry = useMemo(buildMobiusTube, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  // Rotation-invariant diameter for the auto-fit.
  const outerDiameter = useMemo(() => {
    geometry.computeBoundingSphere();
    return (geometry.boundingSphere?.radius ?? 1) * 2;
  }, [geometry]);

  // The roll uniform — mutated each frame; shared with the compiled shader.
  const phase = useRef({ value: 0 });

  // Material with the in-place "roll" shader: rotate each cross-section about the
  // tube tangent by uPhase. Because it's a rigid rotation, the baked normal just
  // rotates with it, so lighting stays correct.
  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.06,
      roughness: 0.5,
      metalness: 0,
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

  // Color lerp targets.
  const currentColor = useRef(new THREE.Color(color));
  const targetColor = useRef(new THREE.Color(color));
  useEffect(() => {
    targetColor.current.set(color);
  }, [color]);

  // Anchor + entrance bookkeeping.
  const anchorRef = useRef<HTMLElement | null>(null);
  const entranceStartRef = useRef<number | null>(null);

  // Scratch objects (avoid per-frame allocation).
  const scratchVec = useRef(new THREE.Vector3());
  const scratchDir = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const d = Math.min(delta, 0.033);
    const camera = state.camera as THREE.PerspectiveCamera;
    const vw = Math.max(state.size.width, 1);
    const vh = Math.max(state.size.height, 1);

    // ── Color ────────────────────────────────────────────────────────────
    currentColor.current.lerp(targetColor.current, 1 - Math.exp(-d / 0.2));
    material.color.copy(currentColor.current);
    material.emissive.copy(currentColor.current);

    // ── Roll: advance the cross-section phase (the surface flows in place) ──
    phase.current.value += (reducedMotion ? ROLL_SPEED * 0.3 : ROLL_SPEED) * d;

    // ── Entrance (scale + grow over ~0.7s) ───────────────────────────────
    if (entranceStartRef.current === null) entranceStartRef.current = state.clock.elapsedTime;
    const elapsed = state.clock.elapsedTime - entranceStartRef.current;
    const entrance = 1 - Math.pow(1 - Math.min(1, elapsed / 0.7), 3);

    // ── Anchor to the hero band, derive a fitting scale ──────────────────
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

      // Unproject the band center onto the z = 0 plane.
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

    // Position (anchor + subtle cursor parallax).
    const posX = targetX + mx * 0.12;
    const posY = targetY + my * 0.08;
    group.position.x += (posX - group.position.x) * lerp;
    group.position.y += (posY - group.position.y) * lerp;

    // Scale (fit * entrance).
    const scaleTarget = fitScale * entrance;
    group.scale.x += (scaleTarget - group.scale.x) * lerp;
    group.scale.y += (scaleTarget - group.scale.y) * lerp;
    group.scale.z += (scaleTarget - group.scale.z) * lerp;

    // Tilt toward the cursor (parallax depth) — the shape stays apex-up.
    const tiltX = BASE_TILT_X + -my * 0.16;
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
