import { footer, site } from '@/lib/content';

export function Footer() {
  return (
    <footer className="footer">
      <span className="footer__name">
        {site.name} — {site.role}
      </span>
      <span className="footer__note">{footer.note}</span>
    </footer>
  );
}
