'use client';

/**
 * MobiusTuner — temporary dev-only control panel for dialing in the möbius.
 * Rendered only when the URL has `?tune`. Remove this component (and its mount
 * in MobiusMount) for production once the values are locked in.
 *
 * Touch-sized controls; collapsible via the Hide button. Self-contained styles
 * (injected <style>) so it lifts out cleanly.
 */

import { useState } from 'react';
import { DEFAULT_MOBIUS_CONFIG, type MobiusConfig } from './mobiusConfig';

type NumKey = {
  [K in keyof MobiusConfig]: MobiusConfig[K] extends number ? K : never;
}[keyof MobiusConfig];

type Slider = [key: NumKey, label: string, min: number, max: number, step: number];

const SECTIONS: { title: string; rows: Slider[] }[] = [
  {
    title: 'Geometry',
    rows: [
      ['scale', 'Scale (overall size)', 0.3, 1.2, 0.01],
      ['pathRadius', 'Ring radius', 0.4, 1.0, 0.01],
      ['triAmount', 'Triangularity', 0, 0.3, 0.005],
      ['tubeRadius', 'Tube thickness', 0.1, 0.36, 0.005],
      ['fluteCount', 'Flute count', 0, 12, 1],
      ['fluteDepth', 'Flute depth', 0, 0.5, 0.01],
      ['twistTurns', 'Twist turns', 0, 6, 0.5],
      ['radialSegments', 'Radial segments', 3, 48, 1],
      ['tubularSegments', 'Tubular segments', 12, 1200, 4],
    ],
  },
  {
    title: 'Motion',
    rows: [
      ['rollSpeed', 'Roll speed', 0, 1.5, 0.05],
      ['autoRotateX', 'Auto-rotate X', -1, 1, 0.02],
      ['autoRotateY', 'Auto-rotate Y', -1, 1, 0.02],
      ['autoRotateZ', 'Auto-rotate Z', -1, 1, 0.02],
      ['baseTiltX', 'Tilt (forward lean)', -0.9, 0.4, 0.02],
      ['baseTiltY', 'Tilt (horizontal)', -0.9, 0.9, 0.02],
    ],
  },
  {
    title: 'Acrylic glass',
    rows: [
      ['glassOpacity', 'Glass opacity (see core)', 0.1, 1, 0.02],
      ['transmission', 'Transmission (refract)', 0, 1, 0.02],
      ['roughness', 'Roughness (frost)', 0, 1, 0.02],
      ['thickness', 'Thickness (dark)', 0, 2, 0.05],
      ['thicknessLight', 'Thickness (light)', 0, 2, 0.05],
      ['ior', 'IOR (refraction)', 1, 2.33, 0.01],
      ['tint', 'Color tint (0=clear)', 0, 1, 0.02],
      ['envIntensity', 'Reflections', 0, 2, 0.05],
      ['emissiveIntensity', 'Inner glow', 0, 0.3, 0.01],
    ],
  },
  {
    title: 'Color core',
    rows: [
      ['coreStrength', 'Core strength', 0, 1, 0.02],
      ['hueB', 'Core — hue', 0, 360, 1],
      ['satB', 'Core — saturation', 0, 1, 0.01],
      ['lightB', 'Core — lightness', 0, 1, 0.01],
      ['gradientScale', 'Core size (facing→edge)', 0.3, 6, 0.1],
    ],
  },
  {
    title: 'Color',
    rows: [
      ['hue', 'Hue', 0, 360, 1],
      ['saturation', 'Saturation', 0, 1, 0.01],
      ['lightness', 'Lightness', 0, 1, 0.01],
    ],
  },
  {
    title: 'Inner shape',
    rows: [
      ['innerTubeRadius', 'Inner tube thickness', 0.03, 0.3, 0.005],
      ['innerScale', 'Inner size', 0.2, 1.3, 0.02],
      ['innerFresnelPower', 'Fresnel power', 0.2, 6, 0.1],
      ['innerGlow', 'Inner glow', 0, 2, 0.05],
      ['innerCenterHue', 'Center — hue', 0, 360, 1],
      ['innerCenterSat', 'Center — saturation', 0, 1, 0.01],
      ['innerCenterLight', 'Center — lightness', 0, 1, 0.01],
    ],
  },
];

