import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

export interface ContentLink {
  label: string;
  href: string;
}

export interface ProjectSection {
  heading: string;
  body: string[];
}

export interface ProjectMedia {
  mp4: string;
  webm: string;
  poster: string;
  caption: string;
}

export interface Project {
  slug: string;
  title: string;
  category: string;
  discipline: 'Engineering' | 'Interactive' | 'Stories';
  summary: string;
  year: string;
  image: string;
  alt: string;
  logo: string;
  accent: string;
  featured: boolean;
  role: string;
  scope: string;
  independent: boolean;
  stack: string[];
  contribution: string;
  outcome: string;
  links: ContentLink[];
  sections: ProjectSection[];
  media?: ProjectMedia;
}

export interface Experiment {
  slug: string;
  title: string;
  category: 'Interfaces' | 'Games' | 'Learning';
  description: string;
  href: string;
  code: string;
  logo: string;
  accent: string;
  image?: string;
}

export interface Book {
  slug: string;
  title: string;
  genre: string;
  description: string;
  href: string;
  image: string;
  alt: string;
  chapterCount: number;
  status: string;
}

export const profile = {
  name: 'Aleem Siddique',
  role: 'Product development engineer. Builder. Writer.',
  intro: 'I bring products to life, make complex systems tangible, and find stories in the spaces between.',
  email: 'seaboiiigamer@gmail.com',
  github: 'https://github.com/SeaBoiii',
  linkedin: 'https://www.linkedin.com/in/a1e3m/',
  about: 'My curiosity started with a Minecraft server in 2013. Writing plugins became a way to build something people could actually use. Today, that same instinct takes me from semiconductor product development to camera mechanisms, browser AI, and fictional worlds. I enjoy understanding the constraints, trying the difficult idea, and making the result clear to someone else.',
  qualification: 'B.Eng. in Computer Engineering, Nanyang Technological University. Specialisations in Artificial Intelligence and Cyber Security.',
};

export const career = {
  company: 'AMD',
  role: 'Product Development Engineer',
  dates: '2022–present',
  summary: 'Over four years bringing up semi-custom products and improving the balance between silicon quality and manufacturing yield.',
  products: ['Xbox', 'Steam Deck', 'PlayStation 5', 'PlayStation 5 Pro'],
  achievements: [
    'Work on product bring-up across semi-custom silicon, helping new products move toward dependable production.',
    'Contribute to quality and yield improvement with my team. We have found ways to improve both together, challenging a trade-off that often pulls them in opposite directions.',
    'Translate engineering work into an internally published technical paper and share it with colleagues at the Asia Technological Showcase.',
  ],
  recognition: {
    year: '2024',
    title: '2nd place',
    event: 'Asia Technological Showcase',
    detail: 'Recognition for my internally published technical paper at AMD’s annual Asia Technological Showcase.',
  },
};

