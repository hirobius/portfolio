# CONTEXT

Shared map and vocabulary for this codebase. Read before architecture work so we
name things consistently and don't reverse load-bearing decisions.

## Architecture at a glance

Next.js (App Router). Almost everything is a server-rendered, presentational view
that reads its copy from a single data module. There is exactly **one client
island**: the WebGL möbius, mounted client-only. Motion is CSS-first (runs on the
compositor); the möbius is the only thing that renders continuously.

```
app/page.tsx ── TopBar · Hero · Work (+ Sketchbook) · Connect · Footer   (views)
            └── MobiusMount → Mobius → MobiusScene                        (the island)
lib/content.ts   single source of copy/data for every view
lib/motion.ts    entrance timing tokens (the reveal itself is CSS)
```

## Glossary (use these terms)

- **Möbius** — the centerpiece: a twisted, fluted triangular tube (a one-sided
  surface) rendered as frosted transmission glass.
- **Roll** — the in-place rotation of each cross-section (an animated vertex-shader
  phase). The shape stays put; the surface flows. This is the möbius's "life."
- **Transmission** — the glass refraction pass. The dominant GPU cost; it
  re-renders the scene every frame.
- **Gradient core** — the inverse-fresnel color the outer glass takes toward
  camera-facing surfaces (a fragment-shader injection).
- **Fit** — sizing + positioning the möbius to its **anchor**, the
  `[data-mobius-anchor]` box in the hero. Measured from the DOM, not hard-coded.
- **Demand loop** — the möbius drives its own renders (`frameloop="demand"` +
  `invalidate()`), throttled to the device tier's target fps.
- **Tier / Quality** — `detectMobiusTier()` probes WebGL once, up front, and picks
  `glass-high | glass-low | lite | none`; `qualityForTier()` maps that to the
  fidelity knobs (transmission resolution, dpr cap, fps). Same glass *look* on every
  real GPU — only the internals scale. See `capability.ts`.
- **Lite** — the cheap fresnel-emissive material (`useMobiusMaterialLite`): no
  transmission / inner mesh / env. Reachable live via `?lite` / the tuner. Kept as a
  cheap alternate look, though it's no longer the production low-power fallback.
- **Static fallback** — on devices with no real GPU (software rasterizers / no
  WebGL), the live canvas never mounts; `MobiusFallback` shows a pre-rendered PNG
  (`/mobius-fallback.png`, the **glass** möbius on transparent) in the hero band
  instead — zero three.js, no render loop. `resolveMobiusMode()` decides canvas vs
  static (see `capability.ts`).
- **Active** — a render-gate from an IntersectionObserver; when false, nothing
  renders (the hero is offscreen).
- **Entrance** — warm-up frames (absorb the first-render hitch) then a CSS opacity
  fade of the canvas.
- **Reveal** — the per-character text entrance, animated entirely in CSS.
- **Config** — `MobiusConfig`: the tunable shape/material params, edited live by
  the `?tune` **Tuner**. Distinct from **design tokens** (CSS vars / fonts).

## Module map (interface · depth)

| Module | Interface | Depth |
| --- | --- | --- |
| `lib/content.ts` | named data exports | deep — one source for all copy |
| `components/motion/Reveal.tsx` | `<Reveal delay>{text}</Reveal>` | **deep** — hides split + SSR markup + a11y + CSS handoff |
| `buildMobiusTube` (in MobiusScene) | `(config) → BufferGeometry` | **deep** — gnarly geometry behind one argument |
| `components/mobius/useDemandRenderLoop.ts` | `(active, fps)` | **deep** — owns demand-mode rAF + throttle |
| `components/mobius/useAdaptiveTransmission.ts` | `(enabled, baseRes, fps)` | **deep** — measures fps, steps transmission res down on weak GPUs |
| `components/mobius/useAnchorFit.ts` | `(selector, outerDiameter) → ref` | **deep** — DOM box → world transform + dirty mgmt |
| `components/mobius/useMobiusMaterial.ts` | `({config, color, …}) → {material, innerMaterial}` | **deep** — GLSL + uniforms + sync + color/roll |
| `components/mobius/useMobiusMaterialLite.ts` | `({config, color, reducedMotion}) → {material}` | **deep** — the fallback fresnel shell + roll |
| `components/mobius/capability.ts` | `detectMobiusTier()` · `qualityForTier()` · `resolveMobiusMode()` | **deep** — GPU probe → tier / fidelity / canvas-vs-static |
| `components/mobius/MobiusFallback.tsx` | `<MobiusFallback />` (in hero anchor) | adapter — static image on low-power devices |
| `components/mobius/Mobius.tsx` | `<Mobius config />` | adapter — DOM / theme / cursor / observer / tier glue |
| `components/mobius/MobiusScene.tsx` | R3F props | orchestrator (~300 lines) — composes the deep modules |
| view components (Hero / Work / Connect / …) | props / none | appropriately thin |
| `components/mobius/MobiusTuner.tsx` | `?tune` only | dev-only, off the production path |