const decimals = (step: number) => (step >= 1 ? 0 : step >= 0.01 ? 2 : 3);

export function MobiusTuner({
  config,
  onChange,
}: {
  config: MobiusConfig;
  onChange: (next: MobiusConfig) => void;
}) {
  // Hidden by default — ?tune shows just the ⚙ FAB; click it to open the panel.
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const set = (key: keyof MobiusConfig, value: number | boolean) =>
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

  if (!open) {
    return (
      <>
        <style>{CSS}</style>
        <button className="mbx-fab" onClick={() => setOpen(true)}>
          ⚙ Tune
        </button>
      </>
    );
  }

  const swatch = config.useCustomColor
    ? `hsl(${config.hue}, ${Math.round(config.saturation * 100)}%, ${Math.round(config.lightness * 100)}%)`
    : 'transparent';

  return (
    <>
      <style>{CSS}</style>
      <div className="mbx-panel">
        <div className="mbx-head">
          <span className="mbx-title">möbius tuner</span>
          <button className="mbx-hide" onClick={() => setOpen(false)}>
            Hide
          </button>
        </div>
        <div className="mbx-body">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <div className="mbx-sec">{section.title}</div>

              {section.title === 'Acrylic glass' && (
                <div className="mbx-toggle">
                  <button
                    className={'mbx-tbtn' + (!config.flatShading ? ' on' : '')}
                    onClick={() => set('flatShading', false)}
                  >
                    Smooth
                  </button>
                  <button
                    className={'mbx-tbtn' + (config.flatShading ? ' on' : '')}
                    onClick={() => set('flatShading', true)}
                  >
                    Faceted
                  </button>
                </div>
              )}

              {section.title === 'Color core' && (
                <div className="mbx-toggle">
                  <button
                    className={'mbx-tbtn' + (!config.useGradient ? ' on' : '')}
                    onClick={() => set('useGradient', false)}
                  >
                    Off
                  </button>
                  <button
                    className={'mbx-tbtn' + (config.useGradient ? ' on' : '')}
                    onClick={() => set('useGradient', true)}
                  >
                    Core on
                  </button>
                </div>
              )}

              {section.title === 'Inner shape' && (
                <div className="mbx-toggle">
                  <button
                    className={'mbx-tbtn' + (!config.innerEnabled ? ' on' : '')}
                    onClick={() => set('innerEnabled', false)}
                  >
                    Off
                  </button>
                  <button
                    className={'mbx-tbtn' + (config.innerEnabled ? ' on' : '')}
                    onClick={() => set('innerEnabled', true)}
                  >
                    Inner on
                  </button>
                </div>
              )}

              {section.title === 'Color' && (
                <div className="mbx-toggle" style={{ alignItems: 'center' }}>
                  <button
                    className={'mbx-tbtn' + (!config.useCustomColor ? ' on' : '')}
                    onClick={() => set('useCustomColor', false)}
                  >
                    Theme color
                  </button>
                  <button
                    className={'mbx-tbtn' + (config.useCustomColor ? ' on' : '')}
                    onClick={() => set('useCustomColor', true)}
                  >
                    Custom
                  </button>
                  <span className="mbx-swatch" style={{ background: swatch }} />
                </div>
              )}

              {section.rows.map(([key, label, min, max, step]) => {
                const dec = decimals(step);
                const value = config[key] as number;
                return (
                  <label key={key} className="mbx-row">
                    <span className="mbx-label">
                      {label}
                      <b className="mbx-val">{value.toFixed(dec)}</b>
                    </span>
                    <input
                      className="mbx-range"
                      type="range"
                      min={min}
                      max={max}
                      step={step}
                      value={value}
                      onChange={(e) => set(key, parseFloat(e.target.value))}
                    />
                  </label>
                );
              })}
            </div>
          ))}

          <div className="mbx-btns">
            <button className="mbx-action mbx-copy" onClick={copy}>
              {copied ? 'copied ✓' : 'copy config'}
            </button>
            <button className="mbx-action mbx-reset" onClick={() => onChange(DEFAULT_MOBIUS_CONFIG)}>
              reset
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

