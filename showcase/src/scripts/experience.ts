type ChapterKey = 'hero' | 'career' | 'projects' | 'writing' | 'experiments';
type World = 'lens' | 'circuit' | 'book';
interface Chapter {
  element: HTMLElement;
  pin: HTMLElement;
  key: ChapterKey;
  progress: number;
  active: boolean;
  lastProgress: number;
  lastActive: boolean;
}
interface ViewPosition {
  reference?: HTMLElement;
  top?: number;
  stage?: string;
  chapter?: Chapter;
  progress?: number;
  cinematic?: boolean;
}
interface ModalContext {
  session: string | null;
  returnUrl: string;
  scrollY: number;
  opener: HTMLElement | null;
  geometry: string;
  view?: ViewPosition;
}
interface ProjectHistory {
  session: string;
  slug: string;
  returnUrl: string;
  scrollY: number;
}

const clamp = (value: number) => Math.max(0, Math.min(1, value));

/** Static HTML remains the source of content; this module adds motion and dialogs. */
export function initializeExperience() {
  const html = document.documentElement;
  if (html.dataset.experienceReady === 'true') return;
  const header = document.querySelector<HTMLElement>('.site-header');
  const motionButton = document.querySelector<HTMLButtonElement>('[data-motion-toggle]');
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 1024px) and (min-height: 700px) and (hover: hover) and (pointer: fine)');
  const chapters: Chapter[] = [...document.querySelectorAll<HTMLElement>('[data-scroll-chapter]')].map(element => ({
    element,
    pin: element.querySelector<HTMLElement>('.chapter-pin') ?? element,
    key: element.dataset.scrollChapter as ChapterKey,
    progress: 0,
    active: false,
    lastProgress: -1,
    lastActive: false,
  }));
  const projectChapter = chapters.find(chapter => chapter.key === 'projects');
  const track = projectChapter?.element.querySelector<HTMLElement>('.project-track');
  const viewport = projectChapter?.element.querySelector<HTMLElement>('.project-viewport');
  const stages = [...document.querySelectorAll<HTMLElement>('[data-project-stage]')];
  const beats = [...document.querySelectorAll<HTMLElement>('[data-career-beat]')];
  const sceneButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-workbench-select]')];
  const dialogs = new Map([...document.querySelectorAll<HTMLDialogElement>('[data-project-dialog]')].map(dialog => [dialog.dataset.projectDialog!, dialog]));
  const canOpenDialogs = typeof HTMLDialogElement !== 'undefined' && typeof HTMLDialogElement.prototype.showModal === 'function';
  let frame = 0;
  let resizeFrame = 0;
  let viewportSize = `${innerWidth}:${innerHeight}`;
  let stableView: ViewPosition | undefined;
  let modalOpen = false;
  let activeStage = -1;
  let heroOverride: World | null = null;
  let overrideScroll = 0;
  let activeDialog: HTMLDialogElement | null = null;
  let modalContext: ModalContext | null = null;
  let closePending = false;
  let bodyStyle = '';
  let overflow = '';
  let anchoring = '';
  let scrollBehavior = '';
  let restoration: ScrollRestoration = 'auto';
  let unlockVersion = 0;
  let finishUnlock: (() => void) | null = null;
  const sessions = new Map<string, ModalContext>();
  const pausedProgress = new Map<ChapterKey, number>();
  const motionEnabled = () => html.dataset.motion !== 'off';
  const cinematic = () => html.dataset.cinematic === 'on';
  const headerHeight = () => header?.getBoundingClientRect().height ?? 72;
  const railDistance = () => Math.max(0, (track?.scrollWidth ?? 0) - (viewport?.clientWidth ?? 0));
  const geometryKey = () => `${innerWidth}:${innerHeight}:${html.dataset.cinematic}:${headerHeight()}`;

  function syncMotionButton() {
    if (!motionButton) return;
    motionButton.setAttribute('aria-pressed', String(!motionEnabled()));
    motionButton.querySelector('span')!.textContent = motionEnabled() ? 'Pause motion' : 'Enable motion';
  }

  function syncWorld(world: World) {
    sceneButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.workbenchSelect === world)));
    document.querySelectorAll<HTMLElement>('[data-focus-caption]').forEach(caption => { caption.hidden = caption.dataset.focusCaption !== world; });
    document.querySelectorAll<HTMLElement>('[data-hero-phase]').forEach(copy => {
      const selected = copy.dataset.heroPhase === world;
      copy.hidden = !selected;
      copy.classList.toggle('is-active', selected);
    });
  }

  function stageProgress(stage: HTMLElement) {
    return clamp(stage.offsetLeft / Math.max(1, railDistance()));
  }

  function chapterScroll(chapter: Chapter, progress: number) {
    const top = chapter.element.getBoundingClientRect().top + window.scrollY - headerHeight();
    const distance = Math.max(1, chapter.element.offsetHeight - chapter.pin.offsetHeight);
    return Math.max(0, top + clamp(progress) * distance);
  }

  function visibleAmount(element: HTMLElement) {
    const bounds = element.getBoundingClientRect();
    return Math.max(0, Math.min(bounds.bottom, innerHeight) - Math.max(bounds.top, headerHeight()));
  }

  function visibleStage() {
    return [...stages].sort((a, b) => visibleAmount(b) - visibleAmount(a))[0];
  }

  function captureView(): ViewPosition {
    const sections = [...document.querySelectorAll<HTMLElement>('main > section, main > article')];
    const context = sections.sort((a, b) => visibleAmount(b) - visibleAmount(a))[0];
    const chapter = chapters.find(item => item.element === context);
    let reference = chapter?.pin ?? context;
    let stage: string | undefined;
    if (chapter?.key === 'projects') {
      reference = cinematic() ? stages[activeStage] ?? stages[0] : visibleStage();
      stage = reference?.dataset.projectStage;
    } else if (chapter?.key === 'career' && !cinematic()) {
      reference = [...beats].sort((a, b) => visibleAmount(b) - visibleAmount(a))[0] ?? reference;
    }
    return { reference, top: reference?.getBoundingClientRect().top, stage, chapter, progress: chapter?.progress, cinematic: cinematic() };
  }

  function preserveView(position: ViewPosition) {
    if (modalOpen) return;
    if (cinematic() && position.stage && projectChapter) {
      const stage = stages.find(item => item.dataset.projectStage === position.stage);
      if (stage) window.scrollTo({ top: chapterScroll(projectChapter, position.cinematic ? position.progress ?? stageProgress(stage) : stageProgress(stage)), behavior: 'instant' });
    } else if (cinematic() && position.cinematic && position.chapter && position.progress !== undefined) {
      window.scrollTo({ top: chapterScroll(position.chapter, position.progress), behavior: 'instant' });
    } else if (cinematic() && !position.cinematic && position.chapter && pausedProgress.has(position.chapter.key)) {
      window.scrollTo({ top: chapterScroll(position.chapter, pausedProgress.get(position.chapter.key)!), behavior: 'instant' });
    } else if (position.reference && position.top !== undefined) {
      window.scrollBy({ top: position.reference.getBoundingClientRect().top - position.top, behavior: 'instant' });
    }
  }

  function configureCinematic() {
    html.dataset.cinematic = desktop.matches && motionEnabled() ? 'on' : 'off';
    html.style.setProperty('--header-height', `${headerHeight()}px`);
    const distance = railDistance();
    projectChapter?.element.style.setProperty('--rail-distance', `${distance}px`);
    if (projectChapter) {
      if (cinematic()) projectChapter.element.style.height = `${Math.ceil(innerHeight + distance)}px`;
      else projectChapter.element.style.removeProperty('height');
    }
  }

  function changeMotion(enabled: boolean, persist = false) {
    const position = captureView();
    if (cinematic() && !enabled) chapters.forEach(chapter => pausedProgress.set(chapter.key, chapter.progress));
    const previousAnchoring = html.style.overflowAnchor;
    html.style.overflowAnchor = 'none';
    html.dataset.motion = enabled ? 'on' : 'off';
    if (persist) { try { localStorage.setItem('fieldbook-motion', html.dataset.motion); } catch {} }
    syncMotionButton();
    configureCinematic();
    preserveView(position);
    updateChapters(true);
    window.dispatchEvent(new CustomEvent('portfolio:motion', { detail: { enabled } }));
    requestAnimationFrame(() => { if (!modalOpen) html.style.overflowAnchor = previousAnchoring; });
  }

  const videos = [...document.querySelectorAll<HTMLVideoElement>('video[data-motion-video]')];
  const visibleVideos = new Set<HTMLVideoElement>();
  const manuallyPaused = new WeakSet<HTMLVideoElement>();
  const manuallyPlaying = new WeakSet<HTMLVideoElement>();
  const managedPause = new WeakSet<HTMLVideoElement>();
  const managedPlay = new WeakSet<HTMLVideoElement>();
  const saveData = () => !!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;

  function pauseVideo(video: HTMLVideoElement) {
    if (!video.paused) { managedPause.add(video); video.pause(); }
  }

  function updateVideo(video: HTMLVideoElement) {
    const dialog = video.closest<HTMLDialogElement>('dialog');
    const stage = video.closest<HTMLElement>('[data-project-stage]');
    const available = !document.hidden && visibleVideos.has(video)
      && (!dialog || dialog === activeDialog)
      && (!modalOpen || dialog === activeDialog)
      && (!stage || stage.dataset.active === 'true');
    if (!available) { pauseVideo(video); manuallyPlaying.delete(video); return; }
    if (manuallyPlaying.has(video)) return;
    if (motionEnabled() && !saveData() && !manuallyPaused.has(video)) {
      if (video.paused) {
        managedPlay.add(video);
        video.play().catch(() => { managedPlay.delete(video); });
      }
    } else pauseVideo(video);
  }

  function updateVideos() { videos.forEach(updateVideo); }

  function updateStage(index: number) {
    if (index === activeStage) return;
    activeStage = index;
    stages.forEach((stage, stageIndex) => {
      const selected = index === stageIndex;
      stage.dataset.active = String(selected);
      stage.classList.toggle('is-active', selected);
    });
    const selected = stages[index];
    document.querySelectorAll<HTMLAnchorElement>('[data-project-jump]').forEach(link => {
      const current = link.dataset.projectJump === selected?.dataset.projectStage;
      link.dataset.active = String(current);
      if (current) link.setAttribute('aria-current', 'true'); else link.removeAttribute('aria-current');
    });
    const position = document.querySelector('[data-project-position]');
    if (position && selected) position.textContent = selected.querySelector('h3')?.textContent ?? '';
    updateVideos();
  }

  function updateChapters(force = false) {
    if (modalOpen) return;
    // Scroll/ResizeObserver callbacks can run after the browser has resized but
    // before our resize handler. Do not replace the previous viewport snapshot.
    if (viewportSize !== `${innerWidth}:${innerHeight}`) { scheduleResize(); return; }
    if (cinematic() && viewport && viewport.scrollLeft !== 0) viewport.scrollLeft = 0;
    html.style.setProperty('--header-height', `${headerHeight()}px`);
    if (projectChapter) {
      const distance = railDistance();
      projectChapter.element.style.setProperty('--rail-distance', `${distance}px`);
      if (cinematic()) projectChapter.element.style.height = `${Math.ceil(innerHeight + distance)}px`;
    }
    chapters.forEach(chapter => {
      const bounds = chapter.element.getBoundingClientRect();
      const travel = Math.max(1, chapter.element.offsetHeight - chapter.pin.offsetHeight);
      chapter.active = bounds.bottom > headerHeight() && bounds.top < innerHeight;
      chapter.progress = cinematic() ? clamp((headerHeight() - bounds.top) / travel) : pausedProgress.get(chapter.key) ?? 0;
      chapter.element.style.setProperty('--progress', String(chapter.progress));
      chapter.element.dataset.progress = chapter.progress.toFixed(4);
      chapter.element.dataset.chapterActive = String(chapter.active);
      if (chapter.key === 'hero') {
        if (cinematic() && heroOverride && Math.abs(scrollY - overrideScroll) > 4) heroOverride = null;
        syncWorld(heroOverride ?? (chapter.progress < 0.34 ? 'lens' : chapter.progress < 0.67 ? 'circuit' : 'book'));
      }
      if (chapter.key === 'career') {
        const activeBeat = cinematic() || pausedProgress.has(chapter.key) ? Math.min(beats.length - 1, Math.floor(chapter.progress * beats.length)) : Math.max(0, beats.indexOf([...beats].sort((a, b) => visibleAmount(b) - visibleAmount(a))[0]));
        beats.forEach((beat, index) => { beat.classList.toggle('is-active', index === activeBeat); beat.dataset.active = String(index === activeBeat); });
      }
      if (chapter.key === 'projects' && stages.length) {
        if (cinematic()) {
          const location = chapter.progress * railDistance() + (viewport?.clientWidth ?? innerWidth) / 2;
          const index = stages.reduce((closest, stage, candidate) => Math.abs(stage.offsetLeft + stage.offsetWidth / 2 - location) < Math.abs(stages[closest].offsetLeft + stages[closest].offsetWidth / 2 - location) ? candidate : closest, 0);
          updateStage(index);
        } else updateStage(Math.max(0, stages.indexOf(visibleStage())));
      }
      if (force || Math.abs(chapter.progress - chapter.lastProgress) > 0.0001 || chapter.active !== chapter.lastActive) {
        window.dispatchEvent(new CustomEvent('portfolio:chapter', { detail: { key: chapter.key, progress: chapter.progress, active: chapter.active } }));
        chapter.lastProgress = chapter.progress;
        chapter.lastActive = chapter.active;
      }
    });
    stableView = captureView();
  }

  function scheduleUpdate() {
    if (frame || modalOpen) return;
    frame = requestAnimationFrame(() => { frame = 0; updateChapters(); });
  }

  function scheduleResize() {
    if (resizeFrame) return;
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0;
      const position = stableView ?? captureView();
      if (cinematic() && !desktop.matches) chapters.forEach(chapter => pausedProgress.set(chapter.key, chapter.progress));
      const previousAnchoring = html.style.overflowAnchor;
      html.style.overflowAnchor = 'none';
      viewportSize = `${innerWidth}:${innerHeight}`;
      configureCinematic(); preserveView(position); updateChapters(true);
      requestAnimationFrame(() => { if (!modalOpen) html.style.overflowAnchor = previousAnchoring; });
    });
  }

  function jumpToStage(slug: string, smooth = true) {
    const stage = stages.find(item => item.dataset.projectStage === slug);
    if (!stage || modalOpen) return;
    const top = cinematic() && projectChapter ? chapterScroll(projectChapter, stageProgress(stage)) : stage.getBoundingClientRect().top + scrollY - headerHeight() - 16;
    window.scrollTo({ top: Math.max(0, top), behavior: smooth && motionEnabled() ? 'smooth' : 'instant' });
    if (!smooth) updateChapters(true);
  }

  function historyData(): ProjectHistory | null {
    const state = history.state;
    return state && typeof state === 'object' && state.cinematicProject ? state.cinematicProject as ProjectHistory : null;
  }

  function stateWithoutProject() {
    const state = history.state && typeof history.state === 'object' ? { ...history.state } : {};
    delete state.cinematicProject;
    return state;
  }

  function hashProject() {
    const match = location.hash.match(/^#project\/([a-z0-9-]+)$/);
    return match && dialogs.has(match[1]) ? match[1] : null;
  }

  function findOpener(slug: string) {
    const candidates = [...document.querySelectorAll<HTMLElement>('[data-project-open]')]
      .filter(link => link.dataset.projectOpen === slug && !link.closest('dialog') && link.getAttribute('tabindex') !== '-1');
    return candidates.find(link => link.closest('[data-project-stage], .experiment-tile')) ?? candidates[0] ?? null;
  }

  function directContext(slug: string): ModalContext {
    const stage = stages.find(item => item.dataset.projectStage === slug);
    const opener = findOpener(slug);
    const target = stage ?? opener?.closest<HTMLElement>('.experiment-tile') ?? opener;
    const y = stage && cinematic() && projectChapter ? chapterScroll(projectChapter, stageProgress(stage)) : Math.max(0, (target?.getBoundingClientRect().top ?? 0) + scrollY - headerHeight() - 16);
    return { session: null, returnUrl: stage ? '/#work' : '/#experiments', scrollY: y, opener, geometry: geometryKey(), view: stage ? { stage: slug, reference: stage } : { reference: target ?? undefined } };
  }

  function lockBackground() {
    finishUnlock?.();
    unlockVersion++;
    bodyStyle = document.body.style.cssText;
    overflow = html.style.overflow;
    anchoring = html.style.overflowAnchor;
    scrollBehavior = html.style.scrollBehavior;
    restoration = history.scrollRestoration;
    history.scrollRestoration = 'manual';
    html.style.overflowAnchor = 'none';
    html.style.scrollBehavior = 'auto';
    html.style.overflow = 'hidden';
    const y = scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `${-y}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
  }

  function unlockBackground(context: ModalContext) {
    const version = ++unlockVersion;
    document.body.style.cssText = bodyStyle;
    html.style.overflow = overflow;
    configureCinematic();
    // A desktop pixel offset is meaningless after rotation, resize, or a motion
    // preference change. Keep the project/chapter instead; unchanged geometry
    // still returns to the exact saved pixel and original focused control.
    if (context.geometry !== geometryKey()) {
      const stage = stages.find(item => item.dataset.projectStage === context.view?.stage)
        ?? context.opener?.closest<HTMLElement>('[data-project-stage]');
      if (stage && cinematic() && projectChapter) {
        context.scrollY = chapterScroll(projectChapter, stageProgress(stage));
      } else {
        const target = stage ?? context.opener?.closest<HTMLElement>('.experiment-tile') ?? context.view?.reference ?? context.opener;
        if (target) context.scrollY = Math.max(0, target.getBoundingClientRect().top + scrollY - headerHeight() - 16);
      }
      context.geometry = geometryKey();
    }
    window.scrollTo({ top: context.scrollY, behavior: 'instant' });
    const originalAnchoring = anchoring;
    const originalBehavior = scrollBehavior;
    const originalRestoration = restoration;
    finishUnlock = () => {
      html.style.overflowAnchor = originalAnchoring;
      html.style.scrollBehavior = originalBehavior;
      history.scrollRestoration = originalRestoration;
      finishUnlock = null;
    };
    requestAnimationFrame(() => {
      if (version !== unlockVersion || modalOpen) return;
      window.scrollTo({ top: context.scrollY, behavior: 'instant' });
      requestAnimationFrame(() => {
        if (version === unlockVersion && !modalOpen) {
          finishUnlock?.();
          // Native Back can focus its fragment target after popstate handlers.
          // Restore the opener after that traversal, without moving the page.
          context.opener?.focus({ preventScroll: true });
        }
      });
    });
  }

  function showProject(slug: string, context: ModalContext) {
    const dialog = dialogs.get(slug);
    if (!dialog || !canOpenDialogs) return;
    closePending = false;
    if (!modalOpen) {
      modalContext = context;
      modalOpen = true;
      html.dataset.modal = 'open';
      window.dispatchEvent(new CustomEvent('portfolio:modal', { detail: { open: true } }));
      cancelAnimationFrame(frame); frame = 0;
      lockBackground();
    }
    if (activeDialog && activeDialog !== dialog) {
      activeDialog.querySelectorAll('video').forEach(pauseVideo);
      const previous = activeDialog;
      activeDialog = null;
      previous.close();
    }
    activeDialog = dialog;
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    const content = dialog.querySelector<HTMLElement>('.dialog-content');
    if (content) content.scrollTop = 0;
    dialog.querySelector<HTMLElement>('.detail-title')?.focus({ preventScroll: true });
    updateVideos();
  }

  function hideProject() {
    const dialog = activeDialog;
    const context = modalContext;
    activeDialog = null;
    if (dialog) { dialog.querySelectorAll('video').forEach(pauseVideo); if (dialog.open) dialog.close(); }
    modalOpen = false;
    closePending = false;
    html.dataset.modal = 'closed';
    if (context) {
      unlockBackground(context);
      context.opener?.focus({ preventScroll: true });
    }
    modalContext = null;
    updateChapters(true);
    window.dispatchEvent(new CustomEvent('portfolio:modal', { detail: { open: false } }));
    updateVideos();
  }

  function openProject(slug: string, opener: HTMLElement) {
    if (!dialogs.has(slug) || !canOpenDialogs) return;
    if (modalOpen && modalContext) {
      const data = historyData();
      history.replaceState({ ...(history.state ?? {}), cinematicProject: { ...data, slug } }, '', `#project/${slug}`);
      showProject(slug, modalContext);
      return;
    }
    const session = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const context: ModalContext = { session, returnUrl: location.pathname + location.search + location.hash, scrollY, opener, geometry: geometryKey(), view: captureView() };
    sessions.set(session, context);
    const data: ProjectHistory = { session, slug, returnUrl: context.returnUrl, scrollY: context.scrollY };
    history.pushState({ ...(history.state ?? {}), cinematicProject: data }, '', `#project/${slug}`);
    showProject(slug, context);
  }

  function requestClose() {
    if (!activeDialog || closePending) return;
    closePending = true;
    const data = historyData();
    if (data && modalContext?.session === data.session && sessions.has(data.session)) {
      history.back();
    } else {
      const url = modalContext?.returnUrl ?? '/#work';
      history.replaceState(stateWithoutProject(), '', url);
      hideProject();
    }
  }

  function reconcileLocation(event?: Event) {
    const wasModal = modalOpen;
    const slug = hashProject();
    if (slug && canOpenDialogs) {
      const data = historyData();
      const context = data ? sessions.get(data.session) : undefined;
      showProject(slug, context ?? directContext(slug));
    } else if (modalOpen) hideProject();
    const stage = location.hash.match(/^#stage-([a-z0-9-]+)$/)?.[1];
    // Back emits both popstate and hashchange. The saved scroll position is
    // authoritative when returning from a dialog, even if its origin has a
    // stage fragment and the visitor has scrolled beyond that stage's start.
    const returnedFromModal = event instanceof HashChangeEvent && !!event.oldURL && new URL(event.oldURL, location.href).hash.startsWith('#project/');
    if (stage && !wasModal && !returnedFromModal) jumpToStage(stage, false);
  }

  const menu = document.querySelector<HTMLButtonElement>('.menu-toggle');
  const nav = document.querySelector<HTMLElement>('.site-nav');
  const closeMenu = () => { menu?.setAttribute('aria-expanded', 'false'); nav?.classList.remove('is-open'); };
  menu?.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open)); nav?.classList.toggle('is-open', open);
  });
  nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu?.getAttribute('aria-expanded') === 'true') { closeMenu(); menu.focus({ preventScroll: true }); }
  });

  sceneButtons.forEach(button => button.addEventListener('click', () => {
    const world = button.dataset.workbenchSelect as World;
    heroOverride = world;
    overrideScroll = scrollY;
    syncWorld(world);
    window.dispatchEvent(new CustomEvent('workbench:select', { detail: world }));
  }));
  window.addEventListener('workbench:focus', ((event: CustomEvent<World>) => syncWorld(event.detail)) as EventListener);
  motionButton?.addEventListener('click', () => changeMotion(!motionEnabled(), true));
  preference.addEventListener('change', () => {
    let saved: string | null = null;
    try { saved = localStorage.getItem('fieldbook-motion'); } catch {}
    if (!saved) changeMotion(!preference.matches);
  });
  desktop.addEventListener('change', scheduleResize);
  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleResize, { passive: true });
  document.addEventListener('focusin', event => {
    if (!cinematic() || modalOpen || !(event.target instanceof HTMLElement)) return;
    const stage = event.target.closest<HTMLElement>('[data-project-stage]');
    if (stage && stage.dataset.active !== 'true') jumpToStage(stage.dataset.projectStage!, false);
    if (stage && viewport) viewport.scrollLeft = 0;
  });
  document.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !(event.target instanceof Element)) return;
    const opener = event.target.closest<HTMLAnchorElement>('a[data-project-open]');
    if (opener && canOpenDialogs && dialogs.has(opener.dataset.projectOpen!)) {
      event.preventDefault(); closeMenu(); openProject(opener.dataset.projectOpen!, opener); return;
    }
    const jump = event.target.closest<HTMLAnchorElement>('a[data-project-jump]');
    if (jump) {
      event.preventDefault();
      history.pushState(stateWithoutProject(), '', jump.getAttribute('href'));
      jumpToStage(jump.dataset.projectJump!);
    }
  });
  dialogs.forEach(dialog => {
    dialog.querySelector<HTMLButtonElement>('[data-dialog-close]')?.addEventListener('click', requestClose);
    dialog.addEventListener('cancel', event => { event.preventDefault(); requestClose(); });
    dialog.addEventListener('close', () => { if (activeDialog === dialog && modalOpen) requestClose(); });
    let backdropDown = false;
    const outside = (event: PointerEvent) => {
      const bounds = dialog.getBoundingClientRect();
      return event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
    };
    dialog.addEventListener('pointerdown', event => { backdropDown = event.target === dialog && outside(event); });
    dialog.addEventListener('pointerup', event => { if (backdropDown && event.target === dialog && outside(event)) requestClose(); backdropDown = false; });
  });
  window.addEventListener('popstate', reconcileLocation);
  window.addEventListener('hashchange', reconcileLocation);

  const videoObserver = new IntersectionObserver(entries => entries.forEach(entry => {
    const video = entry.target as HTMLVideoElement;
    if (entry.isIntersecting) visibleVideos.add(video); else visibleVideos.delete(video);
    updateVideo(video);
  }), { threshold: 0.25 });
  videos.forEach(video => {
    video.addEventListener('pause', () => {
      if (managedPause.has(video)) managedPause.delete(video);
      else { manuallyPaused.add(video); manuallyPlaying.delete(video); }
    });
    video.addEventListener('play', () => {
      if (managedPlay.has(video)) managedPlay.delete(video); else manuallyPlaying.add(video);
      manuallyPaused.delete(video);
      if (document.hidden || (modalOpen && video.closest('dialog') !== activeDialog)) pauseVideo(video);
    });
    videoObserver.observe(video);
  });
  window.addEventListener('portfolio:motion', updateVideos);
  document.addEventListener('visibilitychange', updateVideos);
  const resizeObserver = new ResizeObserver(scheduleUpdate);
  if (viewport) resizeObserver.observe(viewport);
  if (track) resizeObserver.observe(track);
  document.fonts.ready.then(scheduleUpdate);
  configureCinematic();
  syncMotionButton();
  updateChapters(true);
  html.dataset.experienceReady = 'true';
  reconcileLocation();
  const initialStageHash = location.hash;
  if (initialStageHash.startsWith('#stage-')) {
    const loaded = document.readyState === 'complete' ? Promise.resolve() : new Promise<void>(resolve => window.addEventListener('load', () => resolve(), { once: true }));
    Promise.all([document.fonts.ready, loaded]).then(() => requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!modalOpen && location.hash === initialStageHash) jumpToStage(initialStageHash.slice(7), false);
    })));
  }
}
