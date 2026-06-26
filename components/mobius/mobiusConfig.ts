/**
 * Tunable parameters for the möbius shape. The dev tuner (MobiusTuner, shown
 * with ?tune in the URL) edits these live; the defaults below are what ships.
 */
export type MobiusConfig = {
  // Overall size — a multiplier on the auto-fit, so the WHOLE shape scales
  // uniformly within its band (1 = fill the band; lower = smaller). Unlike
  // pathRadius, this doesn't change the tube-to-ring proportions.
  scale: number;

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
  innerCenterHue: number; // color of surfaces facing the camera (falls to black at edges)
  innerCenterSat: number;
  innerCenterLight: number;
};

export const DEFAULT_MOBIUS_CONFIG: MobiusConfig = {
  scale: 1,

  pathRadius: 0.7,
  triAmount: 0.065,
  tubeRadius: 0.225,
  fluteCount: 1,
  fluteDepth: 0.17,
  radialSegments: 6,
  tubularSegments: 600,
  twistTurns: 0.5,

  rollSpeed: 0.35,
  autoRotateX: 0,
  autoRotateY: 0,
  autoRotateZ: 0,
  baseTiltX: 0,
  baseTiltY: 0.18,

  flatShading: true,
  roughness: 0.6,
  metalness: 0,
  emissiveIntensity: 0,

  transmission: 1,
  thickness: 0.7,
  thicknessLight: 0.3,
  ior: 1.32,
  envIntensity: 0,
  tint: 1,
  glassOpacity: 1,

  useCustomColor: false,
  hue: 246,
  saturation: 0.42,
  lightness: 0.72,

  useGradient: true,
  coreStrength: 0,
  hueB: 0,
  satB: 1,
  lightB: 1,
  gradientScale: 3.6,

  innerEnabled: true,
  innerScale: 0.86,
  innerTubeRadius: 0.06,
  innerFresnelPower: 6,
  innerGlow: 0,
  innerCenterHue: 360,
  innerCenterSat: 1,
  innerCenterLight: 0.84,
};
