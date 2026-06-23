/**
 * mobiusStore — zustand store for the möbius scene's uniforms and layout.
 *
 * Slimmed for the portfolio: the original multi-route preset/shell machinery
 * has been dropped. A single "home" configuration anchors the möbius to the
 * hero element ([data-mobius-anchor="hero"]). The Canvas wrapper writes the
 * theme color and performance tier; the scene reads everything else.
 *
 * Shader uniforms below use values intrinsic to the 3D effect, not design
 * tokens — the surrounding UI uses tokens normally.
 */

import { create } from 'zustand';
import { MOBIUS_BASE_COLOR } from './tokens';

export type PerformanceTier = 'high' | 'medium' | 'low';
export type DistortionMode = 'organic' | 'linear' | 'magnetic';

export type MobiusUniforms = {
  // Geometry (drives TubeGeometry rebuild via useMemo)
  tubeRadius: number;
  pathRadius: number;
  twistCount: number;
  tubularSegments: number;
  radialSegments: number;

  // Material
  wireframe: boolean;
  transmission: number;
  roughness: number;
  thickness: number;
  metalness: number;
  emissiveIntensity: number;
  color: string;

  // Deformation uniforms (GPU-side — no geometry rebuild)
  uTwistAmount: number; // 0 = torus, 1 = full Möbius
  uWaveAmplitude: number;
  uWaveFrequency: number;
  uWaveSpeed: number;
  uGlitchIntensity: number;

  // Post-processing
  bloomIntensity: number;
  bloomThreshold: number;
  noiseOpacity: number;
  vignetteIntensity: number;

  // Transform / animation
  scale: number;
  rotationSpeed: number;
  rollSpeed: number;
  mouseInfluence: number;

  // Magnetic distortion system
  distortionMode: DistortionMode;
  glitchIntensity: number;
  gridSize: number;
  liquidStrength: number;
  rippleRadius: number;
  rippleFrequency: number;
  waveSpeed: number;
  sealedEdges: boolean;
  magneticDrag: number;
  magneticSwirl: number;
  magneticDepth: number;
  magneticLag: number;
};

export type MobiusLayoutState = {
  layoutAnchorSelector: string | null;
  layoutPositionX: number;
  layoutPositionY: number;
  layoutPositionZ: number;
  layoutRotationX: number;
  layoutRotationY: number;
  layoutRotationZ: number;
  layoutScale: number;
};

export type MobiusRouteSplashState = {
  routeSplashActive: boolean;
  routeSplashStartedAt: number;
  routeSplashDurationMs: number;
};

export type MobiusState = MobiusUniforms &
  MobiusLayoutState &
  MobiusRouteSplashState & {
    activePreset: string;
    performanceTier: PerformanceTier;
    reducedMotion: boolean;
    navScrollProgress: number;
    navAcrylicHovered: boolean;
    setUniforms: (partial: Partial<MobiusUniforms>) => void;
    setPerformanceTier: (tier: PerformanceTier) => void;
    clearRouteSplash: () => void;
  };

// ── Defaults — faceted matte-clay look, anchored into the hero ───────────────

export const MOBIUS_DEFAULTS: MobiusUniforms = {
  tubeRadius: 0.325,
  pathRadius: 0.67,
  twistCount: 1,
  tubularSegments: 320,
  radialSegments: 6,
  wireframe: false,
  transmission: 0.12,
  roughness: 0.82,
  thickness: 0.5,
  metalness: 0.1,
  emissiveIntensity: 0.2,
  color: MOBIUS_BASE_COLOR, // overwritten from --mobius-color at mount
  uTwistAmount: 1.0,
  uWaveAmplitude: 0.0,
  uWaveFrequency: 3,
  uWaveSpeed: 1.8,
  uGlitchIntensity: 0.0,
  bloomIntensity: 0.3,
  bloomThreshold: 0.1,
  noiseOpacity: 0.03,
  vignetteIntensity: 0.35,
  scale: 0.5,
  rotationSpeed: 0,
  rollSpeed: 0.5,
  mouseInfluence: 0.5,
  distortionMode: 'magnetic',
  glitchIntensity: 1.0,
  gridSize: 32,
  liquidStrength: 3,
  rippleRadius: 3,
  rippleFrequency: 1,
  waveSpeed: 0.0,
  sealedEdges: true,
  magneticDrag: 0.7,
  magneticSwirl: 0,
  magneticDepth: 1,
  magneticLag: 0.5,
};

const HOME_LAYOUT: MobiusLayoutState = {
  layoutAnchorSelector: '[data-mobius-anchor="hero"]',
  layoutPositionX: 0,
  layoutPositionY: 0,
  layoutPositionZ: -0.16,
  layoutRotationX: -0.04,
  layoutRotationY: 0,
  layoutRotationZ: 0,
  layoutScale: 0.92,
};

const DEFAULT_ROUTE_SPLASH: MobiusRouteSplashState = {
  routeSplashActive: false,
  routeSplashStartedAt: 0,
  routeSplashDurationMs: 620,
};

export const useMobiusStore = create<MobiusState>()((set) => {
  const reducedMotion =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  return {
    ...MOBIUS_DEFAULTS,
    ...HOME_LAYOUT,
    ...DEFAULT_ROUTE_SPLASH,
    activePreset: 'home',
    performanceTier: 'high',
    reducedMotion,
    navScrollProgress: 0,
    navAcrylicHovered: false,

    setUniforms: (partial) => set((s) => ({ ...s, ...partial })),
    setPerformanceTier: (tier) => set({ performanceTier: tier }),
    clearRouteSplash: () =>
      set({ routeSplashActive: false, routeSplashStartedAt: 0 }),
  };
});
