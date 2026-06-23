'use client';

/**
 * MobiusScene — lean möbius centerpiece.
 *
 * A real möbius strip is generated once on the CPU (no runtime shader, no
 * transmission pass, no post-processing). It anchors itself to the hero band
 * ([data-mobius-anchor="hero"]), rolls slowly, and tilts toward the cursor.
 * Color is driven by the theme and lerps on light/dark flips.
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

// Möbius strip geometry parameters.
const LOOP_RADIUS = 1;
const BAND_WIDTH = 0.62;
const U_SEGMENTS = 240; // around the loop
const V_SEGMENTS = 14; // across the band
const OUTER_DIAMETER = 2 * (LOOP_RADIUS + BAND_WIDTH / 2);

const BASE_TILT_X = -0.62; // look down into the loop for a 3/4 view

/** Classic parametric möbius strip baked into a BufferGeometry. */
function buildMobiusStrip(): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= U_SEGMENTS; i++) {
    const u = (i / U_SEGMENTS) * Math.PI * 2;
    const cosU = Math.cos(u);
    const sinU = Math.sin(u);
    const cosHalf = Math.cos(u / 2);
    const sinHalf = Math.sin(u / 2);
    for (let j = 0; j <= V_SEGMENTS; j++) {
      const v = (j / V_SEGMENTS - 0.5) * BAND_WIDTH;
      const radial = LOOP_RADIUS + v * cosHalf;
      positions.push(radial * cosU, radial * sinU, v * sinHalf);
    }
  }

  const row = V_SEGMENTS + 1;
  for (let i = 0; i < U_SEGMENTS; i++) {
    for (let j = 0; j < V_SEGMENTS; j++) {
      const a = i * row + j;
      const b = a + row;
      const c = a + 1;
      const d = b + 1;
      indices.push(a, b, d, a, d, c);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export function MobiusScene({ mouseRef, color, reducedMotion }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  const geometry = useMemo(buildMobiusStrip, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

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
    const mesh = meshRef.current;
    const material = materialRef.current;
    if (!group || !mesh) return;

    const d = Math.min(delta, 0.033);
    const camera = state.camera as THREE.PerspectiveCamera;
    const vw = Math.max(state.size.width, 1);
    const vh = Math.max(state.size.height, 1);

    // ── Color ────────────────────────────────────────────────────────────
    if (material) {
      currentColor.current.lerp(targetColor.current, 1 - Math.exp(-d / 0.2));
      material.color.copy(currentColor.current);
      material.emissive.copy(currentColor.current);
    }

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
      fitScale = (bandWorldHeight * 0.9) / OUTER_DIAMETER;
    }
    fitScale = Math.max(0.18, Math.min(fitScale, 0.85));

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

    // Tilt toward the cursor (parallax depth).
    const tiltX = BASE_TILT_X + -my * 0.16;
    const tiltY = mx * 0.3;
    group.rotation.x += (tiltX - group.rotation.x) * lerp;
    group.rotation.y += (tiltY - group.rotation.y) * lerp;

    // Continuous slow roll — the möbius twist travels around the loop.
    const roll = reducedMotion ? 0.05 : 0.5;
    mesh.rotation.z += roll * d;
  });

  return (
    <>
      {/* Matte clay lighting — no env map, renders on every GPU. */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[4, 5, 3]} intensity={1.5} />
      <directionalLight position={[-5, 1, 2]} intensity={0.55} />
      <directionalLight position={[0, -2, -4]} intensity={0.5} />

      <group ref={groupRef} scale={0}>
        <mesh ref={meshRef} geometry={geometry}>
          <meshStandardMaterial
            ref={materialRef}
            color={color}
            emissive={color}
            emissiveIntensity={0.12}
            roughness={0.7}
            metalness={0.0}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </>
  );
}
