export interface ContentLink {
  label: string;
  href: string;
}

export type FeaturedProjectId =
  "tiny-ai" | "rover" | "icm-buddy" | "classility";
export type AmdProjectId =
  "amd_buildapc" | "amd_personality" | "amd_robotics" | "amd_trainatinyai";

export interface AmdProject {
  id: AmdProjectId;
  title: string;
  category: string;
  description: string;
  figure: string;
  figureLabel: string;
  source: string;
  live?: string;
  caseStudyId?: FeaturedProjectId;
}

export interface FeaturedProject {
  id: FeaturedProjectId;
  title: string;
  eyebrow: string;
  summary: string;
  context: string;
  solution: string;
  contribution: string;
  challenge: string;
  result: string;
  stack: string[];
  links: ContentLink[];
  year: string;
  visual: "icm" | "ai" | "robotics" | "classility" | "pc";
  collection?: "amd";
  collectionProject?: AmdProjectId;
}

export interface CareerMilestone {
  year: string;
  title: string;
  role: string;
  description: string;
  stack: string[];
  link: ContentLink;
}

export interface PlaygroundProject {
  id: string;
  title: string;
  category: "Interfaces" | "Games" | "Stories";
  description: string;
  href: string;
  code: string;
  image?: string;
  accent: string;
}

export const profile = {
  name: "Aleem Siddique",
  mark: "AS",
  positioning: "Engineer building systems, experiments and experiences.",
  disciplines: "Embedded systems · AI · Web",
  statement: "I make complex systems tangible.",
  introduction:
    "From precise camera motion to AI that learns in the browser, I connect hardware, software and the people using them.",
  about:
    "My first software playground was a Minecraft server. That curiosity grew into computer engineering, camera automation, conversational AI and interactive web systems. I enjoy the whole path: understanding a problem, building the mechanism, and making it feel clear to the person using it.",
  qualification:
    "B.Eng. Computer Engineering, Nanyang Technological University. Specialisations in Artificial Intelligence and Cyber Security.",
  contact: "Have something interesting to build?",
};

export const featuredProjects: FeaturedProject[] = [
  {
    id: "tiny-ai",
    title: "Train a Tiny AI",
    eyebrow: "01 / Browser intelligence",
    summary: "An AI lesson you can draw, teach and test.",
    context:
      "Make machine learning visible to young visitors in a STEM booth, even without an internet connection.",
    solution:
      "A drawing canvas feeds a teachable classifier. A separate ONNX shape model shows how the same task runs on available hardware.",
    contribution:
      "Built the interactive training flow, local inference integration and offline runtime setup.",
    challenge:
      "Detect a usable accelerator, verify it with a warmup, and fall back from NPU to GPU to CPU.",
    result:
      "A self-contained browser experience with live predictions and a visible compute backend.",
    stack: [
      "React",
      "TypeScript",
      "ONNX Runtime Web",
      "WebNN / WebGPU",
      "Python",
    ],
    links: [
      {
        label: "View source",
        href: "https://github.com/SeaBoiii/amd_trainatinyai",
      },
    ],
    year: "2026",
    visual: "ai",
    collection: "amd",
    collectionProject: "amd_trainatinyai",
  },
  {
    id: "rover",
    title: "AI Rover Challenge",
    eyebrow: "02 / Systems in motion",
    summary: "Sense. Think. Move. Understand why.",
    context:
      "Give students a way to explore robotics without needing physical robots or cloud services.",
    solution:
      "A virtual rover combines component trade-offs, an in-browser classifier and ordered control rules across five missions.",
    contribution:
      "Built the simulator, learning workflow and interfaces for inspecting decisions, telemetry and model predictions.",
    challenge:
      "Keep the simulation reproducible and independent of its renderer, with a complete text-grid fallback.",
    result:
      "A browser learning system where students can run, step and replay their designs, then inspect what happened.",
    stack: ["React", "TypeScript", "Phaser", "Zustand", "Vitest / Playwright"],
    links: [
      {
        label: "Explore project",
        href: "https://seaboiii.github.io/amd_robotics/",
      },
      {
        label: "View source",
        href: "https://github.com/SeaBoiii/amd_robotics",
      },
    ],
    year: "2026",
    visual: "robotics",
    collection: "amd",
    collectionProject: "amd_robotics",
  },
  {
    id: "icm-buddy",
    title: "ICM Buddy",
    eyebrow: "03 / Physical precision",
    summary: "Turning camera movement into repeatable expression.",
    context: "Long-exposure lens movements are difficult to reproduce by hand.",
    solution:
      "An Arduino-driven mechanism coordinates focus, zoom and shutter timing using calibrated stepper motors and selectable motion patterns.",
    contribution:
      "Designed and implemented the hardware–software prototype, firmware and on-device controls for my final-year project.",
    challenge:
      "Fit calibration, custom sequences and a usable menu into a memory-constrained ATmega microcontroller.",
    result:
      "A working prototype with documented long-exposure photographs, schematics and reproducible firmware.",
    stack: [
      "C++",
      "Arduino Nano",
      "AccelStepper",
      "TFT / EEPROM",
      "PCB design",
    ],
    links: [
      { label: "View source", href: "https://github.com/SeaBoiii/FYP" },
      {
        label: "Read project report",
        href: "https://github.com/SeaBoiii/FYP/blob/main/.documents/ICM_Buddy_Final_Report.pdf",
      },
    ],
    year: "2022",
    visual: "icm",
  },
  {
    id: "classility",
    title: "Classility",
    eyebrow: "04 / Playful interfaces",
    summary: "A personality profile, with a little fantasy.",
    context:
      "Turn a structured personality quiz into an experience people can explore and share.",
    solution:
      "Weighted dimensions and conditional rules map answers to RPG archetypes, with illustrated profiles and downloadable cards.",
    contribution:
      "Built the quiz flow, scoring system, result presentation and share-card experience.",
    challenge:
      "Keep results deterministic while supporting rich content, protected result routes and PNG exports.",
    result:
      "A live, mobile-friendly quiz with twenty archetypes and individually rendered result cards.",
    stack: ["React", "TypeScript", "Vite", "React Router", "html-to-image"],
    links: [
      {
        label: "Try the experience",
        href: "https://seaboiii.github.io/classility/",
      },
      { label: "View source", href: "https://github.com/SeaBoiii/classility" },
    ],
    year: "2026",
    visual: "classility",
  },
];

