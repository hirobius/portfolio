'use client';

import { Component, type ReactNode } from 'react';

/**
 * Guards the WebGL möbius. If the canvas or scene throws (lost context,
 * unsupported GPU, a failed resource), we render nothing instead of letting
 * the error unmount the surrounding page. The site stays fully usable.
 */
export class MobiusErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn('Möbius scene failed; rendering without it.', error);
    }
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
