/** Native scrolling stays in charge. DOM and WebGL consume this single mutable signal. */
export const scrollSignal = {
  chapter: 0,
  progress: 0,
  pointerX: 0,
  pointerY: 0,
  expanded: false,
  reducedMotion: false,
  visible: true,
  project: 0,
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

export function connectScroll(stage: HTMLElement) {
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const mobile = matchMedia("(max-width: 760px)");
  const touch = matchMedia("(pointer: coarse)");
  const sections = Array.from(
    document.querySelectorAll<HTMLElement>("[data-chapter]"),
  );
  const anchors = Array.from(
    document.querySelectorAll<HTMLElement>("[data-core-anchor]"),
  );
  const navigation = Array.from(
    document.querySelectorAll<HTMLAnchorElement>(".nav-links a"),
  );
  const header = document.querySelector<HTMLElement>(".site-header");
  let frame = 0;
  let positions: number[] = [];
  let chapter = -1;
  const measure = () => {
    positions = sections.map(
      (section) => section.getBoundingClientRect().top + window.scrollY,
    );
    queue();
  };
  const update = () => {
    frame = 0;
    document.documentElement.dataset.enhanced = "true";
    const midpoint = window.scrollY + window.innerHeight * 0.42;
    let active = 0;
    for (let i = 0; i < positions.length; i++)
      if (midpoint >= positions[i]) active = i;
    const section = sections[active];
    scrollSignal.chapter = Number(section?.dataset.chapter ?? 0);
    scrollSignal.project = Number(section?.dataset.project ?? 0);
    scrollSignal.progress = Math.max(
      0,
      Math.min(
        1,
        (midpoint - positions[active]) /
          ((positions[active + 1] ?? document.documentElement.scrollHeight) -
            positions[active]),
      ),
    );
    scrollSignal.reducedMotion = motion.matches;
    const anchor =
      mobile.matches || motion.matches
        ? anchors[0]
        : (section?.querySelector<HTMLElement>("[data-core-anchor]") ??
          anchors[0]);
    if (anchor) {
      const rect = anchor.getBoundingClientRect();
      const size = Math.min(rect.width, rect.height);
      stage.style.width = `${size}px`;
      stage.style.height = `${size}px`;
      stage.style.transform = `translate3d(${rect.left + (rect.width - size) / 2}px,${rect.top + (rect.height - size) / 2}px,0)`;
      scrollSignal.visible =
        !document.hidden &&
        rect.bottom > 0 &&
        rect.top < innerHeight &&
        size > 0;
      stage.dataset.visible = String(scrollSignal.visible);
    }
    stage.dataset.chapter = String(scrollSignal.chapter);
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
        const current = link.hash === `#${navId}`;
        if (current) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    }
    notifyScroll();
  };
  const queue = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  const pointer = (event: PointerEvent) => {
    if (touch.matches || motion.matches) return;
    scrollSignal.pointerX = (event.clientX / innerWidth) * 2 - 1;
    scrollSignal.pointerY = (event.clientY / innerHeight) * 2 - 1;
    notifyScroll();
  };
  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", measure);
  window.addEventListener("pointermove", pointer, { passive: true });
  document.addEventListener("visibilitychange", queue);
  motion.addEventListener("change", measure);
  mobile.addEventListener("change", measure);
  const observer = new ResizeObserver(measure);
  sections.forEach((section) => observer.observe(section));
  document.fonts.ready.then(measure);
  measure();
  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    window.removeEventListener("scroll", queue);
    window.removeEventListener("resize", measure);
    window.removeEventListener("pointermove", pointer);
    document.removeEventListener("visibilitychange", queue);
    motion.removeEventListener("change", measure);
    mobile.removeEventListener("change", measure);
  };
}