export const amdProjects: AmdProject[] = [
  {
    id: "amd_buildapc",
    title: "AMD Chip Challenge",
    category: "Hardware trade-offs",
    description:
      "Choose components within a 900-point budget, run an AI mission test, and see how each part changes the outcome.",
    figure: "900",
    figureLabel: "POINTS TO BUILD WITH",
    source: "https://github.com/SeaBoiii/amd_buildapc",
  },
  {
    id: "amd_personality",
    title: "silicon·self",
    category: "Personality, in silicon",
    description:
      "Twenty questions map four personality dimensions to sixteen silicon-inspired archetypes, with shareable links and downloadable cards.",
    figure: "16",
    figureLabel: "ARCHETYPES TO DISCOVER",
    source: "https://github.com/SeaBoiii/amd_personality",
    live: "https://seaboiii.github.io/amd_personality/",
  },
  {
    id: "amd_robotics",
    title: "AI Rover Challenge",
    category: "Sense. Think. Move.",
    description:
      "Build a virtual rover, train its classifier, and write control rules. Five missions reveal how the whole system behaves.",
    figure: "05",
    figureLabel: "MISSIONS TO WORK THROUGH",
    source: "https://github.com/SeaBoiii/amd_robotics",
    live: "https://seaboiii.github.io/amd_robotics/",
    caseStudyId: "rover",
  },
  {
    id: "amd_trainatinyai",
    title: "Train a Tiny AI",
    category: "Learning, made visible",
    description:
      "Teach a classifier with your drawings, then test new ones. A separate ONNX model makes the available compute backend visible.",
    figure: "DRAW",
    figureLabel: "TEACH → TEST → UNDERSTAND",
    source: "https://github.com/SeaBoiii/amd_trainatinyai",
    caseStudyId: "tiny-ai",
  },
];

