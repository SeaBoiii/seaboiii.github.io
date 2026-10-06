/**
 * A1E3M PORTFOLIO CLIENT APPLICATION
 * Author: Aleem (A1E3M)
 * Features:
 *  - Web Audio API Tactile Sound Engine (HUD Mute/Unmute, Micro-Synthesizer)
 *  - Dual Colorway Manager (White & Black Edition with ?Color=White Support)
 *  - Interactive Terminal ("A1E3M Shell" v2.6 with AMD, Silicon & Novel Commands)
 *  - Bento Hub Filter Engine (9 Live Web Apps)
 *  - Live Telemetry (Singapore SGT UTC+8 Clock & Dynamic Age Calculation)
 *  - 1-Click Clipboard Email Transmission Toast
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. WEB AUDIO API - TACTILE SOUND ENGINE (MUTED BY DEFAULT)
  // =========================================================================
  const AudioEngine = {
    audioCtx: null,
    muted: true,

    init() {
      const enableAudio = () => {
        if (!this.audioCtx) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (AudioContext) {
            this.audioCtx = new AudioContext();
          }
        }
        window.removeEventListener('pointerdown', enableAudio);
      };
      window.addEventListener('pointerdown', enableAudio, { once: true });
    },

    playClick() {
      if (this.muted || !this.audioCtx) return;
      try {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, this.audioCtx.currentTime + 0.04);

        gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.04);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.04);
      } catch (e) {}
    },

    playGlyph() {
      if (this.muted || !this.audioCtx) return;
      try {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, this.audioCtx.currentTime + 0.15);

        gain.gain.setValueAtTime(0.06, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.18);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.18);
      } catch (e) {}
    },

    toggleMute() {
      this.muted = !this.muted;
      if (!this.muted && !this.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) this.audioCtx = new AudioContext();
      }
      if (!this.muted) this.playGlyph();
      return this.muted;
    }
  };

  window.AudioEngine = AudioEngine;
  AudioEngine.init();

  // =========================================================================
  // 2. DUAL COLORWAY MANAGER (BLACK EDITION & WHITE EDITION ?Color=White)
  // =========================================================================
  function initColorway() {
    // 1. Detect URL param (?Color=White or ?color=white)
    const urlParams = new URLSearchParams(window.location.search);
    const colorParam = (urlParams.get('Color') || urlParams.get('color') || '').toLowerCase();

    // 2. Determine initial theme: URL param > localStorage > Default 'black'
    let activeTheme = 'black';
    if (colorParam === 'white' || colorParam === 'black') {
      activeTheme = colorParam;
    } else {
      const storedTheme = localStorage.getItem('a1e3m_portfolio_colorway');
      if (storedTheme === 'white' || storedTheme === 'black') {
        activeTheme = storedTheme;
      }
    }

    // Apply Theme Function
    function applyTheme(theme, playSound = false) {
      activeTheme = theme;
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('a1e3m_portfolio_colorway', theme);

      // Update HUD buttons
      const colorwayBtns = document.querySelectorAll('.colorway-btn');
      colorwayBtns.forEach(btn => {
        const btnColor = btn.getAttribute('data-color');
        btn.classList.toggle('active', btnColor === theme);
      });

      // Sync with Three.js WebGL Engine
      if (window.ThreeEngine && typeof window.ThreeEngine.setTheme === 'function') {
        window.ThreeEngine.setTheme(theme);
      }

      if (playSound && window.AudioEngine) {
        window.AudioEngine.playClick();
      }
    }

    // Apply on load
    applyTheme(activeTheme, false);

    // Attach click listeners to colorway buttons
    const colorwayBtns = document.querySelectorAll('.colorway-btn');
    colorwayBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetColor = btn.getAttribute('data-color');
        if (targetColor && targetColor !== activeTheme) {
          applyTheme(targetColor, true);
        }
      });
    });

    window.applyPortfolioTheme = applyTheme;
  }

  // =========================================================================
  // 3. LIVE TELEMETRY (SINGAPORE SGT CLOCK & DYNAMIC AGE)
  // =========================================================================
  function initTelemetry() {
    const timeDisplay = document.getElementById('telemetry-time');
    const ageDisplay = document.getElementById('spec-age');
    const bioAgeDisplay = document.getElementById('bio-age');
    const footerYear = document.getElementById('footer-year');

    // Dynamic Age Calculation (Born May 26, 1997)
    const birthDate = new Date(1997, 4, 26);
    const now = new Date();
    let age = now.getFullYear() - birthDate.getFullYear();
    const m = now.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) {
      age--;
    }

    if (ageDisplay) ageDisplay.textContent = `${age} YRS · Active`;
    if (bioAgeDisplay) bioAgeDisplay.textContent = `${age}`;
    if (footerYear) footerYear.textContent = now.getFullYear();

    // SGT Clock (UTC+8)
    function updateClock() {
      if (!timeDisplay) return;
      const sgt = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Singapore" }));
      const hrs = String(sgt.getHours()).padStart(2, '0');
      const mins = String(sgt.getMinutes()).padStart(2, '0');
      const secs = String(sgt.getSeconds()).padStart(2, '0');
      timeDisplay.textContent = `SG // ${hrs}:${mins}:${secs} SGT`;
    }
    updateClock();
    setInterval(updateClock, 1000);
  }

  // =========================================================================
  // 4. SOUND TOGGLE BUTTON
  // =========================================================================
  function initSoundToggle() {
    const btnSound = document.getElementById('btn-sound-toggle');
    if (!btnSound) return;

    btnSound.addEventListener('click', () => {
      const isMuted = AudioEngine.toggleMute();
      btnSound.classList.toggle('active', !isMuted);
      btnSound.innerHTML = isMuted 
        ? `<i class="fa fa-volume-off" aria-hidden="true"></i> MUTE`
        : `<i class="fa fa-volume-up" aria-hidden="true"></i> SFX ON`;
    });
  }

  // =========================================================================
  // 5. SCROLL PROGRESS & ACTIVE NAVIGATION SPY
  // =========================================================================
  function initScrollSpy() {
    const progressEl = document.getElementById('scroll-progress');
    const hudLinks = document.querySelectorAll('.hud-link');
    const sections = [
      { id: 'stage-hero', link: document.querySelector('.hud-link[href="#stage-hero"]') },
      { id: 'stage-silicon', link: document.querySelector('.hud-link[href="#stage-silicon"]') },
      { id: 'stage-hardware', link: document.querySelector('.hud-link[href="#stage-hardware"]') },
      { id: 'stage-ai', link: document.querySelector('.hud-link[href="#stage-ai"]') },
      { id: 'stage-network', link: document.querySelector('.hud-link[href="#stage-network"]') },
      { id: 'stage-novels', link: document.querySelector('.hud-link[href="#stage-novels"]') },
      { id: 'stage-projects', link: document.querySelector('.hud-link[href="#stage-projects"]') },
      { id: 'stage-specs', link: document.querySelector('.hud-link[href="#stage-specs"]') },
      { id: 'stage-terminal', link: document.querySelector('.hud-link[href="#stage-terminal"]') },
      { id: 'stage-contact', link: document.querySelector('.hud-link[href="#stage-contact"]') }
    ];

    window.addEventListener('scroll', () => {
      // Fallback progress bar scaling if CSS scroll timeline not supported
      if (!CSS.supports('animation-timeline', 'scroll()') && progressEl) {
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        const pct = scrollable > 0 ? (window.scrollY / scrollable) : 0;
        progressEl.style.transform = `scaleX(${pct})`;
      }

      // Active Section Spy
      const scrollPos = window.scrollY + 220;
      let currentSectionId = 'stage-hero';
      sections.forEach(sec => {
        const el = document.getElementById(sec.id);
        if (el && el.offsetTop <= scrollPos) {
          currentSectionId = sec.id;
        }
      });

      hudLinks.forEach(link => link.classList.remove('active'));
      const activeSec = sections.find(s => s.id === currentSectionId);
      if (activeSec && activeSec.link) {
        activeSec.link.classList.add('active');
      }
    }, { passive: true });
  }

  // =========================================================================
  // 6. PROJECT HUB BENTO FILTER
  // =========================================================================
  function initProjectFilters() {
    const filterPills = document.querySelectorAll('.hub-filter-pill');
    const bentoCards = document.querySelectorAll('.bento-card');

    filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        if (window.AudioEngine) window.AudioEngine.playClick();
        filterPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        const filterVal = pill.getAttribute('data-filter');

        bentoCards.forEach(card => {
          const category = card.getAttribute('data-category');
          if (filterVal === 'all' || category === filterVal) {
            card.style.display = 'flex';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          } else {
            card.style.display = 'none';
          }
        });
      });
    });
  }

  // =========================================================================
  // 7. INTERACTIVE TERMINAL ("A1E3M SHELL" v2.6)
  // =========================================================================
  function initTerminal() {
    const termInput = document.getElementById('terminal-input');
    const termBody = document.getElementById('terminal-output');
    const termQuickBtns = document.querySelectorAll('.term-quick-btn');

    if (!termInput || !termBody) return;

    const commands = {
      help: () => [
        "A1E3M SHELL COMMAND MATRIX [v2.6]:",
        "  amd        - AMD Product Development Engineer details & console SoCs",
        "  skills     - Display primary engineering proficiencies matrix",
        "  projects   - List key silicon, hardware, AI, distributed and web projects",
        "  hardware   - Details on ICM Buddy (Automated DSLR Controller in C/C++)",
        "  ai         - Details on LYON 2.0 (Google Cloud x NTU Chatbot)",
        "  server     - Details on Probow Minecraft Network (400 CCU concurrent)",
        "  novels     - Details on 50 published serialized novels & publishing pipeline",
        "  specs      - Full industrial hardware/software datasheet matrix",
        "  color      - Switch colorway: 'color white' or 'color black'",
        "  contact    - Retrieve direct transmission channels",
        "  whoami     - Identity and engineering summary",
        "  date       - Current Singapore standard telemetry",
        "  clear      - Clear the terminal screen"
      ],
      amd: () => [
        "AMD PRODUCT DEVELOPMENT ENGINEER // TELEMETRY:",
        "  Role     : Product Development Engineer @ AMD (2022 - Present)",
        "  Focus    : New Product Bring-Up, Sustaining, Yield & Quality Engineering",
        "  Silicon  : High-Volume Custom Console SoCs (PlayStation 5 & PS5 Pro)",
        "  Accolade : 2nd Place Winner — AMD Asia Tech Showcase 2024",
        "  Summary  : Silicon by day; firmware, tools and web platforms by night."
      ],
      skills: () => [
        "CORE TECHNICAL MATRIX:",
        "  [MASTER] C/C++       : Microcontroller optimization, AtMega, Arduino, Data Structures",
        "  [ADEPT]  Python      : AI & Machine Learning, Data Science, Pygame, Tkinter",
        "  [ADEPT]  Java        : Distributed Server Infrastructure, Custom Plugins, OODP",
        "  [MID]    JS/TS       : WebGL (Three.js), Game Loops, Reactive State Engines, Next.js",
        "  [ENG]    Silicon     : SoC Bring-Up, Yield Engineering, Console Hardware"
      ],
      projects: () => [
        "PILLAR ENGINEERING PROJECTS:",
        "  1. AMD Console SoCs  - High-volume SoC bring-up & yield improvements (PS5/Pro)",
        "  2. ICM Buddy         - Automated DSLR lens focus/zoom controller (C/C++ firmware)",
        "  3. LYON 2.0 Chatbot  - NTU Campus AI assistant (Google Cloud & OniGroup, 6000+ users)",
        "  4. Probow Network    - Distributed Minecraft network (400 CCU peak, sole architect)",
        "  5. Novel Platform    - 50 serialized novels, 818 chapters, Python Tkinter wizard",
        "  6. 9 Web Hub Apps    - Potionality, Classility, Nizam, Age of War, Tetris, etc."
      ],
      hardware: () => [
        "ICM BUDDY SPEC SHEET:",
        "  Target  : Automated Intentional Camera Movement long exposures",
        "  HW Core : Arduino AtMega microcontroller + custom stepper driver gear assembly",
        "  Firmware: Bare-metal C/C++ with acceleration profiles in memory-constrained MCU",
        "  Impact  : Allowed consistent, repeatable micro-movements on manual camera lenses."
      ],
      ai: () => [
        "LYON 2.0 CHATBOT SPEC SHEET:",
        "  Partners: Nanyang Technological University (NTU), Google Cloud, OniGroup",
        "  Scale   : Deployed to 6,000+ incoming university freshmen",
        "  Core    : Natural Language Understanding, dialogue trees, cloud onboarding."
      ],
      server: () => [
        "PROBOW NETWORK SPEC SHEET:",
        "  Peak CCU: 400 concurrent active players",
        "  Stack   : Custom Java plugins, OODP, SQL state sync, packet optimization",
        "  Role    : Sole programmer, systems architect, and hardware operator."
      ],
      novels: () => [
        "NOVEL PUBLISHING PLATFORM:",
        "  Catalog : 50 serialized novels, 818 published chapters",
        "  Authoring: Custom 5,800-line Python Tkinter wizard (DOCX import, front-matter)",
        "  Pipeline: Automated image optimizer (320/640/960px WebP/JPG variants)",
        "  Reader  : Next.js + TypeScript static reader on GitHub Pages (/novel/)."
      ],
      specs: () => [
        "INDUSTRIAL DATASHEET SPECIFICATIONS:",
        "  Degree    : B.Eng Computer Engineering, NTU (AI & Cyber Security)",
        "  Career    : Product Development Engineer @ AMD",
        "  Firmware  : C, C++, Arduino AtMega AVR, Stepper Control",
        "  Web & 3D  : TypeScript, React, Next.js, Three.js, Web Audio API",
        "  Location  : Singapore (SGT // UTC+8)"
      ],
      color: (args) => {
        const target = (args[0] || '').toLowerCase();
        if (target === 'white' || target === 'black') {
          if (window.applyPortfolioTheme) window.applyPortfolioTheme(target, true);
          return [`Colorway switched to ${target.toUpperCase()} EDITION.`];
        }
        return ["Usage: color white  OR  color black"];
      },
      contact: () => [
        "TRANSMISSION CHANNELS:",
        "  Email     : seaboiiigamer@gmail.com (Click card on page to copy)",
        "  LinkedIn  : https://linkedin.com/in/a1e3m",
        "  GitHub    : https://github.com/SeaBoiii",
        "  Telegram  : https://t.me/a1e3m",
        "  Instagram : https://instagram.com/a1e3m"
      ],
      whoami: () => [
        "A1E3M (Aleem):",
        "  Computer Engineer, AMD Product Development Engineer, and Creative Author.",
        "  Bridging the gap between silicon bring-up, bare-metal hardware, and interactive web software."
      ],
      date: () => [
        `CURRENT TELEMETRY: ${new Date().toUTCString()} (SGT UTC+8)`
      ],
      clear: () => {
        termBody.innerHTML = '';
        return [];
      }
    };

    function appendLine(text, className = '') {
      const line = document.createElement('div');
      line.className = `term-line-output ${className}`;
      line.textContent = text;
      termBody.appendChild(line);
      termBody.scrollTop = termBody.scrollHeight;
    }

    function executeCommand(rawInput) {
      const trimmed = rawInput.trim();
      if (!trimmed) return;

      // Echo User Prompt
      appendLine(`guest@a1e3m-core:~$ ${trimmed}`, 'highlight');

      const parts = trimmed.split(/\s+/);
      const cmd = parts[0].toLowerCase();
      const args = parts.slice(1);

      if (commands[cmd]) {
        const output = commands[cmd](args);
        output.forEach(outLine => appendLine(outLine));
      } else {
        appendLine(`Command not found: "${cmd}". Type "help" for available commands.`, 'term-line-output');
      }

      if (window.AudioEngine) window.AudioEngine.playClick();
      termInput.value = '';
    }

    termInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        executeCommand(termInput.value);
      }
    });

    // Quick Command Buttons
    termQuickBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const cmd = btn.getAttribute('data-cmd');
        if (cmd) executeCommand(cmd);
      });
    });
  }

  // =========================================================================
  // 8. 1-CLICK CLIPBOARD COPY TOAST
  // =========================================================================
  function initCopyToast() {
    const copyTriggers = document.querySelectorAll('.copy-email-trigger');
    const toast = document.getElementById('copy-toast');

    copyTriggers.forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        const email = 'seaboiiigamer@gmail.com';
        if (navigator.clipboard) {
          navigator.clipboard.writeText(email).then(() => {
            showToast();
          }).catch(() => {
            showToast();
          });
        } else {
          showToast();
        }
      });
    });

    function showToast() {
      if (!toast) return;
      if (window.AudioEngine) window.AudioEngine.playGlyph();
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
      }, 2600);
    }
  }

  // =========================================================================
  // INITIALIZE ON DOM READY
  // =========================================================================
  function initAll() {
    initColorway();
    initTelemetry();
    initSoundToggle();
    initScrollSpy();
    initProjectFilters();
    initTerminal();
    initCopyToast();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
