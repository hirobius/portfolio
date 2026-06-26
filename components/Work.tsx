import { intro, credibility, projects, stack } from '@/lib/content';

export function Work() {
  return (
    <section className="work" aria-labelledby="work-intro">
      <p id="work-intro" className="work__intro">
        {intro}
      </p>
      <p className="work__cred">{credibility}</p>

      <h2 className="work__eyebrow">Selected work</h2>
      <ul className="work__grid">
        {projects.map((project) => (
          <li key={project.title} className="card">
            <a className="card__link" href={project.href}>
              <span
                className="card__cover"
                style={project.cover ? { backgroundImage: `url(${project.cover})` } : undefined}
                aria-hidden="true"
              />

              <span className="card__body">
                <span className="card__meta">
                  <span className="card__kind">{project.kind}</span>
                  <span className="card__year">{project.year}</span>
                </span>

                <span className="card__title">{project.title}</span>
                <span className="card__blurb">{project.blurb}</span>

                {project.highlights && (
                  <ul className="card__points">
                    {project.highlights.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                )}

                <span className="card__cta" aria-hidden="true">
                  View
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M3 11L11 3M11 3H5M11 3V9"
                      stroke="currentColor"
                      strokeWidth="1.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>

      <div className="work__stack">
        <span className="work__stack-label">Stack</span>
        <p className="work__stack-list">{stack.join(' · ')}</p>
      </div>
    </section>
  );
}
