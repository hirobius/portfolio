/**
 * Site content — all editable copy and project data lives here so the rest of
 * the app stays presentational. Edit this file to update the page.
 */

export const site = {
  name: 'Adrian Milsap',
  role: 'Design Systems Engineer',
  // One sharp title for now. To bring back the rotating mix, add more entries:
  // 'Design Engineer', 'Product Engineer', 'Creative Technologist', etc.
  roles: ['Design Systems Engineer'],
  email: 'adrian@hirobius.com',
};

/**
 * Hero copy — editorial headline above the möbius, a quiet line beneath.
 */
export const hero = {
  headlineTop: 'I build the design systems',
  headlineBottom: 'teams ship on.',
  tagline: 'DTCG tokens, a11y enforced in CI, and a library built for AI agents to extend safely.',
};

/**
 * Positioning statement above the work — ownership in plain language.
 */
export const intro =
  'I build and own the component systems product teams ship on — design tokens as the single source of truth, accessibility treated as engineering, and the React/TypeScript infrastructure underneath.';

/** Quiet proof line beneath the intro. */
export const credibility =
  'Ten years behind enterprise design systems, including the Xbox Design System and T-Mobile.';

export type Project = {
  title: string;
  blurb: string;
  /** e.g. role / discipline */
  kind: string;
  year: string;
  href: string;
  /** optional supporting detail, rendered as a short list */
  highlights?: string[];
  /** optional cover image in /public; falls back to a tinted panel */
  cover?: string;
};

export const projects: Project[] = [
  {
    title: 'Hirobius Design System',
    kind: 'Design System',
    year: '2025 — Present',
    href: 'https://github.com/hirobius/hirobius-design-system',
    blurb:
      'A published, governed component library — 88 components across multiple themes, with DTCG design tokens as the single source of truth, synced to Figma variables and shipped end to end.',
    highlights: [
      'Accessibility as engineering: keyboard-trap, focus, and contrast checks automated in CI, alongside visual-regression and responsive suites.',
      'Built to be safely extended by AI agents — a CLAUDE.md operating contract, an autonomous self-heal loop, and a Figma agent with a token-sync protocol.',
      'Release hygiene: automated changeset releases, Lighthouse performance budgets, and bundle-size limits enforced in CI.',
    ],
  },
  {
    title: 'Möbius — WebGL logo lab',
    kind: 'Creative Engineering',
    year: '2025',
    href: '#',
    blurb:
      'The one-sided surface at the top of this page — a shader-driven twist rendered in real time, fit to the layout and tuned to stay light on the main thread.',
  },
];

/** Quiet capabilities row beneath the work. */
export const stack = [
  'React',
  'TypeScript',
  'Design Tokens (DTCG)',
  'Storybook',
  'Figma',
  'Vitest',
  'Playwright',
  'axe-core / CI',
  'Azure OpenAI / RAG',
];

export const footer = {
  note: 'Built in the open.',
};
