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
| Möbius scene / shaders | `components/mobius/MobiusScene.tsx` |
| Möbius parameters (size, color, motion) | `components/mobius/mobiusStore.ts` |

### Editing content

Update `lib/content.ts` — headline, the "journey" intro, and the `projects`
array (title, blurb, kind, year, href, optional `cover` image in `/public`).

### Tuning the möbius

`components/mobius/mobiusStore.ts` holds the defaults. The most useful knobs:

- `scale` / `layoutScale` — overall size in the hero
- `color` — overwritten at runtime from the `--mobius-color` CSS var (flips
  with the theme; edit those vars in `app/globals.css`)
- `rollSpeed`, `mouseInfluence`, `magneticLag` — motion feel

The möbius is anchored to the hero via `[data-mobius-anchor="hero"]`. Grab-to-
stretch is available but disabled by default (`allowGrab` on `<Mobius />`).
