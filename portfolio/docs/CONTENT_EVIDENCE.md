# Content evidence and selection

Research date: 5 October 2026. Sources are the checked-out repository, the owner's public GitHub repositories, and NTU's own announcement/hosted press coverage. Repository ownership and public source support a portfolio description of the work; they do not establish employer affiliation, contractual status, sole authorship or deployment reach.

## Positioning

**Aleem Siddique — Engineer building systems, experiments and experiences.**

This is supported by a varied, inspectable body of work: embedded camera automation, browser inference, robotics simulation and interactive web applications. It is more specific to the evidence than a job title we cannot verify. The introduction, “I make complex systems tangible,” describes the design thread connecting those projects rather than claiming a business metric.

The existing `index.html` supplies the NTU Computer Engineering degree, AI/Cyber Security specialisations, Minecraft/Java origin story and public contact links. These are existing self-reported biographical facts. The redesign removes the dynamic age, dated job-seeking paragraph and language proficiency ratings. The degree remains compact background information rather than the main identity.

## Featured project decisions

Four projects receive case-study prominence. Recent work leads; the physical prototype provides an important second dimension.

| Project | Decision | Evidence and reason |
| --- | --- | --- |
| Train a Tiny AI | Featured / first | [README](https://github.com/SeaBoiii/amd_trainatinyai#readme), [inference implementation](https://github.com/SeaBoiii/amd_trainatinyai/blob/main/src/utils/shapeModel.ts). Offline browser learning and verified NPU/GPU/CPU backend selection make a strong current engineering story. |
| AI Rover Challenge | Featured / second | [README](https://github.com/SeaBoiii/amd_robotics#readme), [architecture](https://github.com/SeaBoiii/amd_robotics/blob/main/docs/architecture.md). The separation of simulator, rules, classifier and renderer shows system design; replay and a complete text-grid fallback demonstrate considered interaction. |
| ICM Buddy / FYP | Featured / third | [README](https://github.com/SeaBoiii/FYP#readme), [firmware](https://github.com/SeaBoiii/FYP/blob/main/Motor_ICM/Motor_ICM.ino), [report](https://github.com/SeaBoiii/FYP/blob/main/.documents/ICM_Buddy_Final_Report.pdf). Hardware, firmware, calibration and photographic outputs are unusually concrete evidence. |
| Classility | Featured / fourth | [README](https://github.com/SeaBoiii/classility#readme), [scoring](https://github.com/SeaBoiii/classility/blob/main/src/lib/scoring.ts), [evaluator](https://github.com/SeaBoiii/classility/blob/main/src/lib/evaluator.ts). Deterministic logic, content modelling and share-card presentation add a distinct interface story. |
| Lyon 2.0 | Journey milestone | [NTU announcement](https://www.ntu.edu.sg/news/detail/ntu-singapore-and-google-cloud-develop-new-rapid-response-virtual-assistant-to-help-address-freshmen-queries), [NTU-hosted coverage naming Aleem](https://www3.ntu.edu.sg/CorpComms2/Documents/2020/07_Jul/TechXplore_200722_NTU%20and%20google%20launches%20chatbot.pdf). Team contribution and launch are documented. Public evidence does not specify Aleem's exact personal deliverables, so this is a conservative contributor milestone. |
| AMD Chip Challenge / Build a PC | AMD collection | [README](https://github.com/SeaBoiii/amd_buildapc#readme). Component selection within a 900-point budget followed by mission tests. Source describes an educational, AMD-inspired demo, not an official configurator. |
| silicon·self | AMD collection | [README](https://github.com/SeaBoiii/amd_personality#readme). Twenty questions score four axes into sixteen silicon-inspired archetypes. The browser generates shareable result links and downloadable cards. |
| Potionality | Playground | [README](https://github.com/SeaBoiii/potionality#readme). Data-driven weighted/conditional outcomes and Canvas share cards are useful experiments; featuring it alongside Classility would repeat the quiz narrative. |

### Case-study claim boundaries

- **Tiny AI:** The teachable drawing classifier and the pretrained ONNX model are distinct paths. Copy preserves that distinction. `shapeModel.ts` attempts WebNN NPU, WebNN GPU, WebGPU, then WASM; each attempted session must complete a warmup before it is accepted. We say “available hardware,” without claiming NPU support on every browser or any speed advantage. Offline operation follows one-time installation; no booth attendance or learning-outcome metrics are claimed.
- **Rover:** The current project is simulated robotics. The architecture documents physical hardware adapters as future/stub implementations. Copy does not claim an already connected physical rover. A seeded simulation and renderer-independent engine support replay, while logistic regression is trained locally. Published comparisons in its technology corner are illustrative, so there are no commercial benchmark claims in the portfolio.
- **ICM:** The README documents calibrated lens movement, custom patterns and photo outputs. Firmware uses `AccelStepper`, TFT, EEPROM and AVR program-memory strings. The old root explicitly describes reducing code size on the ATmega device. Copy describes a working prototype and documented results without assigning precision, success-rate or commercial-production metrics. README and firmware comments mention different stepper driver variants; the portfolio avoids selecting one as the final hardware configuration.
- **Classility:** README describes weighted deterministic evaluation, twenty archetypes, HashRouter result routes and PNG export. This is an entertainment experience; copy makes no clinical or validated psychological assessment claims.

## Journey evidence

The section is labelled as an engineering journey rather than a formal employment CV.

| Milestone | Safe public wording | Support |
| --- | --- | --- |
| 2013 / Minecraft | Learning Java through custom server plugins and community projects. | Existing root background paragraph; [PropHunt public source](https://github.com/SeaBoiii/PropHunt). The old homepage's 400 concurrent player claim is omitted because it has no independently inspected evidence. |
| 2020 / Lyon | Student task-force contributor to NTU's Lyon 2.0 initiative with Google Cloud and OniGroup. | NTU's announcement is dated 22 July 2020. The NTU-hosted press coverage's photo caption identifies Computer Engineering student Aleem Siddique as part of the task force. We do not assign sole leadership or specific intent-engineering tasks. |
| 2022 / ICM | Final-year work combining firmware, electronics and DSLR motion control. | Existing homepage, public FYP repository and its 2022 project history. The date is useful project metadata; the About paragraph avoids being framed around graduation. |
| 2026 / public work | Recent public work in offline browser inference, robotics and interactive web systems. | [Current repository listing](https://github.com/SeaBoiii?tab=repositories) and inspected candidates. This describes public engineering output, not an employer role. |

2026 labels describe the current inspected public project versions. They are not claims that each project was first conceived in that year.

## Technical areas

Skills appear beside their evidence and in three compact areas without ratings:

- Physical systems: C/C++, Arduino, motion control and electronics — ICM firmware, earlier university source, schematics and PCB design files.
- Intelligent systems: Python, classification, on-device inference and evaluation — Tiny AI's local inference/model tooling and Rover's classifier/metrics modules.
- Interactive systems: TypeScript, React, browser rendering and state/content systems — Rover, Classility and the existing novel-reader frontend.

Java is retained in the journey, supported by Minecraft plugin source. Tool names in the case studies describe inspectable implementation, not certification or years of experience.

## Playground selection and routes

The second-edition playground includes six smaller entries: Potionality, Visual Novel, Age of War, Nizam, Tetris and Novels Library. These cover interfaces, games and stories. Build a PC belongs to the AMD collection, avoiding a duplicate card. Wordle and MMORPG remain existing destinations but do not receive equal homepage weight.

Project descriptions are grounded in the individual public READMEs or existing homepage descriptions. Further primary links: [Visual Novel](https://github.com/SeaBoiii/visual_novel), [Age of War](https://github.com/SeaBoiii/age_of_war), [Nizam](https://github.com/SeaBoiii/nizam), [Tetris](https://github.com/SeaBoiii/tetris), [novel reader source](https://github.com/SeaBoiii/seaboiii.github.io/tree/main/web). Existing `images/hub/*-site.png` files are real project screenshots and can be used as supporting imagery. They should be visually checked rather than assumed to reflect the latest project version.

Public route checks returned HTTP 200 for Classility, Potionality, AI Rover Challenge and silicon·self. Checks repeated during the 5 October 2026 revision confirmed 200 for Classility, Rover and silicon·self, and 404 for `seaboiii.github.io/amd_trainatinyai/` and `/amd_buildapc/`. Tiny AI and Build a PC therefore expose source links, with an additional local case study for Tiny AI. The root's existing `/novel/` and `/tetris/` paths must be preserved by deployment.

## Complete AMD collection

The collection contains the four inspected public `amd_` repositories: `amd_buildapc`, `amd_personality`, `amd_robotics` and `amd_trainatinyai`. Tiny AI and Rover retain detailed cases and link to them from the collection; Classility remains a distinct fourth featured case.

The card figures are source-grounded descriptions: **900** is the Build a PC budget, **16** is silicon·self's archetype count, **05** is Rover's mission count, and **DRAW / TEACH → TEST → UNDERSTAND** describes Tiny AI's learning flow. They are not adoption, benchmark or outcome metrics. These are presented as AMD-inspired experiments; repository names do not imply employer affiliation or endorsement. silicon·self's README explicitly calls the project unofficial and fan-made.

## Generated asset provenance

The About illustration is an original OpenAI-generated exploded compute module with graphite/silver enclosure, red silicon, cobalt board and lime details. It is an imagined editorial object, not a photograph or technical diagram of a specific product. The source PNG is tracked under `assets/images/compute-core-exploded-v2.png` (1254 × 1254, 1,712,964 bytes). The media script derives a transparent 1200 × 1200 WebP (206,344 bytes). `assets/images/README.md` records origin, hash and art direction; it deliberately does not invent an unavailable exact prompt/model identifier.

“Quiet mechanisms” was generated once with ElevenLabs `music_v2_5`, using the requested 60-second, approximately 80 BPM instrumental direction. The tracked MP3 is 960,429 bytes; `assets/audio/soundtrack.json` records the actual prompt, model, output request and verification state. Its generated structure is not presented as an independently measured tempo. Both generated assets are built from local tracked files; no API credentials or generation calls reach production builds or visitors.

## Contact provenance

Existing root contact anchors establish:

- Email: `seaboiiigamer@gmail.com`
- GitHub: `https://github.com/SeaBoiii`
- LinkedIn: `https://www.linkedin.com/in/a1e3m/`

The redesign uses text links instead of third-party badges. The email is not replaced with a fabricated “professional” alias.

## Remaining factual unknowns

No current employer title, employment dates, responsibilities, recognition or confidential work was verified from the checked-out repository. A LinkedIn directory search surfaced a similarly named Singapore/AMD profile, but the existing linked profile could not be read. This is insufficient for publishing a formal AMD role or claims about company work. Repository names containing `amd_` also do not establish employment or endorsement. No employer claim is included in the public copy.

The four current personal contribution descriptions reflect work presented in Aleem's own public repositories. They avoid sole-authorship wording, team-size claims and client delivery claims. Before a future employment-focused revision, add a user-supplied verified role description, permitted responsibilities and dated evidence rather than expanding this public-source narrative by inference.
