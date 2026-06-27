import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

/**
 * useAdaptiveTransmission — keep the glass smooth on weak-but-real GPUs.
 *
 * The up-front probe (capability.ts) catches devices with no real GPU, but a real
 * GPU that's merely slow still gets the glass. This watches the achieved frame rate
 * and, if the device can't hold the target, steps the transmission render-target
 * resolution down — the dominant GPU lever, and the least visible on a frosted /
 * refractive object. Downgrade-only (never oscillates), look-preserving, no remount.
 *
 * Why `delta` is a valid signal: the demand loop (useDemandRenderLoop) paces renders
 * with rAF; when the GPU falls behind, rAF callbacks are delayed, so the per-frame
 * delta grows past the target interval. A sustained low achieved-fps → step down.
 */
const STEPS = [1, 0.66, 0.45]; // multipliers on the tier's base transmission resolution
const WARMUP_FRAMES = 30; // skip the first ~0.8s (shader compile / first-render hitch)
const WINDOW_FRAMES = 90; // re-evaluate roughly every ~2.5s of sustained rendering

function setScale(gl: unknown, value: number) {
  const r = gl as { transmissionResolutionScale?: number };
  if ('transmissionResolutionScale' in r) r.transmissionResolutionScale = value;
}

export function useAdaptiveTransmission(enabled: boolean, baseResolution: number, targetFps: number) {
  const gl = useThree((s) => s.gl);
  const step = useRef(0);
  const emaMs = useRef(0);
  const warmup = useRef(0);
  const sinceEval = useRef(0);

  // Start (and reset on enable / base change) at the tier's full base resolution.
  useEffect(() => {
    step.current = 0;
    warmup.current = 0;
    emaMs.current = 0;
    sinceEval.current = 0;
    if (enabled) setScale(gl, baseResolution);
  }, [gl, enabled, baseResolution]);

  useFrame((_, delta) => {
    if (!enabled) return;
    if (warmup.current < WARMUP_FRAMES) {
      warmup.current++;
      return;
    }
    const ms = Math.min(delta, 0.1) * 1000;
    emaMs.current = emaMs.current === 0 ? ms : emaMs.current * 0.9 + ms * 0.1;

    sinceEval.current++;
    if (sinceEval.current < WINDOW_FRAMES) return;
    sinceEval.current = 0;

    const achievedFps = 1000 / emaMs.current;
    if (achievedFps < targetFps * 0.7 && step.current < STEPS.length - 1) {
      step.current++;
      setScale(gl, baseResolution * STEPS[step.current]);
    }
  });
}
