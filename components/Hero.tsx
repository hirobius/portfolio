import { hero } from '@/lib/content';
import { Reveal } from '@/components/motion';
import { sequence } from '@/lib/motion';
import { MobiusFallback } from '@/components/mobius/MobiusFallback';

export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-headline">
      <h1 id="hero-headline" className="hero__headline">
        <Reveal className="hero__line" delay={sequence.headlineTop}>
          {hero.headlineTop}
        </Reveal>
        <Reveal className="hero__line" delay={sequence.headlineBottom}>
          {hero.headlineBottom}
        </Reveal>
      </h1>

      {/* Reserved band the möbius is fit to (see mobiusStore layout). On low-power
          devices the live canvas is skipped and MobiusFallback fills this with a
          static image instead. */}
      <span className="hero__mobius" data-mobius-anchor="hero" aria-hidden="true">
        <MobiusFallback />
      </span>

      <Reveal as="p" className="hero__tagline" delay={sequence.tagline}>
        {hero.tagline}
      </Reveal>

      <p className="hero__meta">{hero.meta}</p>
    </section>
  );
}
