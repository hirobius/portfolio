/**
 * Hero entrance choreography.
 *
 * The per-character reveal itself is native CSS (see `.reveal` in globals.css).
 * These are the base delays (seconds) that decide WHEN each element starts,
 * relative to load: the headline leads, top-down, while the möbius materializes
 * in its band alongside — one composition rather than each animating on its own.
 */
export const sequence = {
  /** first headline line */
  headlineTop: 0.4,
  /** second headline line — overlaps the tail of the first */
  headlineBottom: 0.65,
  /** the tagline comes in last */
  tagline: 0.95,
} as const;
