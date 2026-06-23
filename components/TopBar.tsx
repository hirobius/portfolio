import { hero } from '@/lib/content';
import { ThemeToggle } from './ThemeToggle';

export function TopBar() {
  return (
    <header className="topbar">
      <a className="wordmark" href="#top">
        {hero.wordmark.map((line) => (
          <span key={line} className="wordmark__line">
            {line}
          </span>
        ))}
      </a>

      <div className="topbar__actions">
        <ThemeToggle />
      </div>
    </header>
  );
}