export const projects: Project[] = [
  {
    slug: 'icm-buddy',
    title: 'ICM Buddy',
    category: 'Embedded systems / Photography',
    discipline: 'Engineering',
    summary: 'Precise mechanics. Unexpected photographs. A camera-lens controller that makes creative movement repeatable.',
    year: '2022',
    image: '/showcase-assets/media/icm-prototype.webp',
    alt: 'The ICM Buddy prototype attached to a DSLR, with stepper motors controlling the lens rings',
    logo: '/showcase-assets/logos/icm-buddy.svg',
    accent: '#A99CFF',
    featured: true,
    role: 'Hardware, firmware and interaction design',
    scope: 'University final-year project',
    independent: true,
    stack: ['C++', 'Arduino Nano', 'AccelStepper', 'TFT / EEPROM', 'Electronics'],
    contribution: 'Designed and implemented the hardware and firmware prototype, including calibration, lens movement sequences and on-device controls.',
    outcome: 'A working mechanism with documented long-exposure photographs, schematics and reproducible firmware.',
    media: {
      mp4: '/showcase-assets/media/icm-demo.mp4',
      webm: '/showcase-assets/media/icm-demo.webm',
      poster: '/showcase-assets/media/icm-prototype.webp',
      caption: 'Original ICM Buddy prototype footage showing the lens-control mechanism in motion.',
    },
    links: [
      { label: 'View source', href: 'https://github.com/SeaBoiii/FYP' },
      { label: 'Read project report', href: 'https://github.com/SeaBoiii/FYP/blob/main/.documents/ICM_Buddy_Final_Report.pdf' },
      { label: 'Watch original demo', href: 'https://www.youtube.com/watch?v=y02GOHybE4I' },
    ],
    sections: [
      {
        heading: 'Giving a creative gesture a repeatable mechanism.',
        body: [
          'Moving a camera lens during a long exposure can turn a familiar scene into trails, rings and tunnels of light. The gesture is expressive, but repeating the same focus and zoom motion by hand is difficult. ICM Buddy was my final-year project at NTU: a way to give photographers deliberate control over that movement.',
          'I started with little camera knowledge and learned the photographic problem alongside the electronics. The aim was to help both experienced and new photographers explore long exposures through preset movements and custom sequences.',
        ],
      },
      {
        heading: 'From motors to a usable photographic tool.',
        body: [
          'Two stepper motors drive the focus and zoom rings. An Arduino Nano coordinates their movements with shutter timing, while a small TFT display and joystick provide controls on the device itself. Calibration establishes the permitted lens travel before a sequence starts.',
          'My contribution connected the mechanism, circuit and firmware into a working prototype. Stored calibration and selectable patterns made it usable without a connected computer; the project documentation also includes the schematic and PCB design.',
        ],
      },
      {
        heading: 'The constraint was inside the controller.',
        body: [
          'The ATmega microcontroller has limited program space and memory. Calibration, motor control, menus and custom movements all had to fit in that budget. I worked through the firmware to reduce its footprint while retaining the behaviour that made the device useful.',
          'That constraint shaped the project as much as the physical mechanism did. A successful motion was only part of the problem: the controls also had to make setup understandable and protect the lens from movement beyond its calibrated range.',
        ],
      },
      {
        heading: 'The result is visible in the photographs.',
        body: [
          'The completed prototype produced documented long-exposure images using focus, zoom and combined movements. The report shows the setup and photographic results, including Singapore architecture transformed through controlled lens movement.',
          'This project taught me to treat firmware, hardware and the person operating them as one system. It remains a useful example of how a strict engineering constraint can create room for artistic exploration.',
        ],
      },
    ],
  },
  {
    slug: 'train-a-tiny-ai',
    title: 'Train a Tiny AI',
    category: 'Browser AI / Learning',
    discipline: 'Engineering',
    summary: 'Draw it. Teach it. Test it. An approachable AI lesson that puts learning directly in your hands.',
    year: '2026',
    image: '/showcase-assets/media/tiny-ai.webp',
    alt: 'Train a Tiny AI interface with a drawing canvas, labelled examples and live prediction controls',
    logo: '/showcase-assets/logos/train-a-tiny-ai.svg',
    accent: '#66D5FF',
    featured: true,
    role: 'Interactive workflow and local inference',
    scope: 'Independent STEM learning project',
    independent: true,
    stack: ['React', 'TypeScript', 'ONNX Runtime Web', 'WebNN / WebGPU', 'Python'],
    contribution: 'Built the drawing, teaching and prediction flow, integrated local ONNX inference, and packaged the runtime for offline use.',
    outcome: 'A self-contained browser experience with live predictions and an explicit display of the active compute backend.',
    media: {
      mp4: '/showcase-assets/media/tiny-ai-demo.mp4',
      webm: '/showcase-assets/media/tiny-ai-demo.webm',
      poster: '/showcase-assets/media/tiny-ai.webp',
      caption: 'An authentic Color Mixer training and testing recording with eight examples across four classes. This classifier learns from the visitor’s examples and is separate from the pretrained ONNX Shape Sorter.',
    },
    links: [{ label: 'View source', href: 'https://github.com/SeaBoiii/amd_trainatinyai' }],
    sections: [
      {
        heading: 'Let people teach the model themselves.',
        body: [
          'Machine learning is easier to understand when a learner can change the examples and see the effect. I built Train a Tiny AI for a STEM-booth setting, where visitors draw shapes or symbols, label their examples and test new drawings.',
          'The app is designed to run offline after a one-time installation. That makes the lesson practical in a booth setting and keeps its central interaction independent of a cloud service.',
        ],
      },
      {
        heading: 'Two pathways, two different lessons.',
        body: [
          'The teachable pathway uses a small nearest-neighbour classifier built from the visitor’s drawings. A separate pretrained ONNX Shape Sorter recognises circles, triangles, squares and stars. The first makes training tangible; the second introduces how an existing model can run on available hardware.',
          'My work connects the canvas, examples and predictions into a clear learning flow. I also integrated ONNX Runtime Web and the locally packaged model and runtime files, so inference does not require a CDN.',
        ],
      },
      {
        heading: 'Detect capability, then use it.',
        body: [
          'Accelerator availability depends on the browser, hardware and runtime. The application attempts available WebNN and WebGPU backends, verifies a usable session, and falls back to the CPU when acceleration cannot run.',
          'The active backend is shown in the interface. The model running on an accelerator is the pretrained Shape Sorter; the visitor-trained classifier is a separate pathway. Making that distinction explicit keeps the demonstration understandable.',
        ],
      },
      {
        heading: 'A small interface for a big idea.',
        body: [
          'The result is a local drawing-and-prediction experience with a reproducible offline setup and a Python tool for regenerating the shape model. Learners can compare examples and predictions rather than simply watching a prepared animation.',
          'This is an independent public learning project with an AMD theme. It illustrates machine-learning concepts and browser inference; it is separate from my semiconductor product development work.',
        ],
      },
    ],
  },
  {
    slug: 'ai-rover',
    title: 'AI Rover Challenge',
    category: 'Simulation / Robotics',
    discipline: 'Engineering',
    summary: 'A virtual rover, a teachable classifier, and a clear view of why the machine made its next move.',
    year: '2026',
    image: '/showcase-assets/media/rover.webp',
    alt: 'AI Rover Challenge mission simulator with a rover map, telemetry and ordered control rules',
    logo: '/showcase-assets/logos/ai-rover.svg',
    accent: '#FFC36D',
    featured: true,
    role: 'Simulation, learning tools and interfaces',
    scope: 'Independent STEM learning project',
    independent: true,
    stack: ['React', 'TypeScript', 'Phaser', 'Zustand', 'Vitest / Playwright'],
    contribution: 'Built the virtual rover workflow and interfaces for configuring components, teaching a classifier, programming rules and inspecting decisions.',
    outcome: 'Five browser missions in which students can run, pause, step and replay a rover, then examine its decisions and performance.',
    media: {
      mp4: '/showcase-assets/media/rover-demo.mp4',
      webm: '/showcase-assets/media/rover-demo.webm',
      poster: '/showcase-assets/media/rover.webp',
      caption: 'An authentic recording of rover setup, rule editing and a simulation run, including failure feedback for the learner to inspect and improve.',
    },
    links: [
      { label: 'Try the challenge', href: 'https://seaboiii.github.io/amd_robotics/' },
      { label: 'View source', href: 'https://github.com/SeaBoiii/amd_robotics' },
    ],
    sections: [
      {
        heading: 'Robotics begins with cause and effect.',
        body: [
          'AI Rover Challenge gives secondary-school learners a way to explore robotics without physical robots, accounts or cloud services. They choose components, train a small classifier, write ordered control rules and run missions in a Singapore-inspired environment.',
          'The learning journey follows the full loop: sense, analyse, decide, move, test and improve. Five missions introduce these ideas progressively, from movement and obstacle avoidance to AI-assisted control and a rescue challenge.',
        ],
      },
      {
        heading: 'Build it, run it, understand it.',
        body: [
          'Component choices involve a budget and practical trade-offs. The AI lab exposes class balance and a confusion matrix. The programming lab turns an ordered IF/THEN list into readable pseudocode, while the simulator shows telemetry, sensor readings and a decision log.',
          'My contribution brings those stages into one learning system. Learners can step through a run, rewind it and compare a changed design. Mission reports explain the outcome, and an engineering notebook keeps design decisions and reflections together.',
        ],
      },
      {
        heading: 'The simulation has to stand on its own.',
        body: [
          'Simulation and rendering are separate layers. The same behaviour can be examined through the graphical scene or an accessible text grid when WebGL is unavailable. This makes the important engineering concepts usable on more of the machines a classroom may have.',
          'The scoring model values completion, reliability, energy, safety and responsible AI alongside speed. Physical hardware integration is future adapter work; the current public project is a virtual simulator.',
        ],
      },
      {
        heading: 'A learning environment that explains its decisions.',
        body: [
          'The public project includes the simulator, five missions, local progress storage, developer documentation and guides for students and educators. Its test suite covers simulation behaviour, scoring, rules and the workshop journey.',
          'This is an independent public project with AMD-themed educational content. Compute comparisons in its technology corner are illustrative teaching material, rather than measurements of AMD products.',
        ],
      },
    ],
  },
  {
    slug: 'classility',
    title: 'Classility',
    category: 'Interaction design / Identity',
    discipline: 'Interactive',
    summary: 'A personality quiz that becomes a fantasy character, with an illustrated card worth keeping.',
    year: '2026',
    image: '/showcase-assets/media/classility.webp',
    alt: 'Classility’s fantasy-styled interface and illustrated RPG class result',
    logo: '/showcase-assets/logos/classility.svg',
    accent: '#9ED1FF',
    featured: true,
    role: 'Quiz logic, visual experience and card export',
    scope: 'Independent web project',
    independent: true,
    stack: ['React', 'TypeScript', 'Vite', 'React Router', 'html-to-image'],
    contribution: 'Built the question flow, weighted scoring and conditional class matching, result presentation and downloadable card experience.',
    outcome: 'A live fantasy quiz with twenty archetypes, dimensional scoring and individually rendered result cards.',
    media: {
      mp4: '/showcase-assets/media/classility-demo.mp4',
      webm: '/showcase-assets/media/classility-demo.webm',
      poster: '/showcase-assets/media/classility.webp',
      caption: 'An authentic quiz walkthrough from answer choices to an illustrated Classility result.',
    },
    links: [
      { label: 'Discover your class', href: 'https://seaboiii.github.io/classility/' },
      { label: 'View source', href: 'https://github.com/SeaBoiii/classility' },
    ],
    sections: [
      {
        heading: 'Turn a result into a character.',
        body: [
          'Classility takes a familiar personality-quiz structure and gives it a fantasy vocabulary. Twenty questions map choices to RPG archetypes such as Paladin, Druid and Spellblade. The experience is playful: a way to explore identity, rather than a clinical assessment.',
          'A result includes more than a class name. Lore, personality traits, a party role and a growth quest make each archetype feel like a character someone might want to inhabit.',
        ],
      },
      {
        heading: 'Consistent logic beneath the atmosphere.',
        body: [
          'Answers contribute weighted scores across six dimensions: Power, Faith, Arcana, Nature, Guard and Tactics. Conditional rules then select a class, with priorities handling overlapping matches. The same answers produce the same result.',
          'My contribution covers the quiz flow, scoring and result presentation. Data defines questions, dimensions and archetypes, keeping the content separate from the interface and making matching behaviour inspectable.',
        ],
      },
      {
        heading: 'The result has a life beyond the quiz.',
        body: [
          'Illustrated cards combine a class sprite, equipment and party-role crest into a downloadable PNG. A dedicated card renderer also supports repeatable exports, while protected result routes avoid presenting an incomplete quiz as a finished profile.',
          'Hash-based routing keeps the experience compatible with static GitHub Pages hosting. The mobile layout carries the same question and result flow onto a smaller screen.',
        ],
      },
      {
        heading: 'A complete, shareable experience.',
        body: [
          'The live project offers twenty archetypes, a card gallery and a reference for its scoring dimensions. Its source also includes tools for examining whether classes can be reached and how results are distributed.',
          'Classility demonstrates how I connect deterministic behaviour with an expressive interface: the underlying system stays consistent while the result feels personal.',
        ],
      },
    ],
  },
  {
    slug: 'novels-library',
    title: 'Novels Library',
    category: 'Content systems / Writing',
    discipline: 'Stories',
    summary: 'An expanding collection of fictional worlds, with a reading experience designed to let the story take over.',
    year: 'Ongoing',
    image: '/showcase-assets/media/novels.webp',
    alt: 'Aleem’s novel library showing illustrated covers and tools to find a story',
    logo: '/showcase-assets/logos/novels-library.svg',
    accent: '#EDD3A1',
    featured: true,
    role: 'Writing, content workflow and reader development',
    scope: 'Independent publishing project',
    independent: true,
    stack: ['Next.js', 'TypeScript', 'Markdown', 'Python', 'Static export'],
    contribution: 'Write the stories and develop the publishing workflow, searchable library and dedicated chapter reader that present them.',
    outcome: 'A static story library with genre discovery, reading settings, chapter navigation, bookmarks and alternate-ending support.',
    links: [
      { label: 'Find a story', href: '/novel/' },
      { label: 'View reader source', href: 'https://github.com/SeaBoiii/seaboiii.github.io/tree/main/web' },
    ],
    sections: [
      {
        heading: 'Make room for the story.',
        body: [
          'Writing is another way I explore how people make choices and how systems shape their lives. The library brings contemporary romance, speculative thrillers and fantasy into one place, while giving each story its own cover, description and chapter index.',
          'As the collection grew, the publishing problem became a software problem too: how to organise chapters consistently, help readers choose a story and preserve a comfortable place to read.',
        ],
      },
      {
        heading: 'A content workflow with a clear source of truth.',
        body: [
          'Stories and chapter metadata live in Markdown. The reader builds static pages from that source, with titles, genres, series relationships and chapter ordering carried into the library. Python utilities support authoring and image preparation.',
          'My contribution combines the writing with the tools around it. Keeping the source separate from its presentation lets the library grow without manually rebuilding each chapter’s navigation.',
        ],
      },
      {
        heading: 'Discovery outside. Focus inside.',
        body: [
          'The library supports text search, genre and status filters, series grouping and sorting. Inside a chapter, readers have font and layout settings, a theme choice, a table of contents and keyboard navigation.',
          'Progress and bookmarks are stored locally, so readers can return to a chapter on the same browser. Stories with branching epilogues present a choice of endings and a way to visit the alternatives.',
        ],
      },
      {
        heading: 'An ongoing publishing practice.',
        body: [
          'The result is a growing library with a dedicated reader, rather than a collection of disconnected files. The portfolio presents a few starting points; the full library holds the broader collection.',
          'The work shows a different side of the same engineering instinct: understand the content, give it a reliable structure and let the person using it concentrate on what matters.',
        ],
      },
    ],
  },
  {
    slug: 'crosswinds-in-sapa',
    title: 'Crosswinds in Sapa',
    category: 'Interactive fiction / Narrative systems',
    discipline: 'Stories',
    summary: 'A story that remembers your choices. Relationships become state, and state becomes an ending.',
    year: 'Ongoing',
    image: '/showcase-assets/media/visual-novel.webp',
    alt: 'Crosswinds in Sapa visual novel showing a scene and the choices that branch its story',
    logo: '/showcase-assets/logos/crosswinds-in-sapa.svg',
    accent: '#C6ACF3',
    featured: true,
    role: 'Narrative experience, game engine and authoring tools',
    scope: 'Independent interactive fiction',
    independent: true,
    stack: ['JavaScript', 'HTML / CSS', 'JSON', 'Python', 'GitHub Pages'],
    contribution: 'Connected branching scenes and relationship state to a browser story player, with a node-based editor for developing and testing routes.',
    outcome: 'A playable branching narrative with condition-based endings, local save slots, a story log and a visual authoring workflow.',
    links: [
      { label: 'Play the story', href: 'https://seaboiii.github.io/visual_novel/' },
      { label: 'View source', href: 'https://github.com/SeaBoiii/visual_novel' },
    ],
    sections: [
      {
        heading: 'Choices that leave an afterimage.',
        body: [
          'Crosswinds in Sapa follows a Singaporean engineer facing a personal decision through five relationships. The story moves through work, friendship, travel and memory. Choices affect affection, trust and tension, so an ending depends on the accumulated journey.',
          'I wanted the interaction to carry part of the storytelling. A choice should do more than lead to the next paragraph: its effect can stay with a relationship and change what becomes possible later.',
        ],
      },
      {
        heading: 'Narrative structure becomes a small engine.',
        body: [
          'Scenes, choices and their effects are represented as structured data. The player updates relationship state, follows scene links and evaluates ending conditions. Local save slots, a story log and a back control make it possible to explore more than one route.',
          'My contribution brings the narrative and the browser system together. The engine supports condition-based endings instead of reducing every path to a single last decision.',
        ],
      },
      {
        heading: 'Build tools for the person writing the story.',
        body: [
          'A visual node graph makes the scene structure visible, with pan and zoom for exploring the branches. Scene editing, ending-rule controls and a live preview provide a way to revise both the words and their behaviour.',
          'JSON import and export keep the story portable. A local Python development server supports the editor’s file operations, while the published player remains a self-contained static website.',
        ],
      },
      {
        heading: 'Writing and software share the same space.',
        body: [
          'The public project includes a playable story and its authoring tools. It demonstrates how I think about state, navigation and content when the interface is itself part of the creative work.',
          'It sits alongside the novel library as a different form of writing: one invites a reader to follow a story, while the other invites them to participate in its direction.',
        ],
      },
    ],
  },
];

