import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { WorkbenchControls, WorkbenchObject } from './WorkbenchScene';

// The WebGL runtime is a separate chunk. Capability checks precede its download.
const WorkbenchCanvas = lazy(() => import('./WorkbenchScene'));
export interface CaptureController {
  canvas: HTMLCanvasElement;
  setProgress(progress: number): Promise<void>;
  setProgressAsync(progress: number): Promise<void>;
  reset(): void;
}
declare global { interface Window { __workbenchCapture?: CaptureController } }

class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}
function canRenderWebGL() {
  const canvas = document.createElement('canvas');
  try {
    const context = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true });
    if (!context) return false;
    context.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch { return false; }
}
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const phaseAt = (progress: number): WorkbenchObject => progress < 0.34 ? 'lens' : progress < 0.67 ? 'circuit' : 'book';

export default function Workbench() {
  const container = useRef<HTMLDivElement>(null);
  const controls = useRef<WorkbenchControls>({ progress: 0, selected: null, pointerX: 0, pointerY: 0, motion: true, cinematic: true, visible: true, chapterActive: true, modal: false, capture: false });
  const [supported, setSupported] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const capability = useRef<boolean | null>(null);
  const ready = useCallback(() => setStatus('ready'), []);
  const fail = useCallback(() => { setStatus('fallback'); setSupported(false); }, []);
  const activate = useCallback(() => {
    if (capability.current === null) {
      const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
      capability.current = !connection?.saveData && canRenderWebGL();
    }
    if (!capability.current) { fail(); return; }
    setSupported(true);
  }, [fail]);
  useEffect(() => { if (document.documentElement.dataset.modal !== 'open') activate(); }, [activate]);
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    let phase: WorkbenchObject = 'lens';
    let intersecting = true;
    const invalidate = () => controls.current.invalidate?.();
    const refreshVisibility = () => {
      controls.current.visible = intersecting && !document.hidden && controls.current.chapterActive;
      if (controls.current.visible && !controls.current.modal) invalidate();
    };
    const focus = (key: WorkbenchObject) => {
      if (phase === key) return;
      phase = key;
      window.dispatchEvent(new CustomEvent('workbench:focus', { detail: key }));
    };
    const motion = (event?: Event) => {
      const enabled = (event as CustomEvent<{ enabled?: boolean }> | undefined)?.detail?.enabled;
      const preference = document.documentElement.dataset.motion;
      controls.current.motion = typeof enabled === 'boolean' ? enabled : preference === 'on' || (preference !== 'off' && !reduced.matches);
      controls.current.cinematic = document.documentElement.dataset.cinematic !== 'off';
      invalidate();
    };
    const chapter = (event: Event) => {
      const detail = (event as CustomEvent<{ key: string; progress: number; active: boolean }>).detail;
      if (detail?.key !== 'hero' || controls.current.capture) return;
      const next = Number.isFinite(detail.progress) ? clamp(detail.progress) : 0;
      if (Math.abs(next - controls.current.progress) > 0.002) controls.current.selected = null;
      controls.current.progress = next;
      controls.current.chapterActive = detail.active;
      controls.current.cinematic = document.documentElement.dataset.cinematic !== 'off';
      if (controls.current.motion && controls.current.cinematic && !controls.current.selected) focus(phaseAt(next));
      refreshVisibility();
    };
    const select = (event: Event) => {
      const detail = (event as CustomEvent<WorkbenchObject | { key?: WorkbenchObject }>).detail;
      const key = typeof detail === 'string' ? detail : detail?.key;
      if (key !== 'lens' && key !== 'circuit' && key !== 'book') return;
      controls.current.selected = key;
      focus(key);
      invalidate();
    };
    const modal = (event: Event) => {
      controls.current.modal = !!(event as CustomEvent<{ open?: boolean }>).detail?.open;
      if (!controls.current.modal) { activate(); invalidate(); }
    };
    const pointer = (event: PointerEvent) => {
      const state = controls.current;
      if (!finePointer.matches || !state.motion || !state.cinematic || !state.visible || state.modal || state.capture) return;
      const bounds = container.current?.getBoundingClientRect();
      if (!bounds) return;
      state.pointerX = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width - 0.72) * 2));
      state.pointerY = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height - 0.5) * 2));
      invalidate();
    };
    const leave = () => { controls.current.pointerX = 0; controls.current.pointerY = 0; invalidate(); };
    const observer = new IntersectionObserver(entries => { intersecting = entries[0].isIntersecting; refreshVisibility(); }, { rootMargin: '80px' });
    const node = container.current;
    if (node) observer.observe(node);
    const datasets = new MutationObserver(() => motion());
    datasets.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion', 'data-cinematic'] });
    const initialChapter = document.querySelector<HTMLElement>('[data-scroll-chapter="hero"]');
    const initialProgress = Number(initialChapter?.dataset.progress ?? 0);
    controls.current.progress = Number.isFinite(initialProgress) ? clamp(initialProgress) : 0;
    controls.current.chapterActive = initialChapter?.dataset.chapterActive !== 'false';
    controls.current.modal = document.documentElement.dataset.modal === 'open';
    motion();
    // A world may be selected while this lazy island is still downloading.
    const initialWorld = document.querySelector<HTMLButtonElement>('[data-workbench-select][aria-pressed="true"]')?.dataset.workbenchSelect;
    if (initialWorld === 'lens' || initialWorld === 'circuit' || initialWorld === 'book') {
      if (initialWorld !== phaseAt(controls.current.progress) || (!controls.current.cinematic && initialWorld !== 'lens')) controls.current.selected = initialWorld;
      focus(initialWorld);
    } else if (controls.current.motion && controls.current.cinematic) focus(phaseAt(controls.current.progress));
    refreshVisibility();
    window.addEventListener('portfolio:chapter', chapter);
    window.addEventListener('portfolio:motion', motion);
    window.addEventListener('portfolio:modal', modal);
    window.addEventListener('workbench:select', select);
    document.addEventListener('visibilitychange', refreshVisibility);
    reduced.addEventListener('change', motion);
    node?.addEventListener('pointermove', pointer, { passive: true });
    node?.addEventListener('pointerleave', leave);
    return () => {
      observer.disconnect(); datasets.disconnect();
      window.removeEventListener('portfolio:chapter', chapter);
      window.removeEventListener('portfolio:motion', motion);
      window.removeEventListener('portfolio:modal', modal);
      window.removeEventListener('workbench:select', select);
      document.removeEventListener('visibilitychange', refreshVisibility);
      reduced.removeEventListener('change', motion);
      node?.removeEventListener('pointermove', pointer);
      node?.removeEventListener('pointerleave', leave);
    };
  }, [activate]);
  return <div ref={container} className="workbench-canvas" data-scene-status={status} style={{ width: '100%', height: '100%', minHeight: '320px', position: 'relative', isolation: 'isolate' }}>
    <picture><source media="(max-width: 899px)" srcSet="/showcase-assets/media/workbench-poster-mobile.webp" /><img className="workbench-fallback" src="/showcase-assets/media/workbench-poster.webp" alt="A precision lens, lit in silver and ice blue against a carbon background." decoding="async" fetchPriority="high" width={1600} height={1000} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', opacity: status === 'ready' ? 0 : 1, pointerEvents: 'none' }} /></picture>
    {supported && <SceneBoundary onError={fail}><Suspense fallback={null}><WorkbenchCanvas controls={controls} ready={ready} fail={fail} /></Suspense></SceneBoundary>}
  </div>;
}
