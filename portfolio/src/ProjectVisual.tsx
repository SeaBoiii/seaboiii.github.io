import type { FeaturedProject } from "./content";
import { useState } from "react";

const nodes = [
  [150, 138],
  [150, 228],
  [150, 318],
  [320, 94],
  [320, 183],
  [320, 273],
  [320, 362],
  [490, 145],
  [490, 245],
  [490, 345],
];
function NeuralFigure() {
  return (
    <svg viewBox="0 0 640 450" aria-hidden="true" className="neural-figure">
      <g stroke="#899b73" strokeWidth="1" opacity=".22">
        {nodes
          .slice(0, 3)
          .flatMap((a, i) =>
            nodes
              .slice(3, 7)
              .map((b, j) => <path key={`${i}-${j}`} d={`M${a}L${b}`} />),
          )}
        {nodes
          .slice(3, 7)
          .flatMap((a, i) =>
            nodes
              .slice(7)
              .map((b, j) => <path key={`b${i}-${j}`} d={`M${a}L${b}`} />),
          )}
      </g>
      <g fill="none" stroke="#c3e85b" strokeWidth="2">
        <path d="M150 228 320 183 490 245" />
        <path d="M150 228 320 273 490 245" opacity=".45" />
      </g>
      {nodes.map(([x, y], i) => (
        <g key={i}>
          <circle
            cx={x}
            cy={y}
            r={i === 1 || i === 4 || i === 8 ? 16 : 9}
            fill={i === 1 || i === 4 || i === 8 ? "#c3e85b" : "#34412d"}
          />
          <circle
            cx={x}
            cy={y}
            r={i === 1 || i === 4 || i === 8 ? 25 : 16}
            fill="none"
            stroke="#738763"
            strokeWidth="1"
          />
        </g>
      ))}
      <g fill="#9aa991" fontSize="11" fontFamily="monospace" letterSpacing="2">
        <text x="113" y="418">
          INPUT
        </text>
        <text x="281" y="418">
          LEARNING
        </text>
        <text x="465" y="418">
          OUTPUT
        </text>
      </g>
    </svg>
  );
}
function RoverFigure() {
  return (
    <svg viewBox="0 0 640 450" aria-hidden="true" className="rover-figure">
      <defs>
        <pattern
          id="rover-grid"
          width="48"
          height="48"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M48 0H0V48"
            fill="none"
            stroke="#65756c"
            strokeWidth="1"
            opacity=".3"
          />
        </pattern>
      </defs>
      <g transform="translate(90 52) rotate(-8 220 170)">
        <rect x="0" y="0" width="456" height="336" fill="url(#rover-grid)" />
        <g fill="#46534a" stroke="#657469">
          <rect x="96" y="48" width="96" height="48" />
          <rect x="240" y="144" width="144" height="48" />
          <rect x="48" y="240" width="96" height="48" />
        </g>
        <path
          d="M24 24H216V120H408V312"
          stroke="#c3e85b"
          strokeWidth="3"
          fill="none"
          strokeDasharray="5 7"
        />
        <circle cx="408" cy="312" r="14" fill="none" stroke="#c3e85b" />
        <circle cx="408" cy="312" r="4" fill="#c3e85b" />
        <g transform="translate(216 120)">
          <circle r="55" fill="#c3e85b" opacity=".07" />
          <path
            d="M0 0 55-32A64 64 0 0 1 55 32Z"
            fill="#c3e85b"
            opacity=".13"
          />
          <rect x="-20" y="-15" width="40" height="30" rx="7" fill="#c5d0bd" />
          <rect x="-14" y="-21" width="10" height="5" rx="2" fill="#171e19" />
          <rect x="4" y="-21" width="10" height="5" rx="2" fill="#171e19" />
          <rect x="-14" y="16" width="10" height="5" rx="2" fill="#171e19" />
          <rect x="4" y="16" width="10" height="5" rx="2" fill="#171e19" />
          <path d="m7-5 8 5-8 5Z" fill="#34412a" />
        </g>
      </g>
    </svg>
  );
}
function IcmFigure() {
  return (
    <svg viewBox="0 0 640 450" aria-hidden="true" className="icm-figure">
      <g transform="translate(320 206)">
        <circle r="128" fill="none" stroke="#6f7870" strokeWidth="1" />
        {Array.from({ length: 36 }, (_, i) => (
          <line
            key={i}
            x1="0"
            y1="-128"
            x2="0"
            y2={i % 3 === 0 ? -117 : -123}
            stroke="#98a18d"
            transform={`rotate(${i * 10})`}
          />
        ))}
        <circle r="101" fill="#1d231e" stroke="#667160" strokeWidth="8" />
        <circle r="79" fill="#121814" stroke="#a5b299" strokeWidth="2" />
        <circle r="68" fill="none" stroke="#4e5d46" strokeWidth="12" />
        {Array.from({ length: 7 }, (_, i) => (
          <path
            key={i}
            d="M0-54 41-34 34 0 0 0Z"
            fill="#64765a"
            stroke="#202c22"
            transform={`rotate(${(i * 360) / 7})`}
          />
        ))}
        <circle r="26" fill="#151c17" />
        <circle r="16" fill="#c3e85b" fillOpacity=".16" />
        <path
          d="M-146 38h-44v-66h53M142 15h58v-40h-51"
          fill="none"
          stroke="#b1b8a8"
          strokeWidth="2"
        />
        <rect
          x="-204"
          y="-24"
          width="29"
          height="58"
          rx="3"
          fill="#343e30"
          stroke="#87957b"
        />
        <rect
          x="181"
          y="-26"
          width="34"
          height="44"
          rx="3"
          fill="#343e30"
          stroke="#87957b"
        />
        <path
          d="M-193 35v85h386V20"
          stroke="#c3e85b"
          strokeWidth="1.5"
          fill="none"
        />
        <path d="M-9-155h18M0-164v18M-9 154h18M0 146v18" stroke="#a4b493" />
      </g>
      <g fill="#b0bba5" fontSize="12" fontFamily="monospace">
        <text x="102" y="378">
          FOCUS
        </text>
        <text x="275" y="378">
          SHUTTER
        </text>
        <text x="480" y="378">
          ZOOM
        </text>
      </g>
    </svg>
  );
}