export const careerMilestones: CareerMilestone[] = [
  {
    year: "2013",
    title: "A server became a starting point.",
    role: "Minecraft plugins & communities",
    description:
      "Learning Java through custom Minecraft plugins introduced me to the connection between code, servers and a community using them.",
    stack: ["Java", "Minecraft / Bukkit"],
    link: {
      label: "Early plugin work",
      href: "https://github.com/SeaBoiii/PropHunt",
    },
  },
  {
    year: "2020",
    title: "Building for a real campus.",
    role: "Student task-force contributor / Lyon 2.0",
    description:
      "Contributed to NTU’s Lyon 2.0 chatbot initiative with NTU, Google Cloud and OniGroup, helping new students find campus information during virtual orientation.",
    stack: ["Conversational AI", "Google Cloud / Dialogflow"],
    link: {
      label: "NTU project announcement",
      href: "https://www.ntu.edu.sg/news/detail/ntu-singapore-and-google-cloud-develop-new-rapid-response-virtual-assistant-to-help-address-freshmen-queries",
    },
  },
  {
    year: "2022",
    title: "Software crossed into the physical world.",
    role: "Computer engineering / ICM Buddy",
    description:
      "My final-year project brought firmware, electronics and motion control together to automate DSLR lens movement during long-exposure photography.",
    stack: ["C++", "Embedded systems", "Motion control"],
    link: {
      label: "ICM Buddy documentation",
      href: "https://github.com/SeaBoiii/FYP",
    },
  },
  {
    year: "2026",
    title: "Making systems understandable.",
    role: "Current public work / AI, robotics & web",
    description:
      "Recent projects explore offline browser inference, robotics simulation and interactive experiences. The through-line is visible cause and effect: build it, test it, understand it.",
    stack: ["TypeScript", "AI / ML", "Interactive web systems"],
    link: {
      label: "Current public repositories",
      href: "https://github.com/SeaBoiii?tab=repositories",
    },
  },
];

export const playgroundProjects: PlaygroundProject[] = [
  {
    id: "potionality",
    title: "Potionality",
    category: "Interfaces",
    description:
      "Eight dimensions, conditional results and a potion to call your own.",
    href: "https://seaboiii.github.io/potionality/",
    code: "https://github.com/SeaBoiii/potionality",
    image: "/portfolio-assets/media/potionality.webp",
    accent: "sage",
  },
  {
    id: "visual-novel",
    title: "Visual Novel",
    category: "Stories",
    description:
      "Branching stories, relationship state and a visual story editor.",
    href: "https://seaboiii.github.io/visual_novel/",
    code: "https://github.com/SeaBoiii/visual_novel",
    image: "/portfolio-assets/media/visual-novel.webp",
    accent: "rose",
  },
  {
    id: "age-of-war",
    title: "Age of War",
    category: "Games",
    description: "A browser strategy experiment inspired by the classic.",
    href: "https://seaboiii.github.io/age_of_war/",
    code: "https://github.com/SeaBoiii/age_of_war",
    image: "/portfolio-assets/media/age-of-war.webp",
    accent: "amber",
  },
  {
    id: "nizam",
    title: "Nizam",
    category: "Games",
    description: "An experimental browser game inspired by campaign strategy.",
    href: "https://seaboiii.github.io/nizam/",
    code: "https://github.com/SeaBoiii/nizam",
    image: "/portfolio-assets/media/nizam.webp",
    accent: "sage",
  },
  {
    id: "tetris",
    title: "Tetris",
    category: "Games",
    description: "A familiar game loop, rebuilt for the browser.",
    href: "https://seaboiii.github.io/tetris/",
    code: "https://github.com/SeaBoiii/tetris",
    image: "/portfolio-assets/media/tetris.webp",
    accent: "sky",
  },
  {
    id: "novels",
    title: "Novels Library",
    category: "Stories",
    description: "A growing story library with a dedicated reading experience.",
    href: "/novel/",
    code: "https://github.com/SeaBoiii/seaboiii.github.io/tree/main/web",
    image: "/portfolio-assets/media/novels.webp",
    accent: "rose",
  },
];

export const technicalAreas = [
  {
    title: "Physical systems",
    detail: "C / C++ · Arduino · Motion control · Electronics",
  },
  {
    title: "Intelligent systems",
    detail: "Python · On-device inference · Classification · Model evaluation",
  },
  {
    title: "Interactive systems",
    detail: "TypeScript · React · Browser rendering · State & content systems",
  },
];

export const contactLinks: ContentLink[] = [
  { label: "Email", href: "mailto:seaboiiigamer@gmail.com" },
  { label: "GitHub", href: "https://github.com/SeaBoiii" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/a1e3m/" },
];
