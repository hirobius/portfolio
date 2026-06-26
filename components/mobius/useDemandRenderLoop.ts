import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

/**
 * useDemandRenderLoop — drive a `frameloop="demand"` R3F scene at a capped rate.
 *
 * In demand mode nothing renders unless something calls `invalidate()`. This hook
 * owns that scheduling: while `active`, a single rAF loop invalidates at most
 * `fps` times per second; when `active` is false it renders nothing and cancels
 * the loop. The throttle is the whole point — the transmission pass is the
 * dominant GPU cost, so the subtle motion runs well below display refresh.
 *
 * The R3F coupling (`invalidate`) stays inside the hook, so callers express the
 * concern as just `(active, fps)`.
 */
export function useDemandRenderLoop(active: boolean, fps: number): void {
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = 0;
    const minInterval = 1000 / fps;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last >= minInterval) {
        last = now;
        invalidate();
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, fps, invalidate]);
}
