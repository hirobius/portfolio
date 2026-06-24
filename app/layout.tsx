import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/ThemeProvider';
import { site } from '@/lib/content';
import './globals.css';

export const metadata: Metadata = {
  title: `${site.name} — ${site.role}`,
  description:
    'Design systems and AI interfaces, built end to end. The portfolio of Adrian Milsap, design engineer.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Satoshi (Fontshare) — the variable family is served as a single woff2,
            so any weight 300–900 (including the hero's extra-bold) is available. */}
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,700,800,900&display=swap"
        />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
