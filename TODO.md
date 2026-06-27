# TODO

Open action items for the portfolio. Done work lives in git history / `CONTEXT.md`.

## Launch hygiene (before sharing the link publicly)

- [ ] **Open Graph / Twitter Card tags** — `app/layout.tsx` `metadata` is title +
      description only, so shared links (LinkedIn / Slack / iMessage / X) render no
      preview card. Add `openGraph`, `twitter`, and `metadataBase`.
- [ ] **OG image** — generate a branded share card (1200×630). Could render the
      möbius or a typographic card. Wire via `app/opengraph-image.*` (and reuse for
      `twitter-image`).
- [ ] **Metadata copy is off-positioning** — `app/layout.tsx` description says
      "design engineer" / "AI interfaces"; settled positioning is **Design Systems
      Engineer**. Tighten to match `lib/content.ts`.
- [ ] **`robots.txt` + `sitemap.xml`** — add `app/robots.ts` and `app/sitemap.ts`
      (trivial; helps indexing).
- [ ] **Remove the dev `?tune` panel** — `MobiusTuner` (+ its mount in
      `MobiusMount`) is dev-only; strip it for the public build once möbius values
      are locked in. Its own header comment flags this.
- [ ] **Stale README** — the "Tuning the möbius" section documents constants
      (`LOOP_RADIUS`, `U_SEGMENTS`, `BASE_TILT_X`…) that no longer exist; the shape
      is now driven by `MobiusConfig`. Rewrite or drop that section.

## Content (decisions / real copy)

- [ ] **Verify draft project blurbs** — I drafted **Job Hunt Jade** and **Veteran
      Resource Navigator** in `lib/content.ts`; confirm they're accurate.
- [ ] **Fill the Sketchbook** — `sketches.items` is empty, so the section is hidden.
      Add the interactive experiments worth showing.
- [ ] **Decide leftover projects** — Ops Task Board, Access Tech, Lilac Bonds, the
      HDS demo: whether any belong, and confirm `adrian-milsap.vercel.app` is a
      prior portfolio.
- [ ] **Dial in möbius tuner values** — tune glass + lite per tab (`?tune`), then
      send the per-tab JSON to bake into `DEFAULT_MOBIUS_CONFIG`. If the glass look
      changes, regenerate `public/mobius-fallback.png` from the `?glass` render.

## Low priority

- [ ] **Fallback image weight** — `public/mobius-fallback.png` is ~320 KB; a WebP is
      ~half. Only loads on low-power devices, so minor.

## After launch-hygiene cleanup

- [ ] **Architecture scrub** (Matt Pocock `improve-codebase-architecture` skill) —
      best run once the möbius reaches its launch shape, i.e. **after** the `?tune`
      tuner + `variantOverride` preview plumbing are removed. Known seams to consider
      then: consolidate the tier/mode/URL-param resolution split across
      `capability.ts` and `Mobius.tsx` (`resolveTier`); fold `MobiusScene`'s render
      knobs (variant/fps/transmissionResolution) into one object to slim its props.
