/**
 * Hero entrance choreography.
 *
 * The per-character reveal itself is native CSS (see `.reveal` in globals.css).
 * These are the base delays (seconds) that decide WHEN each element starts,
 * relative to load: the möbius settles in first, then the headline rises in over
 * it, then the tagline — one composition rather than each animating on its own.
 */
export const sequence = {
  /** first headline line — begins after the möbius has animated in */
  headlineTop: 1.2,
  /** second headline line — overlaps the tail of the first */
  headlineBottom: 1.45,
  /** the tagline comes in last */
  tagline: 1.72,
} as const;
