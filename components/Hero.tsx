import { hero } from '@/lib/content';
import { Reveal } from '@/components/motion';
import { sequence } from '@/lib/motion';

export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-headline">
      <div className="hero__stage">
        {/* Region the möbius is fit to — absolutely placed behind the headline so
            the type overlaps the shape (see mobiusStore layout). */}
        <span className="hero__mobius" data-mobius-anchor="hero" aria-hidden="true" />

        <h1 id="hero-headline" className="hero__headline">
          <Reveal className="hero__line" delay={sequence.headlineTop}>
            {hero.headlineTop}
          </Reveal>
          <Reveal className="hero__line" delay={sequence.headlineBottom}>
            {hero.headlineBottom}
          </Reveal>
        </h1>
      </div>

      <Reveal as="p" className="hero__tagline" delay={sequence.tagline}>
        {hero.tagline}
      </Reveal>
    </section>
  );
}
