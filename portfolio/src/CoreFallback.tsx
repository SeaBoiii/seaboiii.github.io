import { useId } from "react";

/** Authored exploded view: the complete idea survives without motion or WebGL. */
export default function CoreFallback() {
  const id = useId();
  return (
    <svg viewBox="0 0 600 600" className="core-fallback" aria-hidden="true">
      <defs>
        <linearGradient id={`metal-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#f2f4f5" />
          <stop offset=".45" stopColor="#a6b0be" />
          <stop offset="1" stopColor="#e3e8ed" />
        </linearGradient>
        <linearGradient id={`die-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#f67957" />
          <stop offset="1" stopColor="#b12e1c" />
        </linearGradient>
        <linearGradient id={`board-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#5576ff" />
          <stop offset="1" stopColor="#1e3bba" />
        </linearGradient>
        <radialGradient id={`shadow-${id}`}>
          <stop stopColor="#080a12" stopOpacity=".4" />
          <stop offset="1" stopColor="#080a12" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="303" cy="500" rx="230" ry="70" fill={`url(#shadow-${id})`} />
      <g fill="none" stroke="#7290fa" strokeWidth="1.5" opacity=".8">
        <path d="M106 405H49v-42h-23M489 405h53v-42h33M252 495v37h-67M375 474v51h65" />
      </g>
      <g fill="#d0f46b">
        <rect x="19" y="357" width="11" height="11" rx="2" />
        <rect x="570" y="357" width="11" height="11" rx="2" />
        <rect x="178" y="528" width="11" height="11" rx="2" />
        <rect x="438" y="520" width="11" height="11" rx="2" />
      </g>
      <path d="M88 389 288 278 510 400 310 515Z" fill={`url(#board-${id})`} />
      <path d="m88 389 0 23 222 124 0-21Z" fill="#142565" />
      <path d="m310 515 200-115 0 23-200 113Z" fill="#334cad" />
      <g fill="#d0f46b">
        {Array.from({ length: 14 }, (_, i) => (
          <path
            key={i}
            d={`m${107 + i * 14} ${409 + i * 7.6} 0 11 5 3 0-11Z`}
          />
        ))}
      </g>
      <g fill="none" stroke="#9cb1ff" strokeWidth="2" opacity=".8">
        <path d="m148 386 130-73 167 92-140 81Z" />
        <path d="m160 406 56-31 101 57 92-53M205 433l35-20 65 36 64-37" />
      </g>
      <g
        fill="none"
        stroke="#a9b3c8"
        strokeWidth="1"
        strokeDasharray="3 6"
        opacity=".65"
      >
        <path d="M116 399V154M484 409V164M295 299V54M305 512V267" />
      </g>
      <path
        d="M111 311 291 209 490 320 310 424Z"
        fill={`url(#metal-${id})`}
        fillRule="evenodd"
      />
      <path d="m111 311 0 14 199 112 0-13Z" fill="#828d9d" />
      <path d="m310 424 180-104 0 13-180 104Z" fill="#b5c1cf" />
      <path d="M200 310 290 259 400 320 310 372Z" fill="#344b88" />
      <g fill="#566278">
        <circle cx="140" cy="309" r="3" />
        <circle cx="290" cy="229" r="3" />
        <circle cx="461" cy="320" r="3" />
        <circle cx="310" cy="404" r="3" />
      </g>
      <path d="M179 238 292 174 424 247 309 313Z" fill={`url(#die-${id})`} />
      <path d="m179 238 0 20 130 75 0-20Z" fill="#752119" />
      <path d="m309 313 115-66 0 20-115 66Z" fill="#a23b28" />
      <g fill="none" stroke="#ffb099" strokeWidth="1.5" opacity=".9">
        <path d="m207 238 31-18 42 23-31 18Z m48-27 31-18 42 23-31 18Z m-3 53 31-18 42 23-31 18Z m48-27 31-18 42 23-31 18Z" />
        <path d="m209 252 84 47M283 202l108 60" />
      </g>
      <g fill="none" stroke="#d0f46b" strokeWidth="2">
        <path d="M237 267 351 213M218 229 370 273" />
      </g>
      <path
        d="M111 148 291 46 490 157 310 261Z"
        fill="#b8c6d4"
        fillOpacity=".15"
        stroke="#d5dfed"
        strokeWidth="1.5"
      />
      <path d="m111 148 0 6 199 112 0-5Z" fill="#bac8d9" fillOpacity=".45" />
      <path
        d="m310 261 180-104 0 6-180 104Z"
        fill="#dce6f4"
        fillOpacity=".55"
      />
      <text
        x="291"
        y="164"
        textAnchor="middle"
        fill="#e9eef8"
        fontSize="16"
        fontFamily="monospace"
        letterSpacing="2"
        transform="rotate(29 291 164)"
      >
        AS / CORE 01
      </text>
    </svg>
  );
}
