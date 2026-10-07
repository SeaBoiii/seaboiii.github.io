import { Component, useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import WorkbenchScene, { type WorkbenchControls, type WorkbenchObject } from './WorkbenchScene';

interface CaptureController {
  canvas: HTMLCanvasElement;
  setProgress(progress: number): Promise<void>;
  setProgressAsync(progress: number): Promise<void>;
  reset(): void;
}

declare global {
  interface Window { __workbenchCapture?: CaptureController }
}

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

function InputController({ controls, container }: { controls: RefObject<WorkbenchControls>; container: RefObject<HTMLDivElement | null> }) {
  const { invalidate, gl } = useThree();
  useEffect(() => {
    const section = container.current?.closest<HTMLElement>('[data-workbench]') ?? document.getElementById('workbench');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const desktop = window.matchMedia('(min-width: 1024px)');
    let scrollFrame = 0;
    let lastScrollY = window.scrollY;
    let lastPhase: WorkbenchObject | null = null;
    const focus = (key: WorkbenchObject) => {
      if (lastPhase === key) return;
      lastPhase = key;
      window.dispatchEvent(new CustomEvent('workbench:focus', { detail: key }));
    };
    const updateMotion = (event?: Event) => {
      const enabled = (event as CustomEvent<{ enabled?: boolean }> | undefined)?.detail?.enabled;
      const preference = document.documentElement.dataset.motion;
      controls.current.motion = typeof enabled === 'boolean' ? enabled : preference === 'on' || (preference !== 'off' && !reducedMotion.matches);
      invalidate();
    };
    const scroll = () => {
      if (scrollFrame || controls.current.capture || !controls.current.visible) return;
      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = 0;
        if (!section || !desktop.matches) { controls.current.progress = 0; invalidate(); return; }
        const bounds = section.getBoundingClientRect();
        const distance = Math.max(1, bounds.height - window.innerHeight);
        controls.current.progress = Math.max(0, Math.min(1, -bounds.top / distance));
        if (Math.abs(window.scrollY - lastScrollY) > 3) controls.current.selected = null;
        lastScrollY = window.scrollY;
        if (!controls.current.selected) focus(controls.current.progress < 0.34 ? 'lens' : controls.current.progress < 0.67 ? 'circuit' : 'book');
        invalidate();
      });
    };
    const pointer = (event: PointerEvent) => {
      if (!finePointer.matches || !controls.current.motion || !controls.current.visible || controls.current.capture) return;
      const bounds = container.current?.getBoundingClientRect();
      if (!bounds) return;
      controls.current.pointerX = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width - 0.5) * 2));
      controls.current.pointerY = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height - 0.5) * 2));
      invalidate();
    };
    const leave = () => { controls.current.pointerX = 0; controls.current.pointerY = 0; invalidate(); };
    const select = (event: Event) => {
      const detail = (event as CustomEvent<WorkbenchObject | { key?: WorkbenchObject }>).detail;
      const key = typeof detail === 'string' ? detail : detail?.key;
      if (key !== 'lens' && key !== 'circuit' && key !== 'book') return;
      controls.current.selected = key;
      focus(key);
      invalidate();
    };
    const visibility = () => {
      const bounds = container.current?.getBoundingClientRect();
      controls.current.visible = !document.hidden && !!bounds && bounds.bottom > 0 && bounds.top < window.innerHeight;
      if (controls.current.visible) { scroll(); invalidate(); }
    };
    const observer = new IntersectionObserver(entries => {
      controls.current.visible = entries[0].isIntersecting && !document.hidden;
      if (controls.current.visible) { scroll(); invalidate(); }
    }, { rootMargin: '80px' });
    if (container.current) observer.observe(container.current);
    updateMotion();
    scroll();
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('resize', scroll, { passive: true });
    window.addEventListener('workbench:select', select);
    window.addEventListener('portfolio:motion', updateMotion);
    reducedMotion.addEventListener('change', updateMotion);
    document.addEventListener('visibilitychange', visibility);
    container.current?.addEventListener('pointermove', pointer, { passive: true });
    container.current?.addEventListener('pointerleave', leave);
    const setProgress = (progress: number) => {
      controls.current.capture = true;
      controls.current.selected = null;
      controls.current.pointerX = 0;
      controls.current.pointerY = 0;
      controls.current.progress = Math.max(0, Math.min(1, progress));
      focus(progress < 0.34 ? 'lens' : progress < 0.67 ? 'circuit' : 'book');
      invalidate();
      return new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    };
    const capture: CaptureController = {
      canvas: gl.domElement,
      setProgress,
      setProgressAsync: setProgress,
      reset() { controls.current.capture = false; scroll(); invalidate(); },
    };
    window.__workbenchCapture = capture;
    return () => {
      observer.disconnect();
      cancelAnimationFrame(scrollFrame);
      window.removeEventListener('scroll', scroll);
      window.removeEventListener('resize', scroll);
      window.removeEventListener('workbench:select', select);
      window.removeEventListener('portfolio:motion', updateMotion);
      reducedMotion.removeEventListener('change', updateMotion);
      document.removeEventListener('visibilitychange', visibility);
      container.current?.removeEventListener('pointermove', pointer);
      container.current?.removeEventListener('pointerleave', leave);
      if (window.__workbenchCapture === capture) delete window.__workbenchCapture;
    };
  }, [controls, container, gl, invalidate]);
  return null;
}

export default function Workbench() {
  const container = useRef<HTMLDivElement>(null);
  const controls = useRef<WorkbenchControls>({ progress: 0, selected: null, pointerX: 0, pointerY: 0, motion: true, visible: true, capture: false });
  const [supported, setSupported] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const ready = useCallback(() => setStatus('ready'), []);
  const fail = useCallback(() => { setStatus('fallback'); setSupported(false); }, []);
  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (connection?.saveData || !canRenderWebGL()) { fail(); return; }
    setSupported(true);
  }, [fail]);
  useEffect(() => {
    if (!supported) return;
    const canvas = container.current?.querySelector('canvas');
    if (!canvas) return;
    const lost = (event: Event) => { event.preventDefault(); fail(); };
    canvas.addEventListener('webglcontextlost', lost);
    return () => canvas.removeEventListener('webglcontextlost', lost);
  }, [supported, status, fail]);
  return (
    <div ref={container} className="workbench-canvas" data-scene-status={status} style={{ width: '100%', height: '100%', minHeight: '260px', position: 'relative', isolation: 'isolate' }}>
      <img className="workbench-fallback" src="/showcase-assets/media/workbench-poster.webp" alt="A camera lens, a detailed circuit board and a book on a bright creative workbench." decoding="async" fetchPriority="high" width={1600} height={900} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', opacity: status === 'ready' ? 0 : 1, pointerEvents: 'none' }} />
      {supported && <SceneBoundary onError={fail}>
        <Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ position: [0, 2.25, 8.6], fov: 36, near: 0.1, far: 40 }} gl={{ antialias: true, alpha: true, powerPreference: 'low-power', failIfMajorPerformanceCaveat: true }} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: status === 'ready' ? 1 : 0, touchAction: 'pan-y' }} aria-hidden="true" onCreated={({ gl, camera }) => { gl.setClearAlpha(0); camera.lookAt(0, 0, 0); }}>
          <WorkbenchScene controls={controls} ready={ready} />
          <InputController controls={controls} container={container} />
        </Canvas>
      </SceneBoundary>}
    </div>
  );
}
