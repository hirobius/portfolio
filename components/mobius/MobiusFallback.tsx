'use client';

import { useEffect, useState } from 'react';
import { resolveMobiusMode } from './capability';

/**
 * MobiusFallback — the static möbius image for low-power devices.
 *
 * Rendered inside the hero's möbius anchor band. On devices with no real GPU
 * (software rasterizers / no WebGL) the live canvas never mounts (see MobiusMount);
 * this shows a pre-rendered möbius instead — zero three.js, no render loop, no
 * battery cost. On capable devices (and in the tuner) it renders nothing.
 *
 * Decided after mount (not via lazy init) so the server/first-paint markup matches
 * — the band is reserved either way, so there's no layout shift when it appears.
 */
export function MobiusFallback() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(resolveMobiusMode() === 'static');
  }, []);

  if (!show) return null;
  // eslint-disable-next-line @next/next/no-img-element -- decorative, fixed asset
  return <img className="hero__mobius-img" src="/mobius-fallback.png" alt="" aria-hidden="true" />;
}
