import { Fragment } from 'react';
import type { CSSProperties, ElementType } from 'react';

type RevealProps = {
  /** plain text to reveal, one character at a time */
  children: string;
  /** element to render (default span); e.g. "p" for the tagline */
  as?: ElementType;
  className?: string;
  /** seconds before this element starts revealing (entrance choreography) */
  delay?: number;
};

/**
 * Reveal — per-character entrance, animated entirely in native CSS.
 *
 * The string is split into words (kept whole so it still wraps) and characters at
 * render time; each character carries an `--i` index so one CSS keyframe can
 * stagger it via `animation-delay`. Because transform/opacity animate on the
 * COMPOSITOR thread, the reveal stays smooth even while the WebGL möbius works the
 * main thread — and it needs no JS, so it runs (and degrades to plain text)
 * without hydration.
 *
 * The split spans are aria-hidden; the wrapper carries the whole string as an
 * aria-label so assistive tech reads it as one phrase.
 */
export function Reveal({ children, as: Tag = 'span', className, delay = 0 }: RevealProps) {
  const words = children.split(' ');
  let charIndex = 0;
  const rootStyle = { '--reveal-base': `${delay}s` } as CSSProperties;

  return (
    <Tag
      className={['reveal', className].filter(Boolean).join(' ')}
      style={rootStyle}
      aria-label={children}
    >
      {words.map((word, wi) => (
        <Fragment key={wi}>
          <span className="reveal__word" aria-hidden="true">
            {Array.from(word).map((ch, ci) => {
              const i = charIndex++;
              return (
                <span className="reveal__char" style={{ '--i': i } as CSSProperties} key={ci}>
                  {ch}
                </span>
              );
            })}
          </span>
          {wi < words.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </Tag>
  );
}
