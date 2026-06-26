import { contact } from '@/lib/content';

export function Connect() {
  return (
    <section className="connect" aria-labelledby="connect-heading">
      <h2 id="connect-heading" className="connect__heading">
        {contact.heading}
      </h2>
      <p className="connect__line">{contact.line}</p>
      <ul className="connect__links">
        {contact.links.map((link) => (
          <li key={link.label}>
            <a className="connect__link" href={link.href}>
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
