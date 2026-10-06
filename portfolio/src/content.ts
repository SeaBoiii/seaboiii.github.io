// Single source of truth for all portfolio copy.
// Edit this file to update the site; components only render what is defined here.

export const profile = {
  name: "Aleem",
  handle: "A1E3M",
  role: "Product Development Engineer",
  company: "AMD",
  location: "Singapore",
  email: "seaboiiigamer@gmail.com",
  tagline: "I bring silicon to life, then build the software around it.",
  intro:
    "Product Development Engineer at AMD, taking new products through bring-up and keeping high-volume console silicon healthy. Outside the fab data, I write firmware, AI assistants, and web platforms.",
  statement:
    "From bringing up new silicon and sustaining the chips inside PlayStation 5, to shipping firmware, conversational AI and full web platforms, I engineer systems end to end.",
  links: {
    linkedin: "https://www.linkedin.com/in/a1e3m/",
    github: "https://github.com/SeaBoiii/",
    telegram: "https://t.me/a1e3m",
  },
};

export const heroSpecs = [
  { k: "Current", v: "PDE @ AMD" },
  { k: "Experience", v: "4 yrs · 2022 to now" },
  { k: "Award", v: "2nd · AMD Asia Tech Showcase '24" },
  { k: "Education", v: "NTU B.Eng Comp Eng" },
];

/** The four physical layers of the 3D chip package, top to bottom. */
export const layers = [
  {
    id: "lid",
    code: "L1 / IHS",
    part: "Integrated heat spreader",
    title: "Product engineering",
    body: "At AMD I take new products from first silicon through bring-up, and sustain mature high-volume parts, including the SoCs inside PS5 and PS5 Pro. The goal is always the same: raise quality and improve yield.",
    proof: "4 yrs at AMD · Asia Tech Showcase, 2nd place 2024",
  },
  {
    id: "die",
    code: "L2 / DIE",
    part: "Compute chiplets",
    title: "AI & software logic",
    body: "Built the language-understanding flows behind LYON 2.0, NTU's virtual assistant made with Google Cloud and OniGroup, which guided 6,000+ freshmen through a fully virtual orientation.",
    proof: "Python · NLP · Google Cloud",
  },
  {
    id: "substrate",
    code: "L3 / SUBSTRATE",
    part: "Interconnect & routing",
    title: "Distributed systems",
    body: "As sole systems programmer of the Probow Network, I designed Java plugin architecture, low-latency networking and state sync for a multiplayer cluster that peaked at 400 concurrent players.",
    proof: "Java · OODP · 400 CCU peak",
  },
  {
    id: "bga",
    code: "L4 / BGA",
    part: "Board interface",
    title: "Embedded firmware",
    body: "ICM Buddy, my final-year project, drives a camera's zoom and focus rings with stepper motors during long exposures. Motion profiles are written in bare-metal C/C++ to fit inside an AtMega's tiny memory.",
    proof: "C/C++ · AtMega · Motion control",
  },
] as const;

export const amd = {
  period: "2022 to present",
  title: "Product Development Engineer",
  org: "AMD · Singapore",
  summary:
    "I own products across their lifecycle: new-product bring-up on one side, sustaining long-running, high-volume silicon on the other, with quality and yield as the constant measures.",
  highlights: [
    {
      k: "New product bring-up",
      v: "Taking new silicon from first samples to production readiness.",
    },
    {
      k: "Sustaining engineering",
      v: "Keeping mature high-volume products healthy, including PlayStation 5 and PS5 Pro.",
    },
    {
      k: "Quality × yield",
      v: "Data-driven improvements that raise outgoing quality while improving yield.",
    },
    {
      k: "Asia Tech Showcase",
      v: "Presented my engineering projects at AMD's Asia Tech Showcase and won 2nd place in 2024.",
    },
  ],
  stats: [
    { n: "4", u: "yrs", l: "At AMD" },
    { n: "2", u: "nd", l: "Asia Tech Showcase 2024" },
    { n: "PS5", u: "", l: "& PS5 Pro sustained" },
  ],
};

export type CaseStudy = {
  id: string;
  index: string;
  tag: string;
  title: string;
  summary: string;
  detail: string;
  metrics: { n: string; l: string }[];
  stack: string[];
  image: string;
  proof?: { src: string; alt: string };
  link?: { href: string; label: string };
};

