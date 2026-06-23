'use client';

/**
 * Mobius — production R3F Canvas wrapper.
 *
 * Mount-time responsibilities:
 *   1. Auto-detect performance tier from navigator.hardwareConcurrency
 *   2. Read the möbius color from the --mobius-color CSS var (re-read on theme flip)
 *   3. Subscribe to prefers-reduced-motion
 *   4. Track mouse position for the scene's magnetic / parallax influence
 *
 * MobiusScene owns the frame loop and all rendering.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { MobiusScene } from './MobiusScene';
import { useMobiusStore } from './mobiusStore';
import { MOBIUS_BASE_COLOR } from './tokens';
import type { PerformanceTier } from './mobiusStore';

// ── CSS var helpers ───────────────────────────────────────────────────────────

function readCssVar(varName: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

function detectPerformanceTier(): PerformanceTier {
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = typeof navigator !== 'undefined' && 'deviceMemory' in navigator
    ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory
    : undefined;
  if (cores <= 4 || (memory !== undefined && memory <= 4)) return 'low';
  if (cores <= 8 || (memory !== undefined && memory <= 8)) return 'medium';
  return 'high';
}

function downgradePerformanceTier(tier: PerformanceTier): PerformanceTier {
  if (tier === 'high') return 'medium';
  if (tier === 'medium') return 'low';
  return 'low';
}

// ── Component ─────────────────────────────────────────────────────────────────

type MobiusProps = {
  style?: React.CSSProperties;
  className?: string;
  allowGrab?: boolean;
  navScaleMultiplier?: number;
};

type DragState = {
  active: boolean;
  targetX: number;
  targetY: number;
};

type InteractionBounds = {
  x: number;
  y: number;
  size: number;
  visible: boolean;
};

export function Mobius({
  style,
  className,
  allowGrab = false,
  navScaleMultiplier = 1,
}: MobiusProps) {
  const setUniforms = useMobiusStore((s) => s.setUniforms);
  const setPerformanceTier = useMobiusStore((s) => s.setPerformanceTier);
  const performanceTier = useMobiusStore((s) => s.performanceTier);
  const distortionMode = useMobiusStore((s) => s.distortionMode);
  const initialPerformanceTierRef = useRef<PerformanceTier>(
    typeof window !== 'undefined' ? detectPerformanceTier() : 'high',
  );
  const resolvedPerformanceTier = performanceTier === 'high'
    ? initialPerformanceTierRef.current
    : performanceTier;
  const dragHotspotRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState>({ active: false, targetX: 0, targetY: 0 });
  const interactionBoundsRef = useRef<InteractionBounds>({ x: 0, y: 0, size: 0, visible: false });
  const lastInteractionBoundsRef = useRef<InteractionBounds>({ x: Number.NaN, y: Number.NaN, size: Number.NaN, visible: false });
  const lastHotspotCursorRef = useRef<string>('');
  const dragStartRef = useRef({ x: 0, y: 0 });
  const dragReleaseVelocityRef = useRef({ x: 0, y: 0 });
  const releaseRafRef = useRef<number>(0);
  const releaseLastTimeRef = useRef(0);
  const lerpDurationRef = useRef(0.35);
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);
  const canvasDpr = resolvedPerformanceTier === 'high'
    ? [1, 2]
    : resolvedPerformanceTier === 'medium'
      ? isCoarsePointer ? [1, 1.45] : [1, 1.6]
      : isCoarsePointer
        ? [1, 1.2]
        : [1, 1.3];

  // ── Mount-time setup ─────────────────────────────────────────────────────

  useLayoutEffect(() => {
    setPerformanceTier(initialPerformanceTierRef.current);
  }, [setPerformanceTier]);

  useEffect(() => {
    // 1. Möbius color from the theme CSS var — re-read whenever the theme flips.
    const applyColor = () => {
      const color = readCssVar('--mobius-color') || MOBIUS_BASE_COLOR;
      setUniforms({ color });
    };
    applyColor();

    const observer = new MutationObserver(applyColor);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class', 'style'],
    });

    // 2. Reduced motion — initialize + live listener
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMqChange = (e: MediaQueryListEvent) => {
      useMobiusStore.setState({ reducedMotion: e.matches });
    };
    useMobiusStore.setState({ reducedMotion: mq.matches });
    mq.addEventListener('change', handleMqChange);

    return () => {
      observer.disconnect();
      mq.removeEventListener('change', handleMqChange);
    };
  }, [setUniforms]);

  useEffect(() => {
    let rafId = 0;
    let lastTime = 0;
    let warmupFrames = 0;
    let samples: number[] = [];

    const tick = (now: number) => {
      if (document.hidden) {
        lastTime = now;
        rafId = window.requestAnimationFrame(tick);
        return;
      }

      if (lastTime === 0) {
        lastTime = now;
        rafId = window.requestAnimationFrame(tick);
        return;
      }

      const delta = now - lastTime;
      lastTime = now;

      if (delta > 120) {
        rafId = window.requestAnimationFrame(tick);
        return;
      }

      if (warmupFrames < 20) {
        warmupFrames += 1;
        rafId = window.requestAnimationFrame(tick);
        return;
      }

      samples.push(delta);
      if (samples.length < 45) {
        rafId = window.requestAnimationFrame(tick);
        return;
      }

      const sorted = [...samples].sort((a, b) => a - b);
      const averageFrameMs = samples.reduce((sum, value) => sum + value, 0) / samples.length;
      const p90FrameMs = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9))];
      const currentTier = useMobiusStore.getState().performanceTier;
      const needsHeavyDowngrade = averageFrameMs > 30 || p90FrameMs > 38;
      const needsLightDowngrade = averageFrameMs > 22 || p90FrameMs > 28;

      if (needsHeavyDowngrade && currentTier !== 'low') {
        setPerformanceTier('low');
      } else if (needsLightDowngrade && currentTier === 'high') {
        setPerformanceTier(downgradePerformanceTier(currentTier));
      }

      samples = [];
      warmupFrames = 0;
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [setPerformanceTier]);

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const updatePointerMode = (event: MediaQueryListEvent) => {
      setIsCoarsePointer(event.matches);
    };

    setIsCoarsePointer(mq.matches);
    mq.addEventListener('change', updatePointerMode);

    return () => mq.removeEventListener('change', updatePointerMode);
  }, []);

  // ── Mouse tracking ────────────────────────────────────────────────────────
  // Normalized [-1, 1] mouse position stored in a ref. MobiusScene reads it each
  // frame — kept out of state to avoid per-move re-renders.

  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    let rafId = 0;

    const syncHotspot = () => {
      const hotspot = dragHotspotRef.current;
      const { x, y, size, visible } = interactionBoundsRef.current;
      const last = lastInteractionBoundsRef.current;
      const nextCursor = dragStateRef.current.active
        ? 'grabbing'
        : distortionMode === 'magnetic'
          ? 'grab'
          : 'pointer';
      const didBoundsChange =
        Math.abs(x - last.x) > 0.25
        || Math.abs(y - last.y) > 0.25
        || Math.abs(size - last.size) > 0.25
        || visible !== last.visible;
      const didCursorChange = nextCursor !== lastHotspotCursorRef.current;

      if (hotspot && (didBoundsChange || didCursorChange)) {
        const enabled = visible && size > 0;
        const hotspotSize = isCoarsePointer ? Math.max(size, 220) : size;
        hotspot.style.width = `${hotspotSize}px`;
        hotspot.style.height = `${hotspotSize}px`;
        hotspot.style.transform = `translate(${x - hotspotSize / 2}px, ${y - hotspotSize / 2}px)`;
        hotspot.style.pointerEvents = enabled ? 'auto' : 'none';
        hotspot.style.touchAction = 'none';
        hotspot.style.userSelect = 'none';
        hotspot.style.setProperty('-webkit-user-select', 'none');
        hotspot.style.setProperty('-webkit-tap-highlight-color', 'transparent');
        hotspot.style.cursor = nextCursor;
      }

      if (didBoundsChange) {
        lastInteractionBoundsRef.current = { x, y, size, visible };
      }
      if (didCursorChange) {
        lastHotspotCursorRef.current = nextCursor;
      }

      rafId = window.requestAnimationFrame(syncHotspot);
    };

    syncHotspot();

    return () => window.cancelAnimationFrame(rafId);
  }, [distortionMode, isCoarsePointer]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const width = window.innerWidth || 1;
      const height = window.innerHeight || 1;
      mouseRef.current.x = (event.clientX / width) * 2 - 1;
      mouseRef.current.y = -(event.clientY / height) * 2 + 1;
    };

    const handleDragMove = (event: PointerEvent) => {
      if (!dragStateRef.current.active) return;
      const bounds = interactionBoundsRef.current;
      const size = Math.max(bounds.size, 1);
      const dx = (event.clientX - dragStartRef.current.x) / size;
      const dy = (event.clientY - dragStartRef.current.y) / size;
      // tanh gives progressive resistance — easy to stretch at first, harder near the limit.
      const DRAG_SENSITIVITY = isCoarsePointer ? 0.36 : 0.24;
      const DRAG_MAX = 4.0;
      dragStateRef.current.targetX =  Math.tanh(dx * DRAG_SENSITIVITY) * DRAG_MAX;
      dragStateRef.current.targetY = -Math.tanh(dy * DRAG_SENSITIVITY) * DRAG_MAX;
    };

    const animateRelease = () => {
      const now = performance.now();
      const dt = Math.min((now - releaseLastTimeRef.current) / 1000, 0.1);
      releaseLastTimeRef.current = now;

      if (!dragStateRef.current.active) {
        const { reducedMotion } = useMobiusStore.getState();
        const spring = reducedMotion ? 0.12 : 0.45;
        const damping = reducedMotion ? 0.70 : 0.55;

        const velocity = dragReleaseVelocityRef.current;

        velocity.x += (-dragStateRef.current.targetX * spring) * dt;
        velocity.y += (-dragStateRef.current.targetY * spring) * dt;

        velocity.x *= Math.pow(damping, dt);
        velocity.y *= Math.pow(damping, dt);

        dragStateRef.current.targetX += velocity.x * dt;
        dragStateRef.current.targetY += velocity.y * dt;

        if (Math.abs(dragStateRef.current.targetX) < 0.01 && Math.abs(velocity.x) < 0.01) {
          dragStateRef.current.targetX = 0;
          dragStateRef.current.targetY = 0;
          velocity.x = 0;
          velocity.y = 0;
          return;
        }
      }

      releaseRafRef.current = requestAnimationFrame(animateRelease);
    };

    const endDrag = () => {
      cancelAnimationFrame(releaseRafRef.current);
      dragStateRef.current.active = false;
      dragReleaseVelocityRef.current.x = 0;
      dragReleaseVelocityRef.current.y = 0;
      releaseLastTimeRef.current = performance.now();
      releaseRafRef.current = requestAnimationFrame(animateRelease);
    };

    const resetPointer = () => {
      mouseRef.current.x = 0;
      mouseRef.current.y = 0;
      endDrag();
    };

    const handlePointerUp = () => endDrag();
    const handlePointerCancel = () => endDrag();

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointermove', handleDragMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);
    window.addEventListener('blur', resetPointer);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointermove', handleDragMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
      window.removeEventListener('blur', resetPointer);
      cancelAnimationFrame(releaseRafRef.current);
    };
  }, [isCoarsePointer]);

  return (
    <div
      aria-hidden="true"
      style={{ width: '100%', height: '100%', pointerEvents: 'none', ...style }}
      className={className}
    >
      {allowGrab && (
        <div
          ref={dragHotspotRef}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            dragStateRef.current.active = true;
            dragStartRef.current.x = event.clientX;
            dragStartRef.current.y = event.clientY;
            (event.currentTarget as HTMLDivElement).setPointerCapture?.(event.pointerId);
          }}
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            borderRadius: '9999px',
            pointerEvents: 'none',
            background: 'transparent',
            zIndex: 4,
            touchAction: 'none',
            userSelect: 'none',
          }}
        />
      )}
      <Canvas
        camera={{ position: [0, 0, 3.5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        dpr={canvasDpr as [number, number]}
        style={{ background: 'transparent', pointerEvents: 'none' }}
      >
        <MobiusScene
          mouseRef={mouseRef}
          lerpDurationRef={lerpDurationRef}
          dragStateRef={dragStateRef}
          interactionBoundsRef={interactionBoundsRef}
          navScaleMultiplier={navScaleMultiplier}
          isCoarsePointer={isCoarsePointer}
          performanceTierOverride={resolvedPerformanceTier}
        />
      </Canvas>
    </div>
  );
}
