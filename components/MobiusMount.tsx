'use client';

import dynamic from 'next/dynamic';
import { MobiusErrorBoundary } from './mobius/MobiusErrorBoundary';

// The möbius is a WebGL canvas — it can't server-render, so load it client-only.
const Mobius = dynamic(() => import('./mobius/Mobius').then((m) => m.Mobius), {
  ssr: false,
});

export function MobiusMount() {
  return (
    <div className="mobius-layer" aria-hidden="true">
      <MobiusErrorBoundary>
        <Mobius />
      </MobiusErrorBoundary>
    </div>
  );
}
