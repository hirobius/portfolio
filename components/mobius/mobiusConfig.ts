/**
 * Tunable parameters for the möbius shape. The dev tuner (MobiusTuner, shown
 * with ?tune in the URL) edits these live; the defaults below are what ships.
 */
export type MobiusConfig = {
  // Geometry (changing these rebuilds the BufferGeometry)
  pathRadius: number; // overall scale of the triangle loop
  triAmount: number; // triangularity: 0 = circle, higher = sharper corners
  tubeRadius: number; // base thickness of the tube
  fluteCount: number; // number of sculpted ridges around the tube
  fluteDepth: number; // how deep the flute valleys are
  radialSegments: number; // tessellation around the tube (smoothness of ridges)
  tubularSegments: number; // tessellation along the loop
  twistTurns: number; // how many turns the cross-section makes along the loop

  // Motion + material (applied without a rebuild)
  rollSpeed: number; // radians/sec the surface flows ("roll")
  baseTiltX: number; // resting forward tilt
  roughness: number; // material roughness
  metalness: number; // material metalness
  emissiveIntensity: number; // self-lit floor so shadows don't go black
};

export const DEFAULT_MOBIUS_CONFIG: MobiusConfig = {
  pathRadius: 0.7,
  triAmount: 0.1,
  tubeRadius: 0.22,
  fluteCount: 6,
  fluteDepth: 0.24,
  radialSegments: 48,
  tubularSegments: 420,
  twistTurns: 2,
  rollSpeed: 0.5,
  baseTiltX: -0.34,
  roughness: 0.5,
  metalness: 0,
  emissiveIntensity: 0.06,
};
