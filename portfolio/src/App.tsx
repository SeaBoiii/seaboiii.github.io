import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  careerMilestones,
  contactLinks,
  featuredProjects,
  playgroundProjects,
  profile,
  technicalAreas,
} from "./content";
import CoreFallback from "./CoreFallback";
import ProjectVisual from "./ProjectVisual";
import { connectScroll, notifyScroll, scrollSignal } from "./scrollSignal";

const ComputeCore = lazy(() => import("./ComputeCore"));
const Arrow = ({ diagonal = false }: { diagonal?: boolean }) => (
  <span aria-hidden="true" className="arrow">
    {diagonal ? "↗" : "↘"}
  </span>
);
const Mark = () => (
  <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <path
      d="m16 2 13 7.5v15L16 32 3 24.5v-15L16 2Z"
      stroke="currentColor"
      strokeWidth="1.7"
    />
    <path
      d="m16 8 8 4.5v9L16 26l-8-4.5v-9L16 8Zm0 0v18M8 12.5l16 9m0-9-16 9"
      stroke="currentColor"
      strokeWidth="1.2"
    />
  </svg>
);
const projectNotes: Record<string, string> = {
  "tiny-ai":
    "The teachable classifier and ONNX shape model are separate pathways. The runtime checks actual backend availability before choosing where inference runs.",
  rover:
    "The current project is a simulator with independent rendering and simulation layers. Hardware interfaces provide scaffolding for future physical adapters.",
  "icm-buddy":
    "On-device controls and stored calibration keep the mechanism usable without a connected computer. The project report includes schematics and long-exposure photographs.",
  classility:
    "Conditional rules turn a shared scoring model into distinct archetype profiles. Each result can become a downloadable illustrated card.",
};

