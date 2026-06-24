import { hero } from '@/lib/content';
import { RevealText } from '@/components/motion';
import { motion } from '@/lib/motion';

export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-headline">
      <h1 id="hero-headline" className="hero__headline">
        <RevealText className="hero__line" delay={motion.sequence.heroLineTop}>
          {hero.headlineTop}
        </RevealText>

        {/* Reserved space the möbius is anchored to (see mobiusStore layout). */}
        <span className="hero__mobius" data-mobius-anchor="hero" aria-hidden="true" />

        <RevealText className="hero__line" delay={motion.sequence.heroLineBottom}>
          {hero.headlineBottom}
        </RevealText>
      </h1>

      <RevealText as="p" className="hero__tagline" delay={motion.sequence.heroTagline}>
        {hero.tagline}
      </RevealText>
    </section>
  );
}
