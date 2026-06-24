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

  // Motion
  rollSpeed: number; // radians/sec the surface flows ("roll")
  autoRotateX: number; // continuous whole-shape spin (rad/sec)
  autoRotateY: number;
  autoRotateZ: number;
  baseTiltX: number; // resting forward tilt

  // Material
  flatShading: boolean; // faceted vs smooth
  roughness: number;
  metalness: number;
  emissiveIntensity: number; // self-lit floor so shadows don't go black

  // Color (override the theme color when useCustomColor is on)
  useCustomColor: boolean;
  hue: number; // 0–360
  saturation: number; // 0–1
  lightness: number; // 0–1

  // Lighting
  ambient: number;
  keyStrength: number;
  fillFront: number;
  fillSide: number;
  lightAzimuth: number; // degrees around the vertical axis
  lightElevation: number; // degrees up/down
};

export const DEFAULT_MOBIUS_CONFIG: MobiusConfig = {
  pathRadius: 0.7,
  triAmount: 0.065,
  tubeRadius: 0.22,
  fluteCount: 1,
  fluteDepth: 0.3,
  radialSegments: 6,
  tubularSegments: 360,
  twistTurns: 0.5,

  rollSpeed: 0.5,
  autoRotateX: 0,
  autoRotateY: 0,
  autoRotateZ: 0,
  baseTiltX: -0.34,

  flatShading: true,
  roughness: 1,
  metalness: 0.34,
  emissiveIntensity: 0.1,

  useCustomColor: false,
  hue: 230,
  saturation: 0.85,
  lightness: 0.6,

  ambient: 0.45,
  keyStrength: 1.7,
  fillFront: 0.6,
  fillSide: 0.4,
  lightAzimuth: 325,
  lightElevation: 35,
};
