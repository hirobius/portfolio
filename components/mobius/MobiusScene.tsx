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

// Faceted, twisted, *triangular* tube — a 6-sided cross-section swept along a
// rounded-triangle path (apex up) while spinning, so it reads as a twisted rope
// shaped into a leaning "A".
const PATH_RADIUS = 0.6; // overall scale of the triangle
const TRI_AMOUNT = 0.2; // deltoid roundness: 0 = circle, ~0.3 = sharper triangular corners
const TUBE_RADIUS = 0.24; // base radius of the cross-section
const FLUTE_COUNT = 6; // rounded ridges around the cross-section
const FLUTE_DEPTH = 0.22; // how pronounced the rounded ridges are
const RADIAL_SEGMENTS = 96; // smooth rounded ridges (a multiple of FLUTE_COUNT)
const TUBULAR_SEGMENTS = 420; // segments along the loop
const TWIST_TURNS = 3.5; // cross-section turns along the path (back to the tighter twist)

const BASE_TILT_X = -0.34; // forward lean so the triangle reads like a tilted "A"

/**
 * Faceted, twisted triangular tube baked into a BufferGeometry.
 *
 * The path is a rounded triangle in polar form r(u) = R·(1 − a·sin 3u), which
 * puts a vertex at the top (apex up). A regular hexagon cross-section is swept
 * along it while rotating TWIST_TURNS times; n.5 turns is an odd number of
 * half-twists, so the surface stays one-sided (möbius) and — being a multiple
 * of 60° at the seam — closes cleanly.
 */
function buildMobiusTube(): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  const sides = RADIAL_SEGMENTS;
  const rings = TUBULAR_SEGMENTS;

  // ── Pass 1: sample the path, its planar frame, and cumulative arc length ──
  const cxs = new Float64Array(rings + 1);
  const cys = new Float64Array(rings + 1);
  const nxs = new Float64Array(rings + 1);
  const nys = new Float64Array(rings + 1);
  const arc = new Float64Array(rings + 1);
  for (let i = 0; i <= rings; i++) {
    const u = (i / rings) * Math.PI * 2;
    const sinU = Math.sin(u);
    const cosU = Math.cos(u);
    const sin2U = 2 * sinU * cosU;
    const cos2U = 1 - 2 * sinU * sinU;

    // Rounded equilateral-triangle path (deltoid form), apex toward +y:
    //   C(u) = R · ( −sin u + b·sin 2u ,  cos u + b·cos 2u )
    // Straight-ish sides with rounded corners — reads as a triangle, not a clover.
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
    nxs[i] = ty;
    nys[i] = -tx;
    arc[i] = i > 0 ? arc[i - 1] + Math.hypot(cx - cxs[i - 1], cy - cys[i - 1]) : 0;
  }
  const totalArc = arc[rings] || 1;
  const totalTwist = TWIST_TURNS * Math.PI * 2;

  // ── Pass 2: sweep the fluted cross-section, twisting by ARC LENGTH so the
  //    spiral is tight and even all the way around (not bunched at the corners) ──
  for (let i = 0; i <= rings; i++) {
    const cx = cxs[i];
    const cy = cys[i];
    const nx = nxs[i];
    const ny = nys[i];
    // The sculpted cross-section is rotated by `twist` (growing with arc length),
    // so the ridges turn on the tube's own axis as it travels the loop and spiral
    // gently end-to-end — the möbius-style twist.
    const twist = totalTwist * (arc[i] / totalArc);
    for (let k = 0; k <= sides; k++) {
      const theta = (k / sides) * Math.PI * 2 + twist;
      const ct = Math.cos(theta);
      const st = Math.sin(theta);
      // Sculpted cross-section: rounded ridges with valleys sunk between them.
      const r = TUBE_RADIUS * (1 + FLUTE_DEPTH * Math.cos(FLUTE_COUNT * theta));
      // vertex = C + r·(ct·N + st·B), with B = (0, 0, 1)
      positions.push(cx + r * ct * nx, cy + r * ct * ny, r * st);
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
  geometry.computeVertexNormals();
  return geometry;
}

export function MobiusScene({ mouseRef, color, reducedMotion }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  const geometry = useMemo(buildMobiusTube, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  // Rotation-invariant diameter for the auto-fit (the shape spins, so fit the
  // bounding sphere into the hero band — it never overflows at any angle).
  const outerDiameter = useMemo(() => {
    geometry.computeBoundingSphere();
    return (geometry.boundingSphere?.radius ?? 1) * 2;
  }, [geometry]);

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

    // Tilt toward the cursor (parallax depth).
    const tiltX = BASE_TILT_X + -my * 0.16;
    const tiltY = mx * 0.3;
    group.rotation.x += (tiltX - group.rotation.x) * lerp;
    group.rotation.y += (tiltY - group.rotation.y) * lerp;

    // Gentle sway around the vertical axis — keeps the apex up so the triangle
    // keeps reading as a leaning "A" while still feeling alive.
    mesh.rotation.y = reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.45) * 0.26;
  });

  return (
    <>
      {/* Key + low ambient so the sculpted valleys shadow and the ridges read. */}
      <ambientLight intensity={0.33} />
      <directionalLight position={[-3, 4, 5]} intensity={2.1} />
      <directionalLight position={[5, 2, 2]} intensity={0.5} />
      <directionalLight position={[1, -4, 1]} intensity={0.28} />

      <group ref={groupRef} scale={0}>
        <mesh ref={meshRef} geometry={geometry}>
          {/* Smooth shading so the ridges read as rounded and the valleys as
              sunken; the sculpted ridges spiral with the twist. Matte clay. */}
          <meshStandardMaterial
            ref={materialRef}
            color={color}
            emissive={color}
            emissiveIntensity={0.06}
            roughness={0.48}
            metalness={0.0}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </>
  );
}
