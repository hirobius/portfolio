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
  thickness: number; // refraction depth (dark theme)
  thicknessLight: number; // refraction depth on the light theme
  ior: number; // index of refraction
  iridescence: number; // soft oily sheen on the glass
  envIntensity: number; // strength of the reflected environment (glass sparkle)
  tint: number; // 0 = clear/colorless glass, 1 = strongly colored
  glassOpacity: number; // 1 = solid, lower = see the inner core through the frosted shell

  // Color
  useCustomColor: boolean;
  hue: number;
  saturation: number;
  lightness: number;

  // Color core (inverse-fresnel tint on the outer glass)
  useGradient: boolean;
  coreStrength: number; // 0..1 how strongly the outer takes the core color
  hueB: number;
  satB: number;
  lightB: number;
  gradientScale: number; // fresnel falloff (core size)

  // Nested inner triangle (same path, thinner tube)
  innerEnabled: boolean;
  innerScale: number; // overall size of the inner möbius (1 = same as outer)
  innerTubeRadius: number; // tube thickness of the inner core (smaller => fits inside)
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
  tubeRadius: 0.225,
  fluteCount: 1,
  fluteDepth: 0.17,
  radialSegments: 6,
  tubularSegments: 688,
  twistTurns: 0.5,

  rollSpeed: 0.35,
  autoRotateX: 0,
  autoRotateY: 0,
  autoRotateZ: 0,
  baseTiltX: 0,
  baseTiltY: 0.18,

  flatShading: true,
  roughness: 0.78,
  metalness: 0,
  emissiveIntensity: 0,

  transmission: 1,
  thickness: 0.7,
  thicknessLight: 0.3,
  ior: 1.32,
  iridescence: 0.16,
  envIntensity: 0.45,
  tint: 1,
  glassOpacity: 1,

  useCustomColor: true,
  hue: 246,
  saturation: 0.42,
  lightness: 0.72,

  useGradient: true,
  coreStrength: 1,
  hueB: 0,
  satB: 1,
  lightB: 1,
  gradientScale: 0.3,

  innerEnabled: true,
  innerScale: 1,
  innerTubeRadius: 0.06,
  innerFresnelPower: 5.2,
  innerGlow: 0,
  innerCenterHue: 208,
  innerCenterSat: 0.92,
  innerCenterLight: 0.84,
  innerEdgeHue: 360,
  innerEdgeSat: 1,
  innerEdgeLight: 1,

  ambient: 0.8,
  keyStrength: 1.7,
  fillFront: 0.6,
  fillSide: 0.4,
  lightAzimuth: 320,
  lightElevation: -80,
};
