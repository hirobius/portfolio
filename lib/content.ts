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
  location: 'Spokane, WA',
  email: 'adrian.milsap@gmail.com',
};

/**
 * Hero copy — editorial headline above the möbius, a quiet line beneath.
 */
export const hero = {
  headlineTop: 'I build the design systems',
  headlineBottom: 'teams ship on.',
  tagline: 'DTCG tokens, a11y enforced in CI, and a library built for AI agents to extend safely.',
  // Grounding line beneath the hero (role · location).
  meta: 'Design Systems Engineer · Spokane, WA',
};

/**
 * Positioning statement above the work — ownership in plain language.
 */
export const intro =
  'I build and own the component systems product teams ship on — design tokens as the single source of truth, accessibility treated as engineering, and the React/TypeScript infrastructure underneath.';

/** Brand-free seniority signal beneath the intro. */
export const credibility = 'Ten years in enterprise design systems.';

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
      'A published, governed component library — 88 components, multi-theme, with DTCG tokens as the single source of truth and Figma sync. Accessibility runs in CI, and the library is built to be safely extended by AI agents.',
  },
  {
    title: 'Job Hunt Jade',
    kind: 'Product · Design System',
    year: '2025',
    href: 'https://job-hunt-jade.vercel.app/',
    blurb:
      'A focused job-search workspace — an application board for tracking roles end to end, built on its own small design system, with written case studies on the product and the system.',
  },
  {
    title: 'Veteran Resource Navigator',
    kind: 'Product · Accessibility',
    year: '2025',
    href: 'https://veteran-resource-navigator.vercel.app/',
    blurb:
      'An accessible navigator that helps veterans find and reach the benefits and resources they qualify for.',
  },
];

type Sketch = { title: string; blurb: string; href: string };

/**
 * Sketchbook — lighter-weight interactive experiments. Dump entries here; the
 * section only renders once it has at least one. Each is { title, blurb, href }.
 */
export const sketches: { heading: string; lead: string; items: Sketch[] } = {
  heading: 'Sketchbook',
  lead: 'Interactive experiments and creative-engineering bits.',
  items: [],
};

/** Engineering-scoped tools row — no comms tools (Slack/Teams/Discord left off). */
export const stack = [
  'React',
  'TypeScript',
  'Node.js',
  'Design Tokens (DTCG)',
  'Figma',
  'Storybook',
  'Vitest',
  'Playwright',
  'axe-core / CI',
  'Vercel',
  'GitHub Actions',
  'LLMs (Claude, GPT, Gemini)',
];

export const footer = {
  note: 'Built in the open.',
};

/**
 * Closing "Let's connect" CTA.
 */
export const contact = {
  heading: "Let's connect",
  line: 'Building a design system, or just want to talk shop? Reach out.',
  links: [
    { label: 'Email', href: 'mailto:adrian.milsap@gmail.com' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/adrianmilsap' },
    { label: 'GitHub', href: 'https://github.com/hirobius' },
  ],
};
