import { amdProjects } from "./content";

export default function AmdCollection() {
  return (
    <section
      id="amd-collection"
      className="amd-collection chapter"
      data-nav="work"
      aria-labelledby="amd-title"
    >
      <div className="section-top">
        <div className="chapter-label mono">
          <span>02 / COLLECTION</span>
          <span>AMD-inspired experiments</span>
        </div>
        <span className="mono amd-collection-count">
          FOUR WAYS INTO COMPUTING.
        </span>
      </div>
      <div className="amd-heading">
        <h2 id="amd-title">
          Understand it.
          <br />
          By trying it.
        </h2>
        <p>
          Hardware choices, machine learning, robotics and a little personality.
          Four browser experiments that put the ideas in your hands.
        </p>
      </div>
      <div className="amd-grid">
        {amdProjects.map((project, index) => (
          <article
            className="amd-card"
            key={project.id}
            data-amd-project={project.id}
          >
            <div className="amd-card-meta mono">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <span>{project.category}</span>
            </div>
            <div className="amd-card-figure">
              <span className="amd-card-number">{project.figure}</span>
              <span className="amd-card-label mono">{project.figureLabel}</span>
            </div>
            <h3>{project.title}</h3>
            <p>{project.description}</p>
            <div className="amd-card-links">
              {project.caseStudyId && (
                <a
                  href={`#project-${project.caseStudyId}`}
                  aria-label={`Read the ${project.title} case study`}
                >
                  Case study <span aria-hidden="true">↗</span>
                </a>
              )}
              {project.live && (
                <a
                  href={project.live}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Explore ${project.title}`}
                >
                  Try it <span aria-hidden="true">↗</span>
                </a>
              )}
              <a
                href={project.source}
                target="_blank"
                rel="noreferrer"
                aria-label={`View ${project.title} source on GitHub`}
              >
                Source <span aria-hidden="true">↗</span>
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
