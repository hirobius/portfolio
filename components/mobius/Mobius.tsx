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

export function Mobius({ config = DEFAULT_MOBIUS_CONFIG }: { config?: MobiusConfig }) {
  const mouseRef = useRef({ x: 0, y: 0 });
  const [color, setColor] = useState(MOBIUS_BASE_COLOR);
  const [isLight, setIsLight] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  // Pause rendering when the hero (and the möbius with it) is scrolled offscreen.
  const [active, setActive] = useState(true);
  // Material variant — opt into the transmission-free prototype with ?lite, so the
  // two can be compared on a real GPU (the default stays the shipped glass).
  const [variant, setVariant] = useState<'glass' | 'lite'>('glass');

  useEffect(() => {
    // Material variant from the URL (?lite switches to the prototype).
    if (new URLSearchParams(window.location.search).has('lite')) setVariant('lite');

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
  }, []);

  // The tuner can override the theme color with a custom HSL value.
  const effectiveColor = config.useCustomColor
    ? `hsl(${config.hue}, ${Math.round(config.saturation * 100)}%, ${Math.round(config.lightness * 100)}%)`
    : color;

  return (
    <Canvas
      aria-hidden
      // Demand mode: MobiusScene drives renders itself at a capped frame rate
      // (and stops entirely when the hero is offscreen via `active`).
      frameloop="demand"
      camera={{ position: [0, 0, 3.5], fov: 45 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      dpr={[1, 1.5]}
      onCreated={({ gl }) => {
        // Render the glass transmission pass at reduced resolution — big perf
        // win, negligible quality loss on a frosted/refractive object.
        const r = gl as unknown as { transmissionResolutionScale?: number };
        if ('transmissionResolutionScale' in r) r.transmissionResolutionScale = 0.4;
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
        variant={variant}
      />
    </Canvas>
  );
}