export const experiments: Experiment[] = [
  {
    slug: 'potionality',
    title: 'Potionality',
    category: 'Interfaces',
    description: 'A reflective personality quiz told through eight forces and a potion of your own.',
    href: 'https://seaboiii.github.io/potionality/',
    code: 'https://github.com/SeaBoiii/potionality',
    logo: '/showcase-assets/logos/potionality.svg',
    accent: '#F0D88E',
    image: '/showcase-assets/media/potionality.webp',
  },
  {
    slug: 'chip-challenge',
    title: 'AMD Chip Challenge',
    category: 'Learning',
    description: 'An independent learning experiment about component budgets and hardware trade-offs.',
    href: 'https://github.com/SeaBoiii/amd_buildapc',
    code: 'https://github.com/SeaBoiii/amd_buildapc',
    logo: '/showcase-assets/logos/chip-challenge.svg',
    accent: '#FF8366',
  },
  {
    slug: 'silicon-self',
    title: 'silicon·self',
    category: 'Interfaces',
    description: 'An independent AMD-themed personality quiz with silicon-inspired archetypes.',
    href: 'https://seaboiii.github.io/amd_personality/',
    code: 'https://github.com/SeaBoiii/amd_personality',
    logo: '/showcase-assets/logos/silicon-self.svg',
    accent: '#ED1C24',
  },
  {
    slug: 'age-of-war',
    title: 'Age of War',
    category: 'Games',
    description: 'A browser strategy experiment inspired by the classic game.',
    href: 'https://seaboiii.github.io/age_of_war/',
    code: 'https://github.com/SeaBoiii/age_of_war',
    logo: '/showcase-assets/logos/age-of-war.svg',
    accent: '#F1B86B',
    image: '/showcase-assets/media/age-of-war.webp',
  },
  {
    slug: 'nizam',
    title: 'Nizam',
    category: 'Games',
    description: 'An experimental browser world inspired by campaign strategy.',
    href: 'https://seaboiii.github.io/nizam/',
    code: 'https://github.com/SeaBoiii/nizam',
    logo: '/showcase-assets/logos/nizam.svg',
    accent: '#F0D88E',
    image: '/showcase-assets/media/nizam.webp',
  },
  {
    slug: 'tetris',
    title: 'Tetris',
    category: 'Games',
    description: 'A familiar game loop, rebuilt for a quick browser session.',
    href: 'https://seaboiii.github.io/tetris/',
    code: 'https://github.com/SeaBoiii/tetris',
    logo: '/showcase-assets/logos/tetris.svg',
    accent: '#69BBF3',
    image: '/showcase-assets/media/tetris.webp',
  },
];

