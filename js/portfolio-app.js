/**
 * A1E3M PORTFOLIO CLIENT APPLICATION
 * Author: Aleem (A1E3M)
 * Features: Web Audio Engine, Interactive Terminal, Bento Hub Filtering, Live Telemetry, Clipboard Toasts
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. WEB AUDIO API - TACTILE SOUND ENGINE (HUD TOGGLEABLE, MUTED BY DEFAULT)
  // =========================================================================
  const AudioEngine = {
    audioCtx: null,
    muted: true,

    init() {
      // AudioContext initialized on first user interaction to comply with browser autoplay policies
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
  // 2. LIVE TELEMETRY (SINGAPORE SGT CLOCK & DYNAMIC AGE)
  // =========================================================================
  function initTelemetry() {
    const timeDisplay = document.getElementById('telemetry-time');
    const ageDisplay = document.getElementById('spec-age');
    const bioAgeDisplay = document.getElementById('bio-age');
    const footerYear = document.getElementById('footer-year');

    // Age Calculation
    const birthDate = new Date(1997, 4, 26); // May 26, 1997
    const now = new Date();
    let age = now.getFullYear() - birthDate.getFullYear();
    const m = now.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) {
      age--;
    }

    if (ageDisplay) ageDisplay.textContent = `${age} YRS`;
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
  // 3. SOUND TOGGLE BUTTON
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
  // 4. SCROLL PROGRESS & ACTIVE NAVIGATION SPY
  // =========================================================================
  function initScrollSpy() {
    const progressEl = document.getElementById('scroll-progress');
    const hudLinks = document.querySelectorAll('.hud-link');
    const sections = [
      { id: 'stage-hero', link: document.querySelector('.hud-link[href="#stage-hero"]') },
      { id: 'stage-hardware', link: document.querySelector('.hud-link[href="#stage-hardware"]') },
      { id: 'stage-projects', link: document.querySelector('.hud-link[href="#stage-projects"]') },
      { id: 'stage-proficiency', link: document.querySelector('.hud-link[href="#stage-proficiency"]') },
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
      const scrollPos = window.scrollY + 200;
      let currentSectionId = '';
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
  // 5. PROJECT HUB BENTO FILTER
  // =========================================================================
  function initProjectFilters() {
    const filterPills = document.querySelectorAll('.hub-filter-pill');
    const bentoCards = document.querySelectorAll('.bento-card');

    filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        AudioEngine.playClick();
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
  // 6. INTERACTIVE TERMINAL ("A1E3M SHELL")
  // =========================================================================
  function initTerminal() {
    const termInput = document.getElementById('terminal-input');
    const termBody = document.getElementById('terminal-output');
    const termQuickBtns = document.querySelectorAll('.term-quick-btn');

    if (!termInput || !termBody) return;

    const commands = {
      help: () => [
        "A1E3M SHELL COMMAND MATRIX [v2.6]:",
        "  skills     - Display primary engineering proficiencies",
        "  projects   - List key hardware, AI and web projects",
        "  hardware   - Details on ICM Buddy (Automated DSLR Controller)",
        "  ai         - Details on LYON 2.0 (Google Cloud x NTU Chatbot)",
        "  server     - Details on Probow Minecraft Network (400 CCU)",
        "  contact    - Retrieve direct transmission channels",
        "  whoami     - Identity and engineering summary",
        "  date       - Current Singapore standard telemetry",
        "  clear      - Clear the terminal screen"
      ],
      skills: () => [
        "CORE TECHNICAL MATRIX:",
        "  [MASTER] C/C++       : Microcontroller optimization, AtMega, Arduino, Data Structures",
        "  [ADEPT]  Python      : AI & Machine Learning, Data Science, Pygame",
        "  [ADEPT]  Java        : Distributed Server Infrastructure, Custom Plugins, OODP",
        "  [MID]    JS/TS       : WebGL (Three.js), Game Loops, Reactive State Engines",
        "  [ENG]    Embedded/IoT: Circuit Prototyping, Stepper Automation, Telemetry"
      ],
      projects: () => [
        "PILLAR ENGINEERING PROJECTS:",
        "  1. ICM Buddy         - Automated DSLR lens focus/zoom controller (C/C++ firmware)",
        "  2. LYON 2.0 Chatbot  - NTU Campus AI assistant (Google Cloud & OniGroup, 6000+ users)",
        "  3. Probow Network    - Distributed Minecraft network (400 CCU peak, sole architect)",
        "  4. 9 Web Hub Apps    - Potionality, Classility, Novels Hub, Nizam, Age of War, Tetris, etc."
      ],
      hardware: () => [
        "ICM BUDDY SPEC SHEET:",
        "  Target  : Automated Intentional Camera Movement long exposures",
        "  HW Core : Arduino AtMega microcontroller + custom stepper driver gear assembly",
        "  Impact  : Allowed consistent, repeatable micro-movements on manual camera lenses."
      ],
      ai: () => [
        "LYON 2.0 CHATBOT SPEC SHEET:",
        "  Partners: Nanyang Technological University (NTU), Google Cloud, OniGroup",
        "  Role    : AI learning algorithm development & virtual orientation assistant",
        "  Scale   : Serviced 6,000+ incoming university students."
      ],
      server: () => [
        "PROBOW NETWORK SPEC SHEET:",
        "  Arch    : High-concurrency Java game server cluster",
        "  Peak    : 400 concurrent active players",
        "  Role    : Sole programmer, sponsor management, advertising & custom plugin dev."
      ],
      whoami: () => [
        "USER: Aleem (A1E3M)",
        "TITLE: Computer Engineer (B.Eng NTU, Specialised in AI & Cyber Security)",
        "MISSION: Building high-precision software, hardware, and interactive web experiences."
      ],
      contact: () => [
        "COMMUNICATION CHANNELS:",
        "  Email    : seaboiiigamer@gmail.com",
        "  LinkedIn : linkedin.com/in/a1e3m",
        "  GitHub   : github.com/SeaBoiii",
        "  Telegram : @a1e3m"
      ],
      date: () => [
        new Date().toLocaleString("en-US", { timeZone: "Asia/Singapore" }) + " SGT"
      ],
      clear: () => {
        termBody.innerHTML = '';
        return [];
      }
    };

    function executeCommand(rawCmd) {
      const cmd = rawCmd.trim().toLowerCase();
      if (!cmd) return;

      // Echo prompt
      const echoDiv = document.createElement('div');
      echoDiv.className = 'term-line-output';
      echoDiv.innerHTML = `<span class="term-prompt-user">guest@a1e3m</span>:<span class="term-prompt-path">~</span>$ ${escapeHtml(rawCmd)}`;
      termBody.appendChild(echoDiv);

      AudioEngine.playClick();

      if (cmd === 'clear') {
        commands.clear();
        return;
      }

      if (commands[cmd]) {
        const lines = commands[cmd]();
        lines.forEach(line => {
          const lDiv = document.createElement('div');
          lDiv.className = 'term-line-output';
          if (line.startsWith('CORE') || line.startsWith('PILLAR') || line.startsWith('A1E3M')) {
            lDiv.classList.add('highlight');
          }
          lDiv.textContent = line;
          termBody.appendChild(lDiv);
        });
      } else {
        const errDiv = document.createElement('div');
        errDiv.className = 'term-line-output';
        errDiv.innerHTML = `Command not recognized: <span style="color:var(--accent-red);">${escapeHtml(cmd)}</span>. Type <span class="highlight">help</span> for commands.`;
        termBody.appendChild(errDiv);
      }

      termBody.scrollTop = termBody.scrollHeight;
    }

    termInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        executeCommand(termInput.value);
        termInput.value = '';
      }
    });

    termQuickBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const cmd = btn.getAttribute('data-cmd');
        termInput.value = cmd;
        executeCommand(cmd);
        termInput.value = '';
      });
    });
  }

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // =========================================================================
  // 7. 1-CLICK EMAIL COPY TOAST
  // =========================================================================
  function initEmailCopy() {
    const copyTriggers = document.querySelectorAll('.copy-email-trigger');
    const toast = document.getElementById('copy-toast');

    copyTriggers.forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        const email = 'seaboiiigamer@gmail.com';
        AudioEngine.playGlyph();

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(email).then(showToast);
        } else {
          // Fallback textarea copy
          const ta = document.createElement('textarea');
          ta.value = email;
          ta.style.position = 'fixed';
          ta.style.left = '-9999px';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          showToast();
        }
      });
    });

    function showToast() {
      if (!toast) return;
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
      }, 2400);
    }
  }

  // =========================================================================
  // INITIALIZATION
  // =========================================================================
  document.addEventListener('DOMContentLoaded', () => {
    initTelemetry();
    initSoundToggle();
    initScrollSpy();
    initProjectFilters();
    initTerminal();
    initEmailCopy();
  });
})();

