/** Small homepage accents. The native chapter controller owns all scroll routing. */
export function initializeCinema() {
  const html = document.documentElement;
  if (html.dataset.cinema === 'ready') return;
  const elements = [...document.querySelectorAll<HTMLElement>('[data-reveal]')];
  const reveal = (element: Element) => element.classList.add('is-in');
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    reveal(entry.target);
    observer.unobserve(entry.target);
  }), { rootMargin:'0px 0px -4% 0px', threshold:.05 });
  elements.forEach(element => {
    const bounds = element.getBoundingClientRect();
    if (bounds.top < innerHeight && bounds.bottom > 0) reveal(element);
    else observer.observe(element);
  });
  document.addEventListener('focusin', event => {
    const target = (event.target as Element | null)?.closest('[data-reveal]');
    if (target) reveal(target);
  });
  const revealAll = () => elements.forEach(reveal);
  window.addEventListener('portfolio:modal', revealAll, { once:true });
  window.addEventListener('portfolio:motion', () => { if (html.dataset.motion === 'off') revealAll(); });
  const fine = matchMedia('(hover:hover) and (pointer:fine)');
  document.querySelectorAll<HTMLElement>('.book-card').forEach(card => {
    const poster = card.querySelector<HTMLElement>('[data-tilt]');
    if (!poster) return;
    const reset = () => { poster.style.removeProperty('--tilt-x'); poster.style.removeProperty('--tilt-y'); };
    card.addEventListener('pointermove', event => {
      if (!fine.matches || html.dataset.motion !== 'on' || html.dataset.modal === 'open') return;
      const box = card.getBoundingClientRect();
      poster.style.setProperty('--tilt-y', `${((event.clientX-box.left)/box.width-.5)*10}deg`);
      poster.style.setProperty('--tilt-x', `${((event.clientY-box.top)/box.height-.5)*-6}deg`);
    }, { passive:true });
    card.addEventListener('pointerleave', reset);
    window.addEventListener('portfolio:motion', reset);
    window.addEventListener('portfolio:modal', reset);
  });
  html.dataset.cinema = 'ready';
}
