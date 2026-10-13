const clamp = (value: number) => Math.max(0, Math.min(1, value));
const pad = (value: number) => String(Math.floor(value)).padStart(2, '0');

/** Homepage-only film effects: reveals, the timecode HUD, the hero aperture and pointer light. */
export function initializeCinema() {
  const html = document.documentElement;
  if (html.dataset.cinema === 'ready') return;
  const motion = () => html.dataset.motion !== 'off';
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const hero = document.querySelector<HTMLElement>('[data-scroll-chapter="hero"]');
  const portrait = document.querySelector<HTMLElement>('.portrait-frame');
  const sceneLabel = document.querySelector<HTMLElement>('[data-hud-scene]');
  const timecode = document.querySelector<HTMLElement>('[data-hud-timecode]');
  const light = document.querySelector<HTMLElement>('[data-cine-light]');
  const scenes = [...document.querySelectorAll<HTMLElement>('main [data-scene]')];

  // Reveal on entry. Anything already focused or in view is revealed at once.
  const reveal = (element: Element) => element.classList.add('is-in');
  const revealers = [...document.querySelectorAll<HTMLElement>('[data-reveal]')];
  // Clip-path reveals start with no visible area, which IntersectionObserver
  // reports as never intersecting, so those are watched through their parent.
  const watched = new Map<Element, HTMLElement[]>();
  revealers.forEach(element => {
    const clipped = element.dataset.reveal === 'line' || element.dataset.reveal === 'wipe';
    const target = clipped && element.parentElement ? element.parentElement : element;
    watched.set(target, [...(watched.get(target) ?? []), element]);
  });
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    watched.get(entry.target)?.forEach(reveal);
    observer.unobserve(entry.target);
  }), { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  watched.forEach((_, target) => observer.observe(target));
  document.addEventListener('focusin', event => {
    const target = (event.target as Element | null)?.closest('[data-reveal]');
    if (target) reveal(target);
  });
  window.addEventListener('portfolio:modal', () => revealers.forEach(reveal), { once: true });

  let frame = 0;
  let lastY = scrollY;
  let velocity = 0;
  let scene = '';
  let heroOpen = -1;

  function update() {
    frame = 0;
    if (html.dataset.modal === 'open') return;
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const progress = clamp(scrollY / max);
    html.style.setProperty('--page-progress', progress.toFixed(4));

    // A 24 fps timecode: one frame for every 6px travelled.
    if (timecode) {
      const frames = Math.round(scrollY / 6);
      timecode.textContent = `${pad(frames / 86400)}:${pad((frames / 1440) % 60)}:${pad((frames / 24) % 60)}:${pad(frames % 24)}`;
    }

    const probe = innerHeight * 0.45;
    const current = scenes.find(element => {
      const bounds = element.getBoundingClientRect();
      return bounds.top <= probe && bounds.bottom > probe;
    });
    const name = current?.dataset.scene ?? scene;
    if (sceneLabel && name !== scene) { scene = name; sceneLabel.textContent = name; }
    // The project reel carries its own position bar, so the HUD steps aside there.
    html.dataset.hud = scrollY > innerHeight * 0.35 && current?.dataset.scrollChapter !== 'projects' ? 'on' : 'off';

    // The hero opens from 2.39:1 letterbox to full frame over its first stretch.
    if (hero) {
      const distance = html.dataset.cinematic === 'on' ? hero.offsetHeight * 0.18 : innerHeight * 0.5;
      const open = clamp((-hero.getBoundingClientRect().top + 1) / Math.max(1, distance));
      if (Math.abs(open - heroOpen) > 0.001) { heroOpen = open; html.style.setProperty('--open', open.toFixed(3)); }
    }

    if (portrait && motion()) {
      const bounds = portrait.getBoundingClientRect();
      if (bounds.bottom > 0 && bounds.top < innerHeight) portrait.style.setProperty('--portrait', clamp(1 - bounds.top / innerHeight).toFixed(3));
    }

    const delta = scrollY - lastY;
    lastY = scrollY;
    velocity += (Math.max(-24, Math.min(24, delta / 6)) - velocity) * 0.2;
    if (!motion() || Math.abs(velocity) < 0.02) velocity = 0;
    html.style.setProperty('--velocity', velocity.toFixed(2));
    if (velocity !== 0) schedule();
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }

  // Pointer effects: a soft key light, poster tilt and tile spotlights.
  let lightX = innerWidth / 2;
  let lightY = innerHeight / 2;
  let targetX = lightX;
  let targetY = lightY;
  let lightFrame = 0;
  const followLight = () => {
    lightX += (targetX - lightX) * 0.12;
    lightY += (targetY - lightY) * 0.12;
    if (light) light.style.transform = `translate3d(${lightX}px,${lightY}px,0)`;
    lightFrame = Math.abs(targetX - lightX) + Math.abs(targetY - lightY) > 0.5 ? requestAnimationFrame(followLight) : 0;
  };
  const pointerEffects = () => finePointer.matches && motion() && html.dataset.modal !== 'open';
  document.addEventListener('pointermove', event => {
    if (!pointerEffects()) { light?.classList.remove('is-on'); return; }
    targetX = event.clientX; targetY = event.clientY;
    light?.classList.add('is-on');
    if (!lightFrame) lightFrame = requestAnimationFrame(followLight);
    const target = event.target instanceof Element ? event.target : null;
    const tile = target?.closest<HTMLElement>('[data-spotlight]');
    if (tile) {
      const bounds = tile.getBoundingClientRect();
      tile.style.setProperty('--mx', `${event.clientX - bounds.left}px`);
      tile.style.setProperty('--my', `${event.clientY - bounds.top}px`);
    }
    const card = target?.closest<HTMLElement>('.book-card');
    const poster = card?.querySelector<HTMLElement>('[data-tilt]');
    if (card && poster) {
      const bounds = card.getBoundingClientRect();
      poster.style.setProperty('--tilt-y', `${((event.clientX - bounds.left) / bounds.width - 0.5) * 18}deg`);
      poster.style.setProperty('--tilt-x', `${((event.clientY - bounds.top) / bounds.height - 0.5) * -12}deg`);
    }
  }, { passive: true });
  document.addEventListener('pointerleave', () => light?.classList.remove('is-on'));
  document.querySelectorAll<HTMLElement>('.book-card').forEach(card => card.addEventListener('pointerleave', () => {
    const poster = card.querySelector<HTMLElement>('[data-tilt]');
    poster?.style.removeProperty('--tilt-x');
    poster?.style.removeProperty('--tilt-y');
  }));

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('portfolio:motion', schedule);
  window.addEventListener('portfolio:modal', schedule);
  html.dataset.cinema = 'ready';
  update();
}
