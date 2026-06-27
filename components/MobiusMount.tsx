'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { MobiusErrorBoundary } from './mobius/MobiusErrorBoundary';
import { DEFAULT_MOBIUS_CONFIG, type MobiusConfig } from './mobius/mobiusConfig';
import { resolveMobiusMode } from './mobius/capability';

// The möbius is a WebGL canvas — it can't server-render, so load it client-only.
const Mobius = dynamic(() => import('./mobius/Mobius').then((m) => m.Mobius), {
  ssr: false,
});

// Dev-only tuner — see MobiusTuner. Loaded only when ?tune is in the URL.
const MobiusTuner = dynamic(() => import('./mobius/MobiusTuner').then((m) => m.MobiusTuner), {
  ssr: false,
});

export function MobiusMount() {
  const [config, setConfig] = useState<MobiusConfig>(DEFAULT_MOBIUS_CONFIG);
  const [showTuner, setShowTuner] = useState(false);
  // Tuner-driven preview material (null = follow the device tier).
  const [previewVariant, setPreviewVariant] = useState<'glass' | 'lite' | null>(null);
  // Canvas-vs-static, resolved after mount (the WebGL probe is client-only). Starts
  // 'pending' so SSR and the first client render agree (no canvas, no hydration
  // mismatch); the canvas only ever mounts once this lands on 'canvas', so it never
  // mounts on low-power devices (they get the static image via MobiusFallback).
  const [mode, setMode] = useState<'pending' | 'canvas' | 'static'>('pending');

  useEffect(() => {
    setShowTuner(new URLSearchParams(window.location.search).has('tune'));
    setMode(resolveMobiusMode());
  }, []);

  return (
    <>
      <div className="mobius-layer" aria-hidden="true">
        {mode === 'canvas' && (
          <MobiusErrorBoundary>
            <Mobius config={config} variantOverride={previewVariant ?? undefined} />
          </MobiusErrorBoundary>
        )}
      </div>
      {showTuner && (
        <MobiusTuner config={config} onChange={setConfig} onPreviewVariant={setPreviewVariant} />
      )}
    </>
  );
}
