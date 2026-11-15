interface ProjectChapterEvent {
  key?: string;
  progress?: number;
  active?: boolean;
}

const clamp = (value: number, minimum = -1, maximum = 1) => Math.max(minimum, Math.min(maximum, value));

/** Input-only depth on the existing native rail, with no autonomous draw loop. */
export function initializeProjectReel() {
  const chapter = document.querySelector<HTMLElement>('[data-scroll-chapter="projects"]');
  if (!chapter || chapter.dataset.projectReel) return;
  const viewport = chapter.querySelector<HTMLElement>('.project-viewport');
  const track = chapter.querySelector<HTMLElement>('.project-track');
  const stages = [...chapter.querySelectorAll<HTMLElement>('[data-project-stage]')];
  if (!viewport || !track || !stages.length) return;

  const html = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const connection = (navigator as Navigator & {
    connection?: EventTarget & { saveData?: boolean };
  }).connection;
  let progress = Number(chapter.dataset.progress ?? 0);
  let chapterActive = chapter.dataset.chapterActive !== 'false';
  let frozen = html.dataset.modal === 'open';

  const enabled = () => html.dataset.motion !== 'off' && !reduced.matches && !connection?.saveData;
  const available = () => enabled() && chapterActive && !document.hidden && !frozen;

  function resetPointer(stage: HTMLElement) {
    stage.style.setProperty('--reel-pointer-x', '0');
    stage.style.setProperty('--reel-pointer-y', '0');
  }

  function refresh() {
    if (!enabled()) {
      chapter!.dataset.projectReel = 'static';
      stages.forEach(stage => {
        resetPointer(stage);
        stage.style.setProperty('--reel-sweep', '0');
        stage.style.setProperty('--reel-distance', '0');
      });
      return;
    }
    chapter!.dataset.projectReel = available() ? 'active' : 'suspended';
    if (!available()) return;

    const width = Math.max(1, viewport!.clientWidth);
    const offset = progress * Math.max(0, track!.scrollWidth - width);
    const cinematic = html.dataset.cinematic === 'on';
    stages.forEach(stage => {
      const sweep = cinematic ? clamp((stage.offsetLeft - offset) / width) : 0;
      stage.style.setProperty('--reel-sweep', sweep.toFixed(4));
      stage.style.setProperty('--reel-distance', Math.abs(sweep).toFixed(4));
    });
  }

  stages.forEach(stage => {
    const surface = stage.querySelector<HTMLElement>('.project-demo-surface');
    if (!surface) return;
    surface.addEventListener('pointermove', event => {
      if (!available() || !fine.matches || stage.dataset.active !== 'true') return;
      const bounds = surface.getBoundingClientRect();
      const x = clamp(((event.clientX - bounds.left) / Math.max(1, bounds.width) - .5) * 2);
      const y = clamp(((event.clientY - bounds.top) / Math.max(1, bounds.height) - .5) * 2);
      stage.style.setProperty('--reel-pointer-x', x.toFixed(4));
      stage.style.setProperty('--reel-pointer-y', y.toFixed(4));
    }, { passive: true });
    surface.addEventListener('pointerleave', () => {
      if (available()) resetPointer(stage);
    });
  });

  window.addEventListener('portfolio:chapter', ((event: CustomEvent<ProjectChapterEvent>) => {
    if (event.detail?.key !== 'projects') return;
    if (Number.isFinite(event.detail.progress)) progress = clamp(event.detail.progress!, 0, 1);
    chapterActive = !!event.detail.active;
    refresh();
  }) as EventListener);

  window.addEventListener('portfolio:motion', refresh);
  window.addEventListener('portfolio:modal', ((event: CustomEvent<{ open?: boolean }>) => {
    frozen = !!event.detail?.open;
    // Leave all input variables at their exact current values while a dialog
    // owns focus. Pointer movement resumes from its neutral pose on return.
    if (!frozen) stages.forEach(resetPointer);
    refresh();
  }) as EventListener);
  document.addEventListener('visibilitychange', refresh);
  reduced.addEventListener('change', refresh);
  fine.addEventListener('change', () => {
    if (!frozen) stages.forEach(resetPointer);
  });
  connection?.addEventListener?.('change', refresh);
  refresh();
}
