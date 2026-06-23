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

export function Mobius({ config = DEFAULT_MOBIUS_CONFIG }: { config?: MobiusConfig }) {
  const mouseRef = useRef({ x: 0, y: 0 });
  const [color, setColor] = useState(MOBIUS_BASE_COLOR);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    // Theme color — re-read whenever the <html> theme attributes change.
    const applyColor = () => setColor(readCssVar('--mobius-color') || MOBIUS_BASE_COLOR);
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

    return () => {
      observer.disconnect();
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
      camera={{ position: [0, 0, 3.5], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 1.8]}
      style={{ width: '100%', height: '100%', background: 'transparent', pointerEvents: 'none' }}
    >
      <MobiusScene mouseRef={mouseRef} color={effectiveColor} reducedMotion={reducedMotion} config={config} />
    </Canvas>
  );
}
