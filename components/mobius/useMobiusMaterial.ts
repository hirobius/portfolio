import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { MobiusConfig } from './mobiusConfig';

type Args = {
  config: MobiusConfig;
  color: string;
  isLight: boolean;
  reducedMotion: boolean;
};

/**
 * useMobiusMaterial — the möbius's two surfaces, fully owned.
 *
 * Builds the frosted-glass outer material (a `MeshPhysicalMaterial` with an
 * in-place "roll" vertex shader plus a gradient-core fragment shader, injected
 * via `onBeforeCompile`) and the inner core (a cheap fresnel `MeshStandard`),
 * keeps their config-driven params in sync each render, and animates them each
 * frame — the theme-color lerp into the transmission tint, and the roll phase.
 *
 * Callers get just `{ material, innerMaterial }`; the GLSL, uniforms, param sync,
 * and animation all stay here. (The roll/color run in this hook's own frame,
 * independent of the scene's transform loop.)
 */
export function useMobiusMaterial({ config, color, isLight, reducedMotion }: Args) {
  // Live config for the per-frame reads (roll speed).
  const cfgRef = useRef(config);
  cfgRef.current = config;

  // Shader uniforms — mutated on config change / each frame; shared with the
  // compiled shaders (roll phase + gradient core; inner fresnel).
  const phase = useRef({ value: 0 });
  const uColorB = useRef({ value: new THREE.Color('#a070ff') });
  const uUseGradient = useRef({ value: 0 });
  const uGradScale = useRef({ value: 0.7 });
  const uInnerCenter = useRef({ value: new THREE.Color('#3aa0ff') });
  const uInnerFresnel = useRef({ value: 2.5 });
  const uInnerGlow = useRef({ value: 1 });

  // Frosted-acrylic glass with the in-place "roll" shader plus a gradient core
  // blended along the loop height.
  const material = useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(color),
      emissive: new THREE.Color(color),
      side: THREE.DoubleSide,
    });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uPhase = phase.current;
      shader.uniforms.uColorB = uColorB.current;
      shader.uniforms.uUseGradient = uUseGradient.current;
      shader.uniforms.uGradScale = uGradScale.current;
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
          uniform vec3 uColorB;
          uniform float uUseGradient, uGradScale;`,
        )
        .replace(
          '#include <normal_fragment_begin>',
          `#include <normal_fragment_begin>
          // Color core: surfaces facing the camera take the core color; it fades
          // to clear (the white base) toward the grazing / silhouette edges.
          float coreFade = pow(clamp(1.0 - dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), uGradScale);
          vec3 cored = mix(uColorB, diffuseColor.rgb, coreFade);
          diffuseColor.rgb = mix(diffuseColor.rgb, cored, uUseGradient);`,
        );
    };
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => () => material.dispose(), [material]);

  // Inner-shape material: a static, smooth fresnel from the center color toward
  // black at grazing edges. No roll shader, no env — cheap.
  const innerMaterial = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#000'),
      roughness: 0.5,
      metalness: 0,
      envMapIntensity: 0,
      side: THREE.DoubleSide,
    });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uCenterColor = uInnerCenter.current;
      shader.uniforms.uFresnelPower = uInnerFresnel.current;
      shader.uniforms.uGlow = uInnerGlow.current;
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform vec3 uCenterColor;
          uniform float uFresnelPower, uGlow;`,
        )
        .replace(
          '#include <normal_fragment_begin>',
          `#include <normal_fragment_begin>
          float fres = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), uFresnelPower);
          // Center color in the facing region, falling to black toward the edges.
          vec3 fcol = mix(uCenterColor, vec3(0.0), fres);
          diffuseColor.rgb = fcol;
          totalEmissiveRadiance += fcol * uGlow;`,
        );
    };
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => () => innerMaterial.dispose(), [innerMaterial]);

  // flatShading toggling requires a recompile, so guard it behind an effect.
  useEffect(() => {
    material.flatShading = config.flatShading;
    material.needsUpdate = true;
  }, [config.flatShading, material]);

  // Material params that don't need a recompile (run each render).
  material.roughness = config.roughness;
  material.metalness = config.metalness;
  material.emissiveIntensity = config.emissiveIntensity;
  material.transmission = config.transmission;
  material.thickness = isLight ? config.thicknessLight : config.thickness;
  material.ior = config.ior;
  material.iridescence = config.iridescence;
  material.envMapIntensity = config.envIntensity;
  // tint 0 => no attenuation (clear); higher => shorter distance => stronger color.
  material.attenuationDistance = config.tint > 0.001 ? 0.1 + (1 - config.tint) * 1.9 : Infinity;
  // Semi-transparent frosted shell so the inner core shows through reliably.
  material.transparent = config.glassOpacity < 0.999;
  material.opacity = config.glassOpacity;
  uColorB.current.value.setHSL(config.hueB / 360, config.satB, config.lightB);
  uUseGradient.current.value = config.useGradient ? config.coreStrength : 0;
  uGradScale.current.value = config.gradientScale;
  uInnerCenter.current.value.setHSL(config.innerCenterHue / 360, config.innerCenterSat, config.innerCenterLight);
  uInnerFresnel.current.value = config.innerFresnelPower;
  uInnerGlow.current.value = config.innerGlow;

  // Theme-color lerp targets.
  const currentColor = useRef(new THREE.Color(color));
  const targetColor = useRef(new THREE.Color(color));
  useEffect(() => {
    targetColor.current.set(color);
  }, [color]);

  // Per frame: ease the theme color into the transmission tint + glow, and
  // advance the roll (the surface flows in place).
  useFrame((_, delta) => {
    const d = Math.min(delta, 0.033);
    currentColor.current.lerp(targetColor.current, 1 - Math.exp(-d / 0.2));
    material.color.setRGB(1, 1, 1);
    material.attenuationColor.copy(currentColor.current);
    material.emissive.copy(currentColor.current);
    const cfg = cfgRef.current;
    phase.current.value += (reducedMotion ? cfg.rollSpeed * 0.3 : cfg.rollSpeed) * d;
  });

  return { material, innerMaterial };
}
