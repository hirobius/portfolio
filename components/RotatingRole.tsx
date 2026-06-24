'use client';

import { useEffect, useState } from 'react';

/**
 * RotatingRole — cycles the wordmark's title through a few framings of the same
 * craft (Design Engineer / UX Engineer / …). Each title fades up into place.
 *
 * SSR renders the first role, so crawlers and no-JS visitors see the primary
 * title; the cycle starts only after hydration and stops for reduced-motion. The
 * visual is aria-hidden — the wrapping link carries the name + primary role.
 */
export function RotatingRole({
  roles,
  interval = 2800,
}: {
  roles: readonly string[];
  interval?: number;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (roles.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => {
      setIndex((n) => (n + 1) % roles.length);
    }, interval);
    return () => window.clearInterval(id);
  }, [roles.length, interval]);

  return (
    <span className="role" aria-hidden="true">
      <span key={index} className="role__item">
        {roles[index]}
      </span>
    </span>
  );
}
