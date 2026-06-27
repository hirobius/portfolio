import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { MobiusConfig } from './mobiusConfig';

type Args = { config: MobiusConfig; color: string; reducedMotion: boolean };

const WHITE = new THREE.Color('#ffffff');

/**
 * useMobiusMaterialLite — the degraded fallback möbius.
 *
 * For devices with no real GPU (software rasterizers like SwiftShader/llvmpipe),
 * where the glass transmission pass is far too slow. Fakes the dimensional glass
 * with a cheap view-angle (fresnel) gradient, emitted unlit: the body takes a deep
 * theme blue, grazing edges deepen further (the Beer-Lambert "thicker glass at the
 * silhouette" read), and a tight sheen lifts the most-facing surfaces. Keeps the
 * roll vertex shader. No transmission pass, no inner mesh, no env IBL — a fraction
 * of the GPU cost. Trades real refraction/translucency for a solid, dimensional read.
 */
export function useMobiusMaterialLite({ config, color, reducedMotion }: Args) {
  const cfgRef = useRef(config);
  cfgRef.current = config;

  const phase = useRef({ value: 0 });
  const uCore = useRef({ value: new THREE.Color(color) }); // body (facing) — rich theme blue
  const uEdge = useRef({ value: new THREE.Color(color) }); // grazing edges — deepened
  const uSheen = useRef({ value: new THREE.Color('#ffffff') }); // facing highlight
  const uFres = useRef({ value: 2.0 });
  const uSheenPow = useRef({ value: 5.0 });

  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#000'),
      roughness: 1,
      metalness: 0,
      envMapIntensity: 0,
      side: THREE.DoubleSide,
    });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uPhase = phase.current;
      shader.uniforms.uCore = uCore.current;
      shader.uniforms.uEdge = uEdge.current;
      shader.uniforms.uSheen = uSheen.current;
      shader.uniforms.uFres = uFres.current;
      shader.uniforms.uSheenPow = uSheenPow.current;
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform float uPhase;
          attribute vec2 aCenter;
          attribute vec2 aAxis;
          vec3 mobiusRoll(vec3 v, vec3 ax, float ang) {
            float c = cos(ang); float s = sin(ang);
            return v * c + cross(ax, v) * s + ax * dot(ax, v) * (1.0 - c);
          }`,
        )
        .replace(
          '#include <beginnormal_vertex>',
          `vec3 mAxis = normalize(vec3(aAxis, 0.0));
          vec3 objectNormal = mobiusRoll(normal, mAxis, uPhase);
          #ifdef USE_TANGENT
            vec3 objectTangent = vec3( tangent.xyz );
          #endif`,
        )
        .replace(
          '#include <begin_vertex>',
          `vec3 mCenter = vec3(aCenter, 0.0);
          vec3 transformed = mCenter + mobiusRoll(position - mCenter, normalize(vec3(aAxis, 0.0)), uPhase);`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform vec3 uCore, uEdge, uSheen;
          uniform float uFres, uSheenPow;`,
        )
        .replace(
          '#include <normal_fragment_begin>',
          `#include <normal_fragment_begin>
          float facing = clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);
          // Body stays the rich theme blue; grazing edges deepen (light travels
          // through more "glass"), a tight sheen lifts the most-facing surfaces.
          float fres = pow(1.0 - facing, uFres);
          vec3 col = mix(uCore, uEdge, fres) + uSheen * pow(facing, uSheenPow);
          diffuseColor.rgb = col;
          totalEmissiveRadiance += col;`,
        );
    };
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => () => material.dispose(), [material]);

  const current = useRef(new THREE.Color(color));
  const target = useRef(new THREE.Color(color));
  useEffect(() => {
    target.current.set(color);
  }, [color]);

  useFrame((_, delta) => {
    const d = Math.min(delta, 0.033);
    current.current.lerp(target.current, 1 - Math.exp(-d / 0.2));
    // body = a deepened theme blue (echoing the cobalt the real glass reads as);
    // edges deepen further; sheen = a restrained cyan-white lift on facing surfaces.
    uCore.current.value.copy(current.current).multiplyScalar(0.92);
    uEdge.current.value.copy(current.current).multiplyScalar(0.34);
    uSheen.current.value.copy(current.current).lerp(WHITE, 0.85).multiplyScalar(0.24);
    const cfg = cfgRef.current;
    phase.current.value += (reducedMotion ? cfg.rollSpeed * 0.3 : cfg.rollSpeed) * d;
  });

  return { material };
}
