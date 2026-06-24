/**
 * Site content — all editable copy and project data lives here so the rest of
 * the app stays presentational. Edit this file to update the page.
 */

export const site = {
  name: 'Adrian Milsap',
  role: 'Design Engineer', // primary title — used for metadata + footer
  // Titles that cycle in the wordmark. Lead with the primary; trim/reorder freely.
  // More to choose from: 'UI Engineer', 'UI Developer', 'Frontend Engineer',
  // 'Design Technologist', 'Interface Engineer', 'Prototyper'.
  roles: [
    'Design Engineer',
    'UX Engineer',
    'Product Engineer',
    'Creative Technologist',
    'Forward Deployed Engineer',
  ],
  email: 'adrian@hirobius.com',
};

/**
 * Hero copy — editorial headline above the möbius, a quiet line beneath.
 */
export const hero = {
  // Editorial display headline (two lines, stacked above the centerpiece).
  headlineTop: 'I design the system',
  headlineBottom: 'and build the interface.',

  // Quiet line beneath — the "why" in plain language.
  tagline: 'Erasing the line between how it looks and how it feels.',
};

/**
 * The "new journey" paragraph that sits above the work grid.
 */
export const intro =
  'I work at the seam where design systems meet AI products — designing the system and building the interface as one continuous surface. This is the start of that work, in the open.';

export type Project = {
  title: string;
  blurb: string;
  /** e.g. role / discipline */
  kind: string;
  year: string;
  href: string;
  /** optional cover image in /public; falls back to a tinted panel */
  cover?: string;
};

export const projects: Project[] = [
  {
    title: 'Hirobius Design System',
    blurb:
      'Tokens, primitives, and the documentation surface — a system designed and built end to end.',
    kind: 'Design System',
    year: '2025',
    href: '#',
  },
  {
    title: 'AI Interface Studies',
    blurb:
      'Interaction patterns for AI products — streaming, tool-use, and the moments models meet people.',
    kind: 'Product / AI',
    year: '2025',
    href: '#',
  },
  {
    title: 'Möbius — WebGL Logo Lab',
    blurb:
      'A one-sided surface rendered in real time. Shader-driven twist, magnetic cursor response, no rebuilds.',
    kind: 'Creative Engineering',
    year: '2025',
    href: '#',
  },
];

export const footer = {
  note: 'Built in the open.',
};