export default function ProjectVisual({
  project,
  index,
}: {
  project: FeaturedProject;
  index: number;
}) {
  const [diagram, setDiagram] = useState(false);
  return (
    <figure className={`project-visual visual-${project.visual}`}>
      <div className="figure-top mono">
        <span>FIG. {String(index + 1).padStart(2, "0")}</span>
        <span>
          {project.visual === "classility"
            ? "LIVE INTERFACE"
            : project.visual === "icm" && !diagram
              ? "PHYSICAL PROTOTYPE"
              : "SYSTEM STUDY"}
        </span>
        <span>↗</span>
      </div>
      {project.visual === "ai" && (
        <>
          <div className="visual-title">
            Small model.
            <br />
            <em>Big questions.</em>
          </div>
          <NeuralFigure />
          <div className="visual-footer mono">
            <span>DRAW → TEACH → INFER</span>
            <span>LOCAL / OFFLINE</span>
          </div>
        </>
      )}
      {project.visual === "robotics" && (
        <>
          <div className="visual-title">
            A decision.
            <br />
            <em>A direction.</em>
          </div>
          <RoverFigure />
          <div className="visual-footer mono">
            <span>SENSE → THINK → MOVE</span>
            <span>SIMULATION</span>
          </div>
        </>
      )}
      {project.visual === "icm" && (
        <>
          <div className="visual-title">
            Code meets
            <br />
            <em>the physical.</em>
          </div>
          {diagram ? (
            <IcmFigure />
          ) : (
            <div className="icm-photo">
              <img
                src="/portfolio-assets/media/icm-prototype.webp"
                alt="ICM Buddy’s DSLR lens prototype with paired motor mechanisms, wiring and handheld controls"
                loading="lazy"
                width="654"
                height="368"
              />
            </div>
          )}
          <div
            className="visual-switch"
            role="group"
            aria-label="ICM Buddy visual"
          >
            <button aria-pressed={!diagram} onClick={() => setDiagram(false)}>
              Prototype
            </button>
            <button aria-pressed={diagram} onClick={() => setDiagram(true)}>
              Diagram
            </button>
          </div>
        </>
      )}
      {project.visual === "classility" && (
        <>
          <div className="classility-mark">
            C<span>✧</span>
          </div>
          <div className="classility-window">
            <img
              src="/portfolio-assets/media/classility.webp"
              alt="Classility’s Hall of Archetypes entrance with illustrated double doors"
              loading="lazy"
              width="1366"
              height="768"
            />
          </div>
          <div className="visual-footer mono">
            <span>TWENTY ARCHETYPES</span>
            <span>INTERACTIVE IDENTITY</span>
          </div>
        </>
      )}
      <div
        data-core-anchor
        className="project-core-anchor"
        aria-hidden="true"
      />
      <figcaption className="sr-only">
        {project.visual === "classility"
          ? "Screenshot of the real Classility experience."
          : project.visual === "icm" && !diagram
            ? "Photograph of the working ICM Buddy prototype."
            : `Illustrated system study for ${project.title}; not a screenshot.`}
      </figcaption>
    </figure>
  );
}
