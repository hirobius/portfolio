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
  `invalidate()`), throttled to `TARGET_FPS`.
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
| `components/mobius/Mobius.tsx` | `<Mobius config />` | adapter — DOM / theme / cursor / observer glue |
| `components/mobius/MobiusScene.tsx` | R3F props | **god module** (517 lines) — the rework target |
| view components (Hero / Work / Connect / …) | props / none | appropriately thin |
| `components/mobius/MobiusTuner.tsx` | `?tune` only | dev-only, off the production path |

## Seams

- **DOM / theme ⇄ Mobius** — the `--mobius-color` CSS var, reduced-motion, and the
  `[data-mobius-anchor]` element.
- **Mobius ⇄ MobiusScene** — props (`color`, `reducedMotion`, `isLight`, `active`, `config`).
- **MobiusScene ⇄ DOM** — reads the anchor rect; writes the canvas opacity.
- **Config ⇄ MobiusScene** — live tuner edits via `cfgRef` + a per-render sync.
- **content ⇄ views** — data → markup.

## Load-bearing decisions (don't reverse without cause)

1. **Möbius scrolls with the page on the compositor** (absolute canvas, `svh`
   units) — no per-frame scroll JS. Reversing reintroduces scroll jank.
2. **Demand loop capped at `TARGET_FPS` (~38)** — transmission is too costly to run
   at full refresh.
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

1. **Render scheduling** — the throttled rAF loop → a `useDemandRenderLoop(active, fps)`
   deep hook (hides rAF lifecycle + timestamp throttling).
2. **Anchor fit** — measure → unproject → scale, currently smeared across the
   `useFrame` body and a resize effect → a deep module returning `{ position, scale }`.
3. **Material assembly** — `MeshPhysicalMaterial` + `onBeforeCompile` GLSL + ~8
   uniform refs + per-render param sync → a `useMobiusMaterial(config, …)`. Deepest
   payoff, biggest job, most locality risk.
