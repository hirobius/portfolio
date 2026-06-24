'use client';

/**
 * RevealText — masked, staggered reveal (cappen-style kinetic type).
 *
 * The text is split into lines (each clipped by an overflow mask), words, and
 * characters; the chosen units (characters by default) rise up from behind the
 * line mask with a stagger and a long ease. Timing comes from the motion tokens.
 *
 * SSR + FOUC handling: the element ships with a `reveal-armed` class. A tiny
 * head script adds `.js` to <html>, and `.js .reveal-armed { visibility:hidden }`
 * hides it before first paint *only when JS is present* — so no-JS users (and a
 * 3s CSS failsafe) still see the text. On mount we split after the webfont is
 * ready (correct line breaks), unhide, then play the rise.
 */

import { useRef, createElement, type ElementType, type Ref } from 'react';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import { motion } from '@/lib/motion';

gsap.registerPlugin(useGSAP, SplitText);
// The hero shares the main thread with the WebGL möbius. A single long canvas
// frame would otherwise trip GSAP's lag-smoothing and stall the reveal mid-rise,
// leaving characters stuck behind their mask. Advancing by real time guarantees
// the tween always completes (and then reverts to clean text).
gsap.ticker.lagSmoothing(0);

type RevealTextProps = {
  children: string;
  /** element to render (default span); e.g. "p" for the tagline */
  as?: ElementType;
  className?: string;
  /** seconds before this element starts revealing (choreography) */
  delay?: number;
  /** animate per character (default) or per word */
  by?: 'chars' | 'words';
};

export function RevealText({
  children,
  as: Tag = 'span',
  className,
  delay = 0,
  by = 'chars',
}: RevealTextProps) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      // Reduced motion: CSS keeps the text visible; just don't animate.
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        el.classList.remove('reveal-armed');
        return;
      }

      let split: SplitText | null = null;
      let tween: gsap.core.Tween | null = null;

      const run = () => {
        if (!ref.current) return;
        // Split to chars even for word mode — keeps words intact for wrapping;
        // we just choose which set animates.
        split = new SplitText(el, { type: 'lines,words,chars', mask: 'lines' });
        const targets = by === 'chars' ? split.chars : split.words;
        const stagger = by === 'chars' ? motion.stagger.char : motion.stagger.word;
        // Hide the units behind the line mask, reveal the container, then rise —
        // ordered so nothing flashes at its natural position.
        gsap.set(targets, { yPercent: 120, opacity: 0 });
        el.classList.remove('reveal-armed');
        tween = gsap.to(targets, {
          yPercent: 0,
          opacity: 1,
          duration: motion.duration.reveal,
          ease: motion.ease.reveal,
          stagger,
          delay,
          // Return the DOM to clean, responsive text once revealed.
          onComplete: () => split?.revert(),
        });
      };

      // Split only after the webfont settles, so the line wrapping is correct.
      if (document.fonts?.status === 'loaded') run();
      else document.fonts?.ready.then(run);

      return () => {
        tween?.kill();
        split?.revert();
      };
    },
    { scope: ref },
  );

  return createElement(
    Tag,
    { ref: ref as Ref<HTMLElement>, className: ['reveal-armed', className].filter(Boolean).join(' ') },
    children,
  );
}