const bookSelections = [
  {
    slug: 'crossroads-of-the-heart',
    title: 'Crossroads of the Heart',
    genre: 'Contemporary romance',
    description: 'Two colleagues navigate friendship, faith and the risk of admitting what they feel.',
  },
  {
    slug: 'second-skin',
    title: 'Second Skin',
    genre: 'Speculative thriller',
    description: 'A full-sensory virtual world unsettles the boundary between a chosen identity and a life outside it.',
  },
  {
    slug: 'the-ledger-of-ash',
    title: 'The Ledger of Ash',
    genre: 'Dark fantasy',
    description: 'An overlooked girl discovers a power to shift burdens, and turns it against a guild built on control.',
  },
];

// Read the same Markdown metadata as the reader at build time. Never ship Node
// filesystem access in an interactive island.
const novelRoot = [path.resolve(process.cwd(), '../novel'), path.resolve(process.cwd(), 'novel')]
  .find((candidate) => fs.existsSync(candidate));

function readBookMetadata(filename: string | undefined): Record<string, unknown> {
  if (!filename || !fs.existsSync(filename)) return {};
  const source = fs.readFileSync(filename, 'utf8');
  const frontmatter = source.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!frontmatter) return {};
  const data: unknown = parse(frontmatter[1], { schema: 'core' });
  return data !== null && typeof data === 'object' && !Array.isArray(data)
    ? data as Record<string, unknown>
    : {};
}

export const books: Book[] = bookSelections.map((selection) => {
  const directory = novelRoot ? path.join(novelRoot, selection.slug) : undefined;
  const metadataFile = directory ? path.join(directory, 'index.md') : undefined;
  const metadata = readBookMetadata(metadataFile);
  const title = typeof metadata.Title === 'string' ? metadata.Title.trim() || selection.title : selection.title;
  const sourceGenre = typeof metadata.genre === 'string' ? metadata.genre.split(',')[0].trim() : '';
  const genre = sourceGenre ? sourceGenre.replace(/^./, (letter: string) => letter.toUpperCase()) : selection.genre;
  const chapterCount = directory && fs.existsSync(directory)
    ? fs.readdirSync(directory).filter((filename: string) => /^(Chapter\d+|Epilogue.*)\.md$/i.test(filename)).length
    : 0;
  return {
    ...selection,
    title,
    genre,
    chapterCount,
    status: typeof metadata.status === 'string' ? metadata.status.trim() || 'Complete' : 'Complete',
    href: `/novel/${selection.slug}/`,
    image: `/images/${selection.slug}-cover-640.webp`,
    alt: `Cover of ${title}`,
  };
});
