/**
 * Möbius capability tiering.
 *
 * The glass möbius leans on a MeshPhysicalMaterial transmission pass — it looks
 * rich on a real GPU but re-renders the scene every frame, the dominant cost. The
 * goal is to keep that *same* glass look on every device with a real GPU, and only
 * scale its internal *fidelity* (transmission resolution, pixel ratio, frame cap)
 * to the hardware — the eye barely registers those on a frosted/refractive object.
 *
 * We probe WebGL once, up front, via a throwaway context and pick a tier BEFORE the
 * real canvas mounts, so a weak device never pays full cost:
 *
 *   glass-high — capable GPU: full-fidelity glass.
 *   glass-low  — real but constrained GPU (low memory / data-saver): glass at
 *                reduced transmission resolution, pixel ratio, and frame cap. Same look.
 *   lite       — software rasterizer / no real GPU: the cheap fresnel fallback
 *                (no transmission, no inner mesh, no env IBL).
 *   none       — no WebGL at all: skip the canvas. The möbius is decorative
 *                (aria-hidden), so the hero reads fine without it.
 *
 * Note: being on mobile is NOT a downgrade signal — modern phones run full glass
 * fine. Only genuine weakness signals (software renderer, ≤2 GB memory, data-saver)
 * drop a real device below glass-high.
 */
export type MobiusTier = 'glass-high' | 'glass-low' | 'lite' | 'none';

export type MobiusQuality = {
  variant: 'glass' | 'lite';
  transmissionResolution: number; // gl.transmissionResolutionScale (glass only)
  dprMax: number; // upper bound of the Canvas devicePixelRatio
  fps: number; // demand-loop target frame rate
};

type NavWithHints = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

export function detectMobiusTier(): MobiusTier {
  if (typeof document === 'undefined') return 'glass-high';

  let gl: WebGLRenderingContext | null = null;
  try {
    const canvas = document.createElement('canvas');
    gl =
      (canvas.getContext('webgl2') as WebGLRenderingContext | null) ||
      (canvas.getContext('webgl') as WebGLRenderingContext | null) ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
  } catch {
    return 'none';
  }
  if (!gl) return 'none';

  // Software rasterizers (SwiftShader, llvmpipe, Mesa software, Microsoft Basic
  // Render) render transmission far too slowly — drop to the cheap fallback.
  try {
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)).toLowerCase() : '';
    if (
      renderer.includes('swiftshader') ||
      renderer.includes('llvmpipe') ||
      renderer.includes('software') ||
      renderer.includes('basic render') ||
      renderer.includes('microsoft basic')
    ) {
      return 'lite';
    }
  } catch {
    // Renderer string unavailable (some privacy modes) — assume a real GPU.
  }

  // Real GPU. Reduce fidelity (not the look) only on genuine constraint signals.
  const nav = navigator as NavWithHints;
  if (nav.connection?.saveData) return 'glass-low';
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory > 0 && nav.deviceMemory <= 2) {
    return 'glass-low';
  }

  return 'glass-high';
}

/**
 * Whether to mount the live WebGL canvas or show the static fallback image.
 *
 * Low-power devices (software rasterizers / no WebGL) get a static image — zero
 * three.js, no render loop, no battery cost. Real GPUs get the live möbius. The
 * tuner and explicit tier overrides (?tune / ?lite / ?glass / ?glasslow) always
 * force the live canvas so each path stays testable on any device.
 */
export function resolveMobiusMode(): 'canvas' | 'static' {
  if (typeof window === 'undefined') return 'canvas';
  const p = new URLSearchParams(window.location.search);
  if (p.has('tune') || p.has('lite') || p.has('glass') || p.has('glasslow')) return 'canvas';
  const tier = detectMobiusTier();
  return tier === 'glass-high' || tier === 'glass-low' ? 'canvas' : 'static';
}

export function qualityForTier(tier: Exclude<MobiusTier, 'none'>): MobiusQuality {
  switch (tier) {
    case 'glass-high':
      return { variant: 'glass', transmissionResolution: 0.4, dprMax: 1.5, fps: 38 };
    case 'glass-low':
      // Same glass, dialed down: half-ish transmission target, no HiDPI, lower cap.
      return { variant: 'glass', transmissionResolution: 0.25, dprMax: 1, fps: 30 };
    case 'lite':
      // Cheap fresnel — no transmission pass, so it can afford crisp pixels.
      return { variant: 'lite', transmissionResolution: 1, dprMax: 1.5, fps: 38 };
  }
}