export const caseStudies: CaseStudy[] = [
  {
    id: "icm",
    index: "01",
    tag: "Final-year project · Hardware",
    title: "ICM Buddy",
    summary:
      "An automated controller for Intentional Camera Movement photography. It moves zoom and focus rings precisely during a long exposure.",
    detail:
      "I came in with zero hardware background. I designed the gearing, wired the stepper drivers, and wrote interpolation and acceleration profiles in C/C++ that fit within AtMega memory while staying real-time.",
    metrics: [
      { n: "AtMega", l: "MCU" },
      { n: "C/C++", l: "Firmware" },
      { n: "2-axis", l: "Zoom + focus" },
    ],
    stack: ["C/C++", "Arduino", "Stepper control", "CAD"],
    image: "assets/gen/case-icm.webp",
    proof: { src: "assets/real/icm_buddy.gif", alt: "ICM Buddy rotating a lens during a test" },
  },
  {
    id: "lyon",
    index: "02",
    tag: "Conversational AI · NTU × Google Cloud",
    title: "LYON 2.0",
    summary:
      "NTU's virtual assistant for freshmen. During COVID it replaced the in-person orientation with guided, conversational onboarding.",
    detail:
      "Built with OniGroup on Google Cloud. I worked on the natural-language understanding and the decision flows that routed students to campus resources, schedules and virtual events.",
    metrics: [
      { n: "6,000+", l: "Students served" },
      { n: "GCP", l: "Infrastructure" },
      { n: "NLU", l: "Intent flows" },
    ],
    stack: ["Python", "NLP", "Google Cloud", "Dialogue design"],
    image: "assets/gen/case-lyon.webp",
    proof: { src: "assets/real/ntu-lyon.jpg", alt: "NTU, OniGroup and Google Cloud partnership" },
  },
  {
    id: "probow",
    index: "03",
    tag: "Distributed systems · Java",
    title: "Probow Network",
    summary:
      "It started as a hobby server in 2013 and grew into a multiplayer network that peaked at 400 concurrent players.",
    detail:
      "As the sole programmer, I wrote custom Java plugins using object-oriented design, tuned networking for low latency, and handled database state sync, server hardware and sponsor operations.",
    metrics: [
      { n: "400", l: "Peak CCU" },
      { n: "100%", l: "Sole programmer" },
      { n: "2013", l: "Founded" },
    ],
    stack: ["Java", "OODP", "Networking", "SQL", "Linux"],
    image: "assets/gen/case-probow.webp",
    proof: { src: "assets/real/probow.png", alt: "Probow Network logo" },
  },
  {
    id: "novel",
    index: "04",
    tag: "Full-stack platform · Content engineering",
    title: "Novel Platform",
    summary:
      "A publishing pipeline for my 50 serialised novels: Python authoring tools, an automated image pipeline and a statically exported Next.js reader.",
    detail:
      "The 5,800-line Tkinter wizard converts DOCX and rich-text paste into front-mattered Markdown. A Python optimiser produces 320/640/960 px JPG and WebP variants, and GitHub Actions builds the TypeScript reader and deploys it to Pages.",
    metrics: [
      { n: "50", l: "Novels" },
      { n: "818", l: "Chapters" },
      { n: "6×", l: "Image variants" },
    ],
    stack: ["Next.js", "TypeScript", "Tailwind", "Python", "Tkinter", "GitHub Actions"],
    image: "assets/gen/case-novel.webp",
    link: { href: "/novel/", label: "Open the library" },
  },
];

export const timeline = [
  { year: "2013", title: "Probow Network", body: "Started writing Java server plugins. It grew to 400 concurrent players." },
  { year: "2020", title: "LYON 2.0", body: "Worked on NTU's virtual assistant with Google Cloud and OniGroup." },
  { year: "2021", title: "ICM Buddy", body: "Final-year project: motorised lens automation in C/C++." },
  { year: "2022", title: "NTU graduate", body: "B.Eng Computer Engineering, specialising in AI and Cyber Security." },
  { year: "2022", title: "Joined AMD", body: "Product Development Engineer: bring-up, sustaining, quality and yield." },
  { year: "2024", title: "Asia Tech Showcase", body: "2nd place at AMD's Asia Tech Showcase." },
  { year: "Now", title: "Still building", body: "Silicon by day; firmware, tools and web platforms by night." },
];

