/**
 * Tunable parameters for the möbius shape. The dev tuner (MobiusTuner, shown
 * with ?tune in the URL) edits these live; the defaults below are what ships.
 */
export type MobiusConfig = {
  // Geometry (changing these rebuilds the BufferGeometry)
  pathRadius: number;
  triAmount: number;
  tubeRadius: number;
  fluteCount: number;
  fluteDepth: number;
  radialSegments: number;
  tubularSegments: number;
  twistTurns: number;

  // Motion
  rollSpeed: number;
  autoRotateX: number;
  autoRotateY: number;
  autoRotateZ: number;
  baseTiltX: number;
  baseTiltY: number;

  // Material
  flatShading: boolean;
  roughness: number;
  metalness: number;
  emissiveIntensity: number;

  // Acrylic / glass
  transmission: number; // 0 = opaque, 1 = full glass (frosted by roughness)
  thickness: number; // refraction depth
  ior: number; // index of refraction
  iridescence: number; // soft oily sheen on the glass
  envIntensity: number; // strength of the reflected environment (glass sparkle)
  attenuationDistance: number; // how strongly the color tints light through the glass (lower = stronger)

  // Color
  useCustomColor: boolean;
  hue: number;
  saturation: number;
  lightness: number;

  // Gradient core (blend the base color toward a second color along the height)
  useGradient: boolean;
  hueB: number;
  satB: number;
  lightB: number;
  gradientScale: number;
  gradientOffset: number;

  // Nested inner triangle
  innerEnabled: boolean;
  innerScale: number; // size of the inner möbius relative to the outer
  innerFresnelPower: number; // fresnel falloff (higher = thinner edge color)
  innerGlow: number; // self-lit intensity so it shows through the glass
  innerCenterHue: number; // color of surfaces facing the camera
  innerCenterSat: number;
  innerCenterLight: number;
  innerEdgeHue: number; // color at grazing / far edges
  innerEdgeSat: number;
  innerEdgeLight: number;

  // Lighting
  ambient: number;
  keyStrength: number;
  fillFront: number;
  fillSide: number;
  lightAzimuth: number;
  lightElevation: number;
};

export const DEFAULT_MOBIUS_CONFIG: MobiusConfig = {
  pathRadius: 0.7,
  triAmount: 0.065,
  tubeRadius: 0.22,
  fluteCount: 1,
  fluteDepth: 0.3,
  radialSegments: 6,
  tubularSegments: 720,
  twistTurns: 0.5,

  rollSpeed: 0.5,
  autoRotateX: 0,
  autoRotateY: 0,
  autoRotateZ: 0,
  baseTiltX: -0.34,
  baseTiltY: 0,

  flatShading: false,
  roughness: 0.12,
  metalness: 0,
  emissiveIntensity: 0.04,

  transmission: 1,
  thickness: 0.6,
  ior: 1.45,
  iridescence: 0,
  envIntensity: 0.9,
  attenuationDistance: 0.6,

  useCustomColor: false,
  hue: 230,
  saturation: 0.85,
  lightness: 0.6,

  useGradient: false,
  hueB: 285,
  satB: 0.8,
  lightB: 0.62,
  gradientScale: 0.7,
  gradientOffset: 0.5,

  innerEnabled: false,
  innerScale: 0.55,
  innerFresnelPower: 2.2,
  innerGlow: 0.55,
  innerCenterHue: 200,
  innerCenterSat: 0.95,
  innerCenterLight: 0.5,
  innerEdgeHue: 320,
  innerEdgeSat: 0.95,
  innerEdgeLight: 0.55,

  ambient: 0.45,
  keyStrength: 1.7,
  fillFront: 0.6,
  fillSide: 0.4,
  lightAzimuth: 325,
  lightElevation: 35,
};
