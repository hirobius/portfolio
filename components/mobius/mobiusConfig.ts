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
  baseTiltX: number;
  baseTiltY: number;

  // Material
  flatShading: boolean;
  roughness: number;

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

  // Lite fallback (transmission-free fresnel; used on software rasterizers). These
  // shape the cheap material's view-angle gradient — see useMobiusMaterialLite.
  liteBody: number; // body brightness × the theme blue (deepen with <1)
  liteEdge: number; // grazing-edge brightness × the theme blue (deeper)
  liteSheen: number; // intensity of the facing-surface sheen lift
  liteSheenMix: number; // how far the sheen color lerps toward white (0..1)
  liteFresnel: number; // edge fresnel power (higher = thinner edge band)
  liteSheenPower: number; // sheen tightness (higher = smaller hotspot)

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
  baseTiltX: 0,
  baseTiltY: 0.18,

  flatShading: true,
  roughness: 0.6,

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

  liteBody: 0.92,
  liteEdge: 0.34,
  liteSheen: 0.24,
  liteSheenMix: 0.85,
  liteFresnel: 2.0,
  liteSheenPower: 5.0,

  innerEnabled: true,
  innerScale: 0.86,
  innerTubeRadius: 0.06,
  innerFresnelPower: 6,
  innerGlow: 0,
  innerCenterHue: 360,
  innerCenterSat: 1,
  innerCenterLight: 0.84,
};
