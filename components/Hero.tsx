import { hero } from '@/lib/content';

export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-headline">
      <h1 id="hero-headline" className="hero__headline">
        <span className="hero__line">{hero.headlineTop}</span>

        {/* Reserved space the möbius is anchored to (see mobiusStore layout). */}
        <span className="hero__mobius" data-mobius-anchor="hero" aria-hidden="true" />

        <span className="hero__line">{hero.headlineBottom}</span>
      </h1>

      <p className="hero__tagline">{hero.tagline}</p>
    </section>
  );
}