const CSS = `
.mbx-panel, .mbx-fab { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; box-sizing: border-box; }
.mbx-panel * { box-sizing: border-box; }
.mbx-panel {
  position: fixed; z-index: 10000; right: 16px; top: 16px; width: 330px;
  max-height: calc(100dvh - 32px); overflow-y: auto; -webkit-overflow-scrolling: touch;
  background: rgba(14,14,18,0.95); backdrop-filter: blur(14px);
  border: 1px solid rgba(255,255,255,0.1); border-radius: 14px;
  color: #e9e9ee; box-shadow: 0 12px 48px rgba(0,0,0,0.55); pointer-events: auto;
}
.mbx-head {
  position: sticky; top: 0; z-index: 1; display: flex; justify-content: space-between;
  align-items: center; padding: 14px 16px; background: rgba(14,14,18,0.98);
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.mbx-title { font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #9db4ff; font-weight: 600; }
.mbx-hide {
  font: inherit; font-size: 13px; color: #cfd6ff; background: rgba(80,100,245,0.16);
  border: 1px solid rgba(120,140,255,0.4); border-radius: 8px; padding: 0 16px;
  min-height: 36px; cursor: pointer;
}
.mbx-body { padding: 6px 16px 22px; }
.mbx-sec {
  font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase;
  color: rgba(157,180,255,0.62); margin: 18px 0 10px;
}
.mbx-row { display: block; margin-bottom: 16px; }
.mbx-label { display: flex; justify-content: space-between; font-size: 13.5px; color: #c8c8d2; margin-bottom: 9px; }
.mbx-val { color: #9db4ff; font-weight: 600; }
.mbx-range {
  width: 100%; -webkit-appearance: none; appearance: none; height: 8px;
  border-radius: 5px; background: rgba(255,255,255,0.14); outline: none; cursor: pointer; margin: 6px 0;
}
.mbx-range::-webkit-slider-thumb {
  -webkit-appearance: none; width: 26px; height: 26px; border-radius: 50%;
  background: #5064f5; border: 2px solid #fff; box-shadow: 0 1px 6px rgba(0,0,0,0.5); cursor: pointer;
}
.mbx-range::-moz-range-thumb {
  width: 26px; height: 26px; border-radius: 50%; background: #5064f5; border: 2px solid #fff;
}
.mbx-toggle { display: flex; gap: 10px; margin-bottom: 14px; }
.mbx-tbtn {
  flex: 1; min-height: 42px; border-radius: 10px; font: inherit; font-size: 13px; cursor: pointer;
  border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.05); color: #aab0c4;
}
.mbx-tbtn.on { background: rgba(80,100,245,0.3); border-color: rgba(120,140,255,0.75); color: #fff; }
.mbx-swatch { width: 42px; height: 42px; flex-shrink: 0; border-radius: 10px; border: 1px solid rgba(255,255,255,0.2); }
.mbx-btns { display: flex; gap: 12px; margin-top: 22px; }
.mbx-action {
  flex: 1; min-height: 46px; border-radius: 11px; font: inherit; font-size: 13px;
  letter-spacing: 0.06em; text-transform: uppercase; cursor: pointer; border: 1px solid;
}
.mbx-copy { background: rgba(80,140,255,0.14); border-color: rgba(80,140,255,0.4); color: #bcd2ff; }
.mbx-copy:active { background: rgba(80,140,255,0.3); }
.mbx-reset { background: rgba(255,90,90,0.1); border-color: rgba(255,90,90,0.3); color: #ff9d9d; }
.mbx-fab {
  position: fixed; z-index: 10000; right: 16px; bottom: 16px; min-height: 50px; padding: 0 22px;
  border-radius: 26px; font-size: 14px; letter-spacing: 0.08em; color: #fff; cursor: pointer;
  background: rgba(80,100,245,0.92); border: 1px solid rgba(160,180,255,0.6);
  box-shadow: 0 8px 30px rgba(0,0,0,0.5); pointer-events: auto;
}
@media (max-width: 767px) {
  .mbx-panel {
    right: 0; left: 0; top: auto; bottom: 0; width: 100%; max-height: 64dvh;
    border-radius: 16px 16px 0 0; border-bottom: none;
  }
  .mbx-body { padding-bottom: 30px; }
}
`;
