import { site } from '@/lib/content';
import { ThemeToggle } from './ThemeToggle';
import { RotatingRole } from './RotatingRole';

export function TopBar() {
  return (
    <header className="topbar">
      <a className="wordmark" href="#top" aria-label={`${site.name} — ${site.role}`}>
        <span className="wordmark__name">{site.name}</span>
        <RotatingRole roles={site.roles} />
      </a>

      <div className="topbar__actions">
        <ThemeToggle />
      </div>
    </header>
  );
}
