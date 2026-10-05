/** Native scroll drives one local scene; navigation never changes its pose. */
export const scrollSignal = {
  chapter: 0,
  progress: 0,
  reducedMotion: false,
  visible: false,
};

const subscribers = new Set<() => void>();
export function subscribeToScroll(callback: () => void) {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}
export function notifyScroll() {
  subscribers.forEach((callback) => callback());
}

const clamp = (value: number) => Math.max(0, Math.min(1, value));

export function connectScroll(stage: HTMLElement) {
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const story = document.getElementById("core");
  const sticky = story?.querySelector<HTMLElement>(".core-sticky");
  const sections = Array.from(
    document.querySelectorAll<HTMLElement>("[data-chapter]"),
  );
  const navigation = Array.from(
    document.querySelectorAll<HTMLAnchorElement>(".nav-links a"),
  );
  const header = document.querySelector<HTMLElement>(".site-header");
  let frame = 0;
  let disposed = false;
  let positions: number[] = [];
  let chapter = -1;
  let storyTop = 0;
  let storyTravel = 1;
  let stickyTop = 0;
  let hasSticky = true;

  const update = () => {
    frame = 0;
    if (disposed) return;
    document.documentElement.dataset.enhanced = "true";
    const midpoint = window.scrollY + window.innerHeight * 0.42;
    let active = 0;
    for (let i = 0; i < positions.length; i++)
      if (midpoint >= positions[i]) active = i;
    const section = sections[active];
    scrollSignal.chapter = Number(section?.dataset.chapter ?? 0);
    scrollSignal.reducedMotion = motion.matches;
    // Flow layouts (short landscape/static) show the finished assembly.
    scrollSignal.progress =
      motion.matches || !hasSticky
        ? 1
        : clamp((window.scrollY - storyTop + stickyTop) / storyTravel);
    const rect = stage.getBoundingClientRect();
    scrollSignal.visible =
      !document.hidden &&
      rect.width > 0 &&
      rect.height > 0 &&
      rect.bottom > 0 &&
      rect.top < innerHeight &&
      rect.right > 0 &&
      rect.left < innerWidth;
    stage.dataset.visible = String(scrollSignal.visible);
    const progress = scrollSignal.progress.toFixed(5);
    const phase =
      scrollSignal.progress < 0.3
        ? "hardware"
        : scrollSignal.progress < 0.67
          ? "intelligence"
          : "interaction";
    stage.dataset.coreProgress = progress;
    stage.dataset.corePhase = phase;
    if (story) {
      story.dataset.coreProgress = progress;
      story.dataset.corePhase = phase;
      story.style.setProperty("--core-progress", progress);
    }
    document.documentElement.dataset.scrolled = String(window.scrollY > 40);
    header?.style.setProperty(
      "--page-progress",
      String(
        window.scrollY /
          Math.max(1, document.documentElement.scrollHeight - innerHeight),
      ),
    );
    if (chapter !== active) {
      chapter = active;
      const navId = section?.dataset.nav ?? section?.id;
      navigation.forEach((link) => {
        if (link.hash === `#${navId}`)
          link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    }
    notifyScroll();
  };
  const queue = () => {
    if (!frame && !disposed) frame = requestAnimationFrame(update);
  };
  const measure = () => {
    if (disposed) return;
    positions = sections.map(
      (section) => section.getBoundingClientRect().top + window.scrollY,
    );
    if (story && sticky) {
      storyTop = story.getBoundingClientRect().top + window.scrollY;
      const style = getComputedStyle(sticky);
      hasSticky = style.position === "sticky";
      stickyTop = Number.parseFloat(style.top) || 0;
      storyTravel = Math.max(1, story.offsetHeight - sticky.offsetHeight);
    }
    queue();
  };
  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", measure);
  document.addEventListener("visibilitychange", queue);
  motion.addEventListener("change", measure);
  const observer = new ResizeObserver(measure);
  sections.forEach((section) => observer.observe(section));
  if (story) observer.observe(story);
  if (sticky) observer.observe(sticky);
  observer.observe(stage);
  document.fonts.ready.then(measure);
  measure();
  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    window.removeEventListener("scroll", queue);
    window.removeEventListener("resize", measure);
    document.removeEventListener("visibilitychange", queue);
    motion.removeEventListener("change", measure);
  };
}