export type HubApp = {
  name: string;
  slug: string;
  category: "interactive" | "games" | "stories";
  tag: string;
  desc: string;
  repo: string;
};

export const hubApps: HubApp[] = [
  { name: "Potionality", slug: "potionality", category: "interactive", tag: "Quiz system", desc: "Reflective personality test with weighted scoring across eight elemental forces.", repo: "https://github.com/SeaBoiii/potionality" },
  { name: "Classility", slug: "classility", category: "interactive", tag: "RPG identity", desc: "Algorithmic RPG class questionnaire with tactile animations.", repo: "https://github.com/SeaBoiii/classility" },
  { name: "Novels Hub", slug: "novel", category: "stories", tag: "Reader · CMS", desc: "Markdown-driven web novel reader with chapter navigation and an image pipeline.", repo: "https://github.com/SeaBoiii/seaboiii.github.io" },
  { name: "Age of War", slug: "age_of_war", category: "games", tag: "Strategy", desc: "Zero-dependency remake of the classic evolutionary base-defence game.", repo: "https://github.com/SeaBoiii/age_of_war" },
  { name: "Nizam", slug: "nizam", category: "games", tag: "Tactics", desc: "Bannerlord-inspired realm sim with recruitment, territory and unit combat.", repo: "https://github.com/SeaBoiii/nizam" },
  { name: "Visual Novel", slug: "visual_novel", category: "stories", tag: "Branching engine", desc: "Narrative engine where choices shift trust, tension and outcomes.", repo: "https://github.com/SeaBoiii/visual_novel" },
  { name: "MMORPG", slug: "mmorpg", category: "games", tag: "Bullet hell", desc: "\"Wanted an MMO, got Touhou.\" Canvas-driven particle shooter.", repo: "https://github.com/SeaBoiii/mmorpg" },
  { name: "Tetris", slug: "tetris", category: "games", tag: "Arcade", desc: "Lock delay, wall kicks, ghost pieces and level acceleration.", repo: "https://github.com/SeaBoiii/tetris" },
  { name: "Wordle", slug: "wordle", category: "games", tag: "Word puzzle", desc: "Daily five-letter puzzle with letter-state evaluation and stats.", repo: "https://github.com/SeaBoiii/wordle" },
];

export const specs: { group: string; rows: { k: string; v: string }[] }[] = [
  {
    group: "Silicon & product",
    rows: [
      { k: "Lifecycle", v: "New product bring-up · Sustaining engineering" },
      { k: "Focus", v: "Quality improvement · Yield improvement" },
      { k: "Products", v: "High-volume console SoCs incl. PS5 / PS5 Pro" },
    ],
  },
  {
    group: "Languages",
    rows: [
      { k: "Systems", v: "C · C++ · Java" },
      { k: "Data & tooling", v: "Python" },
      { k: "Web", v: "TypeScript · JavaScript · HTML · CSS" },
    ],
  },
  {
    group: "Frameworks",
    rows: [
      { k: "Front end", v: "React · Next.js · Tailwind" },
      { k: "3D / motion", v: "Three.js · React Three Fiber · GSAP" },
      { k: "Desktop", v: "Tkinter · Pygame" },
    ],
  },
  {
    group: "Hardware",
    rows: [
      { k: "MCU", v: "Arduino · AtMega (AVR)" },
      { k: "Control", v: "Stepper motion profiles · Real-time firmware" },
    ],
  },
  {
    group: "Cloud & delivery",
    rows: [
      { k: "Cloud", v: "Google Cloud" },
      { k: "CI/CD", v: "GitHub Actions · GitHub Pages" },
      { k: "Ops", v: "Linux game servers · SQL state sync" },
    ],
  },
  {
    group: "Education",
    rows: [
      { k: "Degree", v: "B.Eng Computer Engineering, NTU (2022)" },
      { k: "Specialisation", v: "Artificial Intelligence · Cyber Security" },
    ],
  },
];

export const nav = [
  { id: "layers", label: "Layers" },
  { id: "amd", label: "AMD" },
  { id: "work", label: "Work" },
  { id: "apps", label: "Apps" },
  { id: "specs", label: "Specs" },
  { id: "contact", label: "Contact" },
];

