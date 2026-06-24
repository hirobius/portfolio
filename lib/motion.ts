/**
 * Motion tokens — the shared animation vocabulary for the Hirobius system.
 *
 * Components (e.g. RevealText) read these instead of hand-tuning timing per use,
 * so motion stays consistent the same way color/spacing tokens keep visuals
 * consistent. Durations are in seconds; eases are GSAP ease strings.
 */
export const motion = {
  duration: {
    /** the editorial headline rise */
    reveal: 0.9,
  },
  ease: {
    /** long, settled deceleration — the "lifted into place" feel */
    reveal: 'expo.out',
  },
  stagger: {
    /** seconds between adjacent characters in a reveal */
    char: 0.02,
    /** seconds between adjacent words in a reveal */
    word: 0.05,
  },
  /**
   * Hero entrance choreography — per-element start offsets (seconds) so the
   * headline lines and tagline enter as one composition, overlapping the möbius
   * canvas fade rather than each animating independently.
   */
  sequence: {
    heroLineTop: 0.15,
    heroLineBottom: 0.42,
    heroTagline: 0.72,
  },
} as const;