class GraphicsBoundary extends Component<
  { children: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function ChapterLabel({
  number,
  children,
}: {
  number: string;
  children: ReactNode;
}) {
  return (
    <div className="chapter-label mono">
      <span>{number}</span>
      <span>{children}</span>
    </div>
  );
}

function Playground() {
  const [filter, setFilter] = useState("All");
  const shown = playgroundProjects.filter(
    (project) => filter === "All" || project.category === filter,
  );
  return (
    <section id="playground" data-chapter="4" className="playground chapter">
      <div className="section-top">
        <ChapterLabel number="04">The playground</ChapterLabel>
        <span className="mono quiet">CURIOSITY, LEFT RUNNING.</span>
      </div>
      <div className="playground-heading">
        <div>
          <h2>
            Room to
            <br />
            <span className="muted">try things.</span>
          </h2>
          <p>
            Small ideas. Playable worlds. Things built
            <br className="desktop-break" /> for the pleasure of figuring them
            out.
          </p>
        </div>
        <div className="playground-network" data-core-anchor aria-hidden="true">
          <svg viewBox="0 0 400 200">
            <g fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M40 140 110 55 200 95 270 30 355 85M110 55 115 170 200 95 295 170 355 85M40 140 115 170M270 30 295 170" />
              {[
                [40, 140],
                [110, 55],
                [115, 170],
                [200, 95],
                [270, 30],
                [295, 170],
                [355, 85],
              ].map(([x, y], i) => (
                <rect
                  key={i}
                  x={x - 5}
                  y={y - 5}
                  width="10"
                  height="10"
                  fill={i === 3 ? "#c3e85b" : "#f1f0e9"}
                />
              ))}
            </g>
          </svg>
        </div>
      </div>
      <div className="filter-row">
        <div
          className="filters"
          role="group"
          aria-label="Filter playground projects"
        >
          {["All", "Interfaces", "Games", "Stories"].map((category) => (
            <button
              className="filter-button"
              key={category}
              aria-pressed={filter === category}
              onClick={() => setFilter(category)}
            >
              {category}
              {category === "All" && <span>{playgroundProjects.length}</span>}
            </button>
          ))}
        </div>
        <span className="mono filter-count" aria-live="polite">
          {String(shown.length).padStart(2, "0")} EXPERIMENTS
        </span>
      </div>
      <div className="playground-grid">
        {shown.map((project, index) => (
          <article
            key={project.id}
            className={`play-card play-${project.accent} play-${project.id}`}
          >
            <a
              href={project.href}
              className="play-image-link"
              aria-label={`Explore ${project.title}`}
              target={project.href.startsWith("http") ? "_blank" : undefined}
              rel="noreferrer"
            >
              {project.image ? (
                <img
                  src={project.image}
                  alt={`${project.title} interface preview`}
                  loading="lazy"
                  width="1366"
                  height="768"
                />
              ) : (
                <div
                  className={`play-illustration illustration-${project.id}`}
                  aria-hidden="true"
                >
                  {project.id === "chip-challenge" ? (
                    <>
                      <span className="pc-board">▥</span>
                      <span className="pc-chip">AS</span>
                      <span className="mono">CHOOSE. BUILD. BALANCE.</span>
                    </>
                  ) : (
                    <>
                      <span className="flight-route">
                        SIN <span>↗</span> US
                      </span>
                      <span className="mono">TWO PEOPLE. ONE JOURNEY.</span>
                    </>
                  )}
                </div>
              )}
              <span className="play-open" aria-hidden="true">
                ↗
              </span>
            </a>
            <div className="play-card-meta mono">
              <span>{project.category}</span>
              <span>{String(index + 1).padStart(2, "0")}</span>
            </div>
            <h3>
              <a
                href={project.href}
                target={project.href.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
              >
                {project.title}
              </a>
            </h3>
            <p>{project.description}</p>
            <a
              className="play-source mono"
              href={project.code}
              target="_blank"
              rel="noreferrer"
            >
              View source <Arrow diagonal />
            </a>
          </article>
        ))}
      </div>
      <a
        className="text-link playground-more"
        href="https://github.com/SeaBoiii?tab=repositories"
        target="_blank"
        rel="noreferrer"
      >
        Keep exploring on GitHub <Arrow diagonal />
      </a>
    </section>
  );
}

export default function App() {
  const stage = useRef<HTMLDivElement>(null);
  const [loadGraphics, setLoadGraphics] = useState(false);
  const [graphicsReady, setGraphicsReady] = useState(false);
  const [graphicsFailed, setGraphicsFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (!stage.current) return;
    const disconnect = connectScroll(stage.current);
    const params = new URLSearchParams(location.search);
    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;
    const memory = (navigator as Navigator & { deviceMemory?: number })
      .deviceMemory;
    const shouldLoad =
      params.get("quality") !== "static" &&
      !connection?.saveData &&
      !(memory && memory < 4) &&
      navigator.hardwareConcurrency > 2;
    const idle = window.setTimeout(() => {
      if (!shouldLoad) return;
      // Avoid even downloading the rendering engine when no usable GPU exists.
      try {
        const probe = document
          .createElement("canvas")
          .getContext("webgl2", { failIfMajorPerformanceCaveat: true });
        if (!probe) return;
        probe.getExtension("WEBGL_lose_context")?.loseContext();
        setLoadGraphics(true);
      } catch {
        /* The authored core is already rendered with the content. */
      }
    }, 450);
    return () => {
      clearTimeout(idle);
      disconnect();
    };
  }, []);
  useEffect(() => {
    // Preserve old inbound bookmarks while the root narrative changes.
    const aliases: Record<string, string> = {
      main: "hero",
      projects: "work",
      proficiency: "perspective",
      description: "statement",
      announcement: "about",
    };
    const resolve = () => {
      const mapped = aliases[location.hash.slice(1)];
      if (mapped) document.getElementById(mapped)?.scrollIntoView();
    };
    resolve();
    window.addEventListener("hashchange", resolve);
    return () => window.removeEventListener("hashchange", resolve);
  }, []);
  const toggleCore = () => {
    const next = !expanded;
    setExpanded(next);
    scrollSignal.expanded = next;
    notifyScroll();
  };
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <a
          href="#hero"
          className="identity"
          aria-label="Aleem Siddique, back to top"
        >
          <Mark />
          <span>
            ALEEM<span className="identity-dot">.</span>
          </span>
        </a>
        <span className="header-note mono">
          INDEPENDENT CURIOSITY.
          <br />
          CONNECTED DISCIPLINES.
        </span>
        <nav className="nav-links" aria-label="Primary navigation">
          <a href="#work">Work</a>
          <a href="#about">About</a>
          <a href="#playground">Playground</a>
          <a href="#contact">
            Contact <span aria-hidden="true">↗</span>
          </a>
        </nav>
      </header>
      <div
        ref={stage}
        className={`core-stage ${graphicsReady && !graphicsFailed ? "is-ready" : ""}`}
        data-quality={loadGraphics && !graphicsFailed ? "webgl" : "static"}
        aria-hidden="true"
      >
        <CoreFallback />
        {loadGraphics && !graphicsFailed && (
          <GraphicsBoundary onFailure={() => setGraphicsFailed(true)}>
            <Suspense fallback={null}>
              <ComputeCore
                onReady={() => setGraphicsReady(true)}
                onFailure={() => setGraphicsFailed(true)}
              />
            </Suspense>
          </GraphicsBoundary>
        )}
      </div>
      <main id="main-content">
        <section id="hero" data-chapter="0" className="hero chapter">
          <div className="hero-kicker mono">
            <span className="status-dot" />
            ENGINEERING, IN EVERY DIMENSION.
          </div>
          <div className="hero-composition">
            <div className="hero-copy">
              <h1>
                Aleem
                <br />
                Siddique<span className="name-stop">.</span>
              </h1>
              <p className="hero-positioning">
                Engineer. Builder.
                <br />
                <span>Perpetually curious.</span>
              </p>
              <p className="hero-description">
                Building systems, experiments
                <br /> and experiences.
              </p>
            </div>
            <div className="hero-object">
              <div className="core-object-anchor" data-core-anchor>
                <div className="hero-static-core">
                  <CoreFallback />
                </div>
              </div>
              <div className="object-label mono">
                <span>AS—01 / THE COMPUTE CORE</span>
                <span className="object-label-line" />
                <span>FORM FOLLOWS CURIOSITY</span>
              </div>
              <button
                id="core-toggle"
                className="core-toggle mono"
                aria-expanded={expanded}
                aria-controls="core-notes"
                onClick={toggleCore}
              >
                <span aria-hidden="true">{expanded ? "−" : "+"}</span>
                {expanded ? "Assemble core" : "Look inside the core"}
              </button>
              <div
                id="core-notes"
                className="core-notes mono"
                hidden={!expanded}
              >
                ONE OBJECT. THREE DISCIPLINES.
                <br />
                HARDWARE / INTELLIGENCE / INTERACTION.
              </div>
            </div>
          </div>
          <div className="hero-bottom">
            <a href="#statement" className="scroll-invitation mono">
              <span className="scroll-line" />
              SCROLL TO EXPLORE <Arrow />
            </a>
            <span className="mono hero-coordinate">
              HARDWARE ↔ SOFTWARE ↔ PEOPLE
            </span>
            <span className="mono hero-year">SELECTED WORK / 2026</span>
          </div>
        </section>
        <section id="statement" data-chapter="1" className="statement chapter">
          <ChapterLabel number="01">A connected perspective</ChapterLabel>
          <div className="statement-grid">
            <div>
              <h2>
                {profile.statement.split("tangible.")[0]}
                <span className="serif-word">tangible.</span>
              </h2>
              <p>{profile.introduction}</p>
              <a className="text-link" href="#work">
                See what that looks like <Arrow />
              </a>
            </div>
            <div
              className="statement-object"
              data-core-anchor
              aria-hidden="true"
            />
          </div>
          <div className="discipline-strip mono">
            <span>01 / PHYSICAL</span>
            <span>02 / INTELLIGENT</span>
            <span>03 / INTERACTIVE</span>
          </div>
        </section>
        <section id="journey" data-chapter="2" className="journey chapter">
          <div className="section-top">
            <ChapterLabel number="02">Engineering journey</ChapterLabel>
            <span className="mono quiet">THE LAYERS BEHIND THE WORK.</span>
          </div>
          <div className="journey-grid">
            <div>
              <h2>
                Curiosity.
                <br />
                Built over time.
              </h2>
              <div className="timeline">
                {careerMilestones.map((item) => (
                  <article className="milestone" key={item.year}>
                    <span className="milestone-year mono">{item.year}</span>
                    <div>
                      <h3>{item.title}</h3>
                      <p className="milestone-role mono">{item.role}</p>
                      <p>{item.description}</p>
                      <a
                        href={item.link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="milestone-link"
                      >
                        {item.link.label} <Arrow diagonal />
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </div>
            <aside className="journey-aside">
              <div
                className="journey-object"
                data-core-anchor
                aria-hidden="true"
              />
              <div className="journey-figure-note mono">
                EXPLORING THE LAYERS
                <br />
                <span>Each system has a story underneath.</span>
              </div>
            </aside>
          </div>
        </section>
        <section
          id="work"
          className="work chapter"
          data-chapter="3"
          data-project="0"
        >
          <div className="section-top">
            <ChapterLabel number="03">Selected work</ChapterLabel>
            <span className="mono quiet">
              FOUR SYSTEMS. DIFFERENT CONSTRAINTS.
            </span>
          </div>
          <div className="work-heading">
            <h2>
              Built to do
              <br />
              <span className="muted">something.</span>
            </h2>
            <p>
              A closer look at the problems,
              <br />
              the mechanisms, and what came out of them.
            </p>
          </div>
          <nav className="work-index mono" aria-label="Selected projects">
            {featuredProjects.map((project, index) => (
              <a href={`#project-${project.id}`} key={project.id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {project.title}
                <Arrow />
              </a>
            ))}
          </nav>
        </section>
        {featuredProjects.map((project, index) => (
          <article
            key={project.id}
            id={`project-${project.id}`}
            className="project chapter"
            data-chapter="3"
            data-project={index}
            data-nav="work"
          >
            <div className="project-row">
              <ProjectVisual project={project} index={index} />
              <div className="project-copy">
                <div className="project-eyebrow mono">
                  <span>{project.eyebrow}</span>
                  <span>{project.year}</span>
                </div>
                <h3>{project.title}</h3>
                <p className="project-summary">{project.summary}</p>
                <p>
                  {project.context} {project.solution}
                </p>
                <div className="project-ownership">
                  <h4 className="mono">MY CONTRIBUTION</h4>
                  <p>{project.contribution}</p>
                </div>
                <div className="project-evidence">
                  <div>
                    <h4 className="mono">THE CONSTRAINT</h4>
                    <p>{project.challenge}</p>
                  </div>
                  <div>
                    <h4 className="mono">THE RESULT</h4>
                    <p>{project.result}</p>
                  </div>
                </div>
                <details className="contribution">
                  <summary>
                    Technical notes <span aria-hidden="true">+</span>
                  </summary>
                  <p>{projectNotes[project.id]}</p>
                </details>
                <ul
                  className="stack-list"
                  aria-label={`${project.title} technologies`}
                >
                  {project.stack.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <div className="project-links">
                  {project.links.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="text-link"
                    >
                      {link.label} <Arrow diagonal />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </article>
        ))}
        <section id="perspective" className="perspective chapter">
          <ChapterLabel number="↳">The working toolkit</ChapterLabel>
          <div className="perspective-heading">
            <h2>
              Across the stack.
              <br />
              Close to the problem.
            </h2>
            <p>
              The tools change. Understanding the constraints,
              <br className="desktop-break" /> making things work, and making
              them clear don’t.
            </p>
          </div>
          <div className="technical-areas">
            {technicalAreas.map((area, index) => (
              <div key={area.title}>
                <span className="mono">0{index + 1}</span>
                <h3>{area.title}</h3>
                <p>{area.detail}</p>
              </div>
            ))}
          </div>
        </section>
        <Playground />
        <section id="about" className="about chapter" data-chapter="5">
          <ChapterLabel number="05">Behind the systems</ChapterLabel>
          <div className="about-grid">
            <div className="about-title">
              <h2>
                An engineer.
                <br />
                <span className="muted">Still a tinkerer.</span>
              </h2>
              <div className="about-core" data-core-anchor aria-hidden="true" />
            </div>
            <div className="about-copy">
              <p className="about-lead">
                Good engineering starts
                <br />
                with a better question.
              </p>
              <p>{profile.about}</p>
              <p className="about-degree">{profile.qualification}</p>
              <div className="person-note">
                <img
                  src="/portfolio-assets/media/aleem.webp"
                  alt="Aleem Siddique smiling at a café"
                  loading="lazy"
                  width="750"
                  height="750"
                />
                <span className="mono">
                  ALEEM SIDDIQUE
                  <br />
                  <span>ALSO KNOWN AS A1E3M / SEABOIII</span>
                </span>
              </div>
            </div>
          </div>
        </section>
        <section id="contact" className="contact chapter" data-chapter="6">
          <div className="section-top">
            <ChapterLabel number="06">Make a connection</ChapterLabel>
            <span className="mono quiet">
              GOOD THINGS START WITH A CONVERSATION.
            </span>
          </div>
          <div className="contact-grid">
            <div>
              <h2>
                Have something
                <br />
                <span>interesting</span>
                <br />
                to build<span className="contact-question">?</span>
              </h2>
              <a className="contact-email" href={contactLinks[0].href}>
                Let’s talk <Arrow diagonal />
              </a>
            </div>
            <div className="contact-core" data-core-anchor aria-hidden="true" />
          </div>
          <div className="contact-links">
            {contactLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target={link.href.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
              >
                {link.label} <Arrow diagonal />
              </a>
            ))}
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <a href="#hero" className="footer-identity">
          <Mark />
          <span>ALEEM SIDDIQUE</span>
        </a>
        <span className="mono">
          DESIGNED TO BE UNDERSTOOD.
          <br />
          BUILT TO BE EXPLORED.
        </span>
        <a href="#hero" className="back-top mono">
          BACK TO TOP <span aria-hidden="true">↑</span>
        </a>
      </footer>
    </>
  );
}
