import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { ThemeProvider } from '@/components/ThemeProvider';
import { site } from '@/lib/content';
import './globals.css';

// Satoshi, self-hosted (Fontshare kit). One variable woff2 covers weights
// 300–900; Next fingerprints + preloads it and generates a size-adjusted
// fallback to avoid layout shift. Exposed as the --font-satoshi CSS var.
const satoshi = localFont({
  src: [
    { path: './fonts/Satoshi-Variable.woff2', weight: '300 900', style: 'normal' },
    { path: './fonts/Satoshi-VariableItalic.woff2', weight: '300 900', style: 'italic' },
  ],
  variable: '--font-satoshi',
  display: 'swap',
});

export const metadata: Metadata = {
  title: `${site.name} — ${site.role}`,
  description:
    'Design systems and AI interfaces, built end to end. The portfolio of Adrian Milsap, design engineer.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={satoshi.variable}>
      <head>
        {/* Marks JS as active before first paint so the text-reveal can hide
            itself only for JS users (no-JS keeps the text visible). */}
        <script
          dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }}
        />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
