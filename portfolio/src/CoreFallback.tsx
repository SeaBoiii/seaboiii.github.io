import { useId } from "react";
/** The same layered identity remains available without a graphics context. */
export default function CoreFallback() {
  const id = useId();
  return (
    <svg viewBox="0 0 600 600" className="core-fallback" aria-hidden="true">
      <defs>
        <linearGradient id={`metal-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#e8ebe3" />
          <stop offset=".45" stopColor="#9ca599" />
          <stop offset="1" stopColor="#dce0d6" />
        </linearGradient>
        <linearGradient id={`die-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#454d41" />
          <stop offset="1" stopColor="#1b221d" />
        </linearGradient>
        <radialGradient id={`shadow-${id}`}>
          <stop stopColor="#222b20" stopOpacity=".19" />
          <stop offset="1" stopColor="#222b20" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="305" cy="442" rx="220" ry="82" fill={`url(#shadow-${id})`} />
      <path d="M89 320 289 209 510 330 310 450Z" fill="#222b25" />
      <path d="m89 320 0 31 221 120 0-21Z" fill="#141b16" />
      <path d="m310 450 200-120 0 31-200 110Z" fill="#505a4b" />
      <g fill="#afb899">
        {Array.from({ length: 14 }, (_, i) => (
          <path
            key={i}
            d={`m${107 + i * 14} ${340 + i * 7.6} 0 13 5 3 0-13Z`}
          />
        ))}
      </g>
      <path d="M111 293 291 191 490 302 310 406Z" fill={`url(#metal-${id})`} />
      <path d="m111 293 0 15 199 111 0-13Z" fill="#8b9485" />
      <path d="m310 406 180-104 0 13-180 104Z" fill="#ccd2c4" />
      <path
        d="M154 255 292 178 446 263 308 342Z"
        fill={`url(#die-${id})`}
        stroke="#798271"
        strokeWidth="2"
      />
      <path d="m154 255 0 25 154 85 0-23Z" fill="#141b16" />
      <path d="m308 342 138-79 0 25-138 77Z" fill="#313b2b" />
      <g fill="none" stroke="#c3e85b" strokeWidth="2" opacity=".85">
        <path d="m197 256 55-31 56 31 53-30" />
        <path d="m219 272 36-21 51 28 67-39" />
        <path d="m242 285 27-15 38 21 58-33" />
        <path d="m180 245 22-13 42 23" />
      </g>
      <path
        d="M130 234 291 142 468 240 306 334Z"
        fill="#d9e7ce"
        fillOpacity=".12"
        stroke="#8a9780"
        strokeOpacity=".7"
      />
      <g fill="#c3e85b">
        <circle cx="252" cy="225" r="3" />
        <circle cx="361" cy="226" r="3" />
        <circle cx="269" cy="270" r="3" />
      </g>
      <text
        x="288"
        y="260"
        textAnchor="middle"
        fill="#eff3e8"
        fontSize="15"
        fontFamily="monospace"
        transform="rotate(29 288 260)"
      >
        AS / 01
      </text>
    </svg>
  );
}
