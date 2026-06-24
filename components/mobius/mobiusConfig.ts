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
  tint: number; // 0 = clear/colorless glass, 1 = strongly colored
  glassOpacity: number; // 1 = solid, lower = see the inner core through the frosted shell

  // Color
  useCustomColor: boolean;
  hue: number;
  saturation: number;
  lightness: number;

  // Gradient core (blend the base color toward a second color along the height)
  useGradient: boolean;
  coreStrength: number; // 0..1 how strongly the outer takes the core color
  hueB: number;
  satB: number;
  lightB: number;
  gradientScale: number;
  gradientOffset: number;

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

  flatShading: true,
  roughness: 0.35,
  metalness: 0,
  emissiveIntensity: 0,

  transmission: 1,
  thickness: 0.6,
  ior: 1.4,
  iridescence: 0,
  envIntensity: 0.55,
  tint: 0,
  glassOpacity: 0.7,

  useCustomColor: false,
  hue: 230,
  saturation: 0.85,
  lightness: 0.6,

  useGradient: false,
  coreStrength: 0.6,
  hueB: 215,
  satB: 0.9,
  lightB: 0.55,
  gradientScale: 1.6,
  gradientOffset: 0.5,

  innerEnabled: true,
  innerScale: 1,
  innerTubeRadius: 0.15,
  innerFresnelPower: 2,
  innerGlow: 1.3,
  innerCenterHue: 208,
  innerCenterSat: 0.85,
  innerCenterLight: 0.62,
  innerEdgeHue: 224,
  innerEdgeSat: 0.95,
  innerEdgeLight: 0.42,

  ambient: 0.45,
  keyStrength: 1.7,
  fillFront: 0.6,
  fillSide: 0.4,
  lightAzimuth: 325,
  lightElevation: 35,
};