## Seams

- **DOM / theme ⇄ Mobius** — the `--mobius-color` CSS var, reduced-motion, and the
  `[data-mobius-anchor]` element.
- **Mobius ⇄ MobiusScene** — props (`color`, `reducedMotion`, `isLight`, `active`, `config`, `variant`, `fps`).
- **Capability ⇄ Mobius** — the up-front GPU probe picks the tier before the canvas
  mounts; `?glass` / `?glasslow` / `?lite` force a tier for per-device testing.
- **MobiusScene ⇄ DOM** — reads the anchor rect; writes the canvas opacity.
- **Config ⇄ MobiusScene** — live tuner edits via `cfgRef` + a per-render sync.
- **content ⇄ views** — data → markup.

## Load-bearing decisions (don't reverse without cause)

1. **Möbius scrolls with the page on the compositor** (absolute canvas, `svh`
   units) — no per-frame scroll JS. Reversing reintroduces scroll jank.
2. **Demand loop capped at the tier's fps (~30–38)** — transmission is too costly to
   run at full refresh; weaker tiers cap lower.
2a. **Capability tiering keeps the *same glass look* on every real GPU**, scaling only
   fidelity (transmission resolution, dpr, fps). Devices with no real GPU (software
   rasterizers / no WebGL) get a **static image** instead of the live canvas — the
   lightest possible floor. Mobile is **not** a downgrade signal — only software /
   ≤2 GB / data-saver drop below `glass-high`.
2b. **Adaptive transmission** (`useAdaptiveTransmission`) catches the gap the static
   probe can't: a real-but-weak GPU that holds the glass but can't sustain `fps`.
   It measures achieved fps and steps the transmission render-target resolution down
   (nearly invisible on the frosted surface). Downgrade-only — never oscillates.
3. **Rendering pauses offscreen** via `active` (IntersectionObserver).
4. **Entrance fade is CSS opacity** (compositor), not per-frame JS.
5. **Text reveal is native CSS**, deliberately not JS/GSAP — main-thread contention
   starved the cascade. GSAP was removed entirely.
6. **Fonts are self-hosted** via `next/font/local` (no CDN request, no FOUT).
7. **No scene lights** — the look comes from transmission + attenuation tint +
   gradient core. Lights contributed nothing and were removed.
8. **Fit is measured only on mount / resize / geometry change** (a dirty flag),
   never per scroll frame.

## Deepening backlog (candidates — unsolved on purpose)

All inside `MobiusScene.tsx`, ranked clarity-per-risk:

1. ~~**Render scheduling**~~ — **DONE**: `useDemandRenderLoop(active, fps)`.
2. ~~**Anchor fit**~~ — **DONE**: `useAnchorFit(selector, outerDiameter)` returns a base
   `{ x, y, scale }` ref; the frame loop composes it with parallax / config scale / tilt.
3. ~~**Material assembly**~~ — **DONE**: `useMobiusMaterial({config, color, isLight, reducedMotion})`
   owns the GLSL + uniforms + param sync + the color/roll animation; returns `{material, innerMaterial}`.

All three cut. `MobiusScene` went **517 → ~296 lines** and is now an orchestrator: it composes the
geometry, the render loop (`useDemandRenderLoop`), the fit (`useAnchorFit`), and the materials
(`useMobiusMaterial`), and keeps only the entrance + transform choreography. No behavior changed at
any step (verified each pass). Note: the env map *looks* unused (`envIntensity: 0`) but is
**load-bearing** — `scene.environment` feeds the transmission glass's IBL even at intensity 0 (a
three.js quirk the software renderer here can't show). It was deleted, looked wrong on a real GPU,
and restored. Keep it.
