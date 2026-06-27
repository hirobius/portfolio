# Adrian Milsap — Portfolio

A clean, single-page portfolio for a design engineer. Warm editorial aesthetic
(Playfair Display + Inter), a real-time WebGL **möbius** centerpiece, a
light/dark theme switch, and a small work grid.

## Stack

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **React Three Fiber** / **three.js** for the möbius (shader-driven twist,
  magnetic cursor response — ported from the original design system, trimmed)
- **next-themes** for the theme switch
- Plain CSS (`app/globals.css`) with theme tokens — no UI framework

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint
npm run typecheck
```

## Where things live

| What | File |
| --- | --- |
| All copy (headline, intro, projects) | `lib/content.ts` |
| Theme tokens, type ramp, layout | `app/globals.css` |
| Page composition | `app/page.tsx` + `components/*` |
| Möbius (Canvas wrapper) | `components/mobius/Mobius.tsx` |
| Möbius scene, geometry & motion | `components/mobius/MobiusScene.tsx` |

### Editing content

Update `lib/content.ts` — headline, the "journey" intro, and the `projects`
array (title, blurb, kind, year, href, optional `cover` image in `/public`).

### Tuning the möbius

The scene is a lean R3F component — a real möbius strip baked into a
`BufferGeometry` (no runtime shader, transmission pass, or post-processing).
The constants at the top of `components/mobius/MobiusScene.tsx` are the knobs:

- `LOOP_RADIUS` / `BAND_WIDTH` — proportions of the ribbon
- `U_SEGMENTS` / `V_SEGMENTS` — tessellation (raise for smoother, lower for lighter)
- `BASE_TILT_X` — the resting 3/4 view angle
- `roll` (in `useFrame`) — spin speed; `0.16`/`0.3` factors — cursor tilt response

Color comes from the `--mobius-color` CSS var (flips with the theme; edit those
vars in `app/globals.css`). The möbius auto-fits and anchors to the hero band
via `[data-mobius-anchor="hero"]`.

### Device tiers

`components/mobius/capability.ts` probes WebGL once on load and picks a render tier
so the same glass look runs on every device with a real GPU, scaling only fidelity:

- `glass-high` — full transmission glass (capable GPU)
- `glass-low` — same glass, lower transmission resolution / dpr / fps (constrained GPU)
- `lite` — a cheap transmission-free fresnel fallback (software rasterizers)
- `none` — no WebGL: the canvas is skipped (the möbius is decorative)

Force a tier for testing on a given device with `?glass`, `?glasslow`, or `?lite`.
