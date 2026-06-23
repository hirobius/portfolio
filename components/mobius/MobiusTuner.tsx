'use client';

/**
 * MobiusTuner — temporary dev-only control panel for dialing in the möbius.
 * Rendered only when the URL has `?tune`. Remove this component (and its mount
 * in MobiusMount) for production once the values are locked in.
 */

import { useState } from 'react';
import type { MobiusConfig } from './mobiusConfig';

type Control = {
  key: keyof MobiusConfig;
  label: string;
  min: number;
  max: number;
  step: number;
};

const GEOMETRY: Control[] = [
  { key: 'pathRadius', label: 'Path radius (scale)', min: 0.4, max: 1.0, step: 0.01 },
  { key: 'triAmount', label: 'Triangularity', min: 0, max: 0.3, step: 0.005 },
  { key: 'tubeRadius', label: 'Tube thickness', min: 0.1, max: 0.36, step: 0.005 },
  { key: 'fluteCount', label: 'Flute count', min: 0, max: 12, step: 1 },
  { key: 'fluteDepth', label: 'Flute depth', min: 0, max: 0.5, step: 0.01 },
  { key: 'twistTurns', label: 'Twist turns', min: 0, max: 6, step: 0.5 },
  { key: 'radialSegments', label: 'Radial segments', min: 6, max: 96, step: 6 },
  { key: 'tubularSegments', label: 'Tubular segments', min: 120, max: 600, step: 30 },
];

const LOOK: Control[] = [
  { key: 'rollSpeed', label: 'Roll speed', min: 0, max: 1.5, step: 0.05 },
  { key: 'baseTiltX', label: 'Tilt (forward lean)', min: -0.9, max: 0.4, step: 0.02 },
  { key: 'roughness', label: 'Roughness', min: 0, max: 1, step: 0.02 },
  { key: 'metalness', label: 'Metalness', min: 0, max: 0.6, step: 0.02 },
  { key: 'emissiveIntensity', label: 'Emissive', min: 0, max: 0.3, step: 0.01 },
];

export function MobiusTuner({
  config,
  onChange,
}: {
  config: MobiusConfig;
  onChange: (next: MobiusConfig) => void;
}) {
  const [copied, setCopied] = useState(false);

  const set = (key: keyof MobiusConfig, value: number) =>
    onChange({ ...config, [key]: value });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const row = (c: Control) => (
    <label key={c.key} style={styles.row}>
      <span style={styles.label}>
        {c.label}
        <b style={styles.value}>{Number(config[c.key]).toFixed(c.step < 1 ? 3 : 0)}</b>
      </span>
      <input
        type="range"
        min={c.min}
        max={c.max}
        step={c.step}
        value={config[c.key]}
        onChange={(e) => set(c.key, parseFloat(e.target.value))}
        style={styles.range}
      />
    </label>
  );

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span>möbius tuner</span>
        <button onClick={copy} style={styles.copy}>
          {copied ? 'copied ✓' : 'copy config'}
        </button>
      </div>
      <div style={styles.section}>Geometry</div>
      {GEOMETRY.map(row)}
      <div style={styles.section}>Motion &amp; material</div>
      {LOOK.map(row)}
      <button onClick={() => onChange({ ...config })} style={{ display: 'none' }} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'fixed',
    top: 16,
    left: 16,
    zIndex: 9999,
    width: 264,
    maxHeight: 'calc(100vh - 32px)',
    overflowY: 'auto',
    padding: '12px 14px',
    borderRadius: 10,
    background: 'rgba(18,18,20,0.92)',
    backdropFilter: 'blur(8px)',
    color: '#e8e8ea',
    font: '11px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace',
    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
    pointerEvents: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    fontWeight: 600,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  copy: {
    font: 'inherit',
    color: '#9db4ff',
    background: 'rgba(80,100,245,0.15)',
    border: '1px solid rgba(120,140,255,0.35)',
    borderRadius: 6,
    padding: '3px 8px',
    cursor: 'pointer',
  },
  section: {
    margin: '10px 0 4px',
    opacity: 0.55,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontSize: 9.5,
  },
  row: { display: 'block', marginBottom: 7 },
  label: { display: 'flex', justifyContent: 'space-between', marginBottom: 2 },
  value: { color: '#9db4ff', fontWeight: 600 },
  range: { width: '100%', accentColor: '#5064f5', cursor: 'pointer' },
};
