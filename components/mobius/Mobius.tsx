'use client';

/**
 * Mobius — lean R3F Canvas wrapper.
 *
 * Owns the small amount of DOM glue the scene needs:
 *   - the möbius color from the --mobius-color CSS var (re-read on theme flip)
 *   - prefers-reduced-motion
 *   - normalized [-1, 1] cursor position (kept in a ref to avoid re-renders)
 *
 * All rendering lives in MobiusScene.
 */

import { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { MobiusScene } from './MobiusScene';
import { MOBIUS_BASE_COLOR } from './tokens';
import { DEFAULT_MOBIUS_CONFIG, type MobiusConfig } from './mobiusConfig';
import { detectMobiusTier, qualityForTier, type MobiusTier } from './capability';

// Resolve the render tier once, synchronously, on the client's first render —
// before the heavy canvas mounts. ?glass / ?glasslow / ?lite force a tier (for
// testing each path on a given device); otherwise probe the GPU. See detectMobiusTier.
function resolveTier(): MobiusTier {
  if (typeof window === 'undefined') return 'glass-high';
  const params = new URLSearchParams(window.location.search);
  if (params.has('glass')) return 'glass-high';
  if (params.has('glasslow')) return 'glass-low';
  if (params.has('lite')) return 'lite';
  return detectMobiusTier();
}

function readCssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function bgIsLight(hex: string): boolean {
  const m = hex.replace('#', '');
  if (m.length < 6) return false;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5;
}

export function Mobius({
  config = DEFAULT_MOBIUS_CONFIG,
  variantOverride,
}: {
  config?: MobiusConfig;
  // Tuner-only: force the previewed material regardless of the device tier, so the
  // Lite tab actually shows lite (and the glass tabs show glass) on any device.
  variantOverride?: 'glass' | 'lite';
}) {
  const mouseRef = useRef({ x: 0, y: 0 });
  const [color, setColor] = useState(MOBIUS_BASE_COLOR);
  const [isLight, setIsLight] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  // Pause rendering when the hero (and the möbius with it) is scrolled offscreen.
  const [active, setActive] = useState(true);
  // Render tier, resolved once on first client render (glass | lite | none).
  const [tier] = useState<MobiusTier>(resolveTier);

  useEffect(() => {
    if (tier === 'none') return;

    // Theme color — re-read whenever the <html> theme attributes change.
    const applyColor = () => {
      setColor(readCssVar('--mobius-color') || MOBIUS_BASE_COLOR);
      setIsLight(bgIsLight(readCssVar('--mobius-bg')));
    };
    applyColor();
    const observer = new MutationObserver(applyColor);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class', 'style'],
    });

    // Reduced motion.
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMq = () => setReducedMotion(mq.matches);
    onMq();
    mq.addEventListener('change', onMq);

    // Cursor tracking.
    const onMove = (event: PointerEvent) => {
      mouseRef.current.x = (event.clientX / (window.innerWidth || 1)) * 2 - 1;
      mouseRef.current.y = -(event.clientY / (window.innerHeight || 1)) * 2 + 1;
    };
    const onLeave = () => {
      mouseRef.current.x = 0;
      mouseRef.current.y = 0;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('blur', onLeave);

    // Pause the render loop when the hero band leaves the viewport.
    const anchor = document.querySelector('[data-mobius-anchor="hero"]');
    let io: IntersectionObserver | undefined;
    if (anchor && 'IntersectionObserver' in window) {
      io = new IntersectionObserver((entries) => setActive(entries[0]?.isIntersecting ?? true), {
        rootMargin: '160px',
      });
      io.observe(anchor);
    }

    return () => {
      observer.disconnect();
      io?.disconnect();
      mq.removeEventListener('change', onMq);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('blur', onLeave);
    };
  }, [tier]);

  // The tuner can override the theme color with a custom HSL value.
  const effectiveColor = config.useCustomColor
    ? `hsl(${config.hue}, ${Math.round(config.saturation * 100)}%, ${Math.round(config.lightness * 100)}%)`
    : color;

  // No functional WebGL — skip the canvas entirely (the möbius is decorative).
  if (tier === 'none') return null;

  // The tuner can override which material previews; otherwise use the device tier.
  // (Glass override previews at full fidelity so the look is true while tuning.)
  const effectiveTier: Exclude<MobiusTier, 'none'> =
    variantOverride === 'lite' ? 'lite' : variantOverride === 'glass' ? 'glass-high' : tier;

  // Fidelity knobs for this tier (same glass look, scaled internals).
  const quality = qualityForTier(effectiveTier);

  return (
    <Canvas
      aria-hidden
      // Demand mode: MobiusScene drives renders itself at a capped frame rate
      // (and stops entirely when the hero is offscreen via `active`).
      frameloop="demand"
      camera={{ position: [0, 0, 3.5], fov: 45 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      dpr={[1, quality.dprMax]}
      onCreated={({ gl }) => {
        // Render the glass transmission pass at reduced resolution — big perf
        // win, negligible quality loss on a frosted/refractive object. Lower
        // tiers drop it further (see qualityForTier).
        const r = gl as unknown as { transmissionResolutionScale?: number };
        if ('transmissionResolutionScale' in r) r.transmissionResolutionScale = quality.transmissionResolution;
        // Start invisible — the scene fades the canvas in after warm-up frames.
        gl.domElement.style.opacity = '0';
      }}
      style={{ width: '100%', height: '100%', background: 'transparent', pointerEvents: 'none' }}
    >
      <MobiusScene
        mouseRef={mouseRef}
        color={effectiveColor}
        reducedMotion={reducedMotion}
        isLight={isLight}
        active={active}
        config={config}
        variant={quality.variant}
        fps={quality.fps}
      />
    </Canvas>
  );
}
