import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import {
  CanvasTexture, CatmullRomCurve3, Group, Shape,
  PMREMGenerator, SRGBColorSpace, TubeGeometry, Vector3,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export type WorkbenchObject = 'lens' | 'circuit' | 'book';
export interface WorkbenchControls {
  progress: number;
  selected: WorkbenchObject | null;
  pointerX: number;
  pointerY: number;
  motion: boolean;
  cinematic: boolean;
  visible: boolean;
  chapterActive: boolean;
  modal: boolean;
  capture: boolean;
  invalidate?: () => void;
}

const palette = { ink: '#0b1016', blue: '#071720', teal: '#80cbe8', silver: '#b9c8d5', paper: '#dce5e9' };
const smooth = (value: number) => value * value * (3 - 2 * value);
const pulse = (value: number, center: number, radius: number) => smooth(Math.max(0, 1 - Math.abs(value - center) / radius));
const range = (start: number, end: number, value: number) => smooth(Math.max(0, Math.min(1, (value - start) / (end - start))));

function makeInscription(lines: string[], background: string, ink: string, font = '600 47px sans-serif') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = background;
    context.fillRect(0, 0, 512, 512);
    context.fillStyle = ink;
    context.font = font;
    context.textAlign = 'left';
    context.textBaseline = 'middle';
    lines.forEach((line, index) => context.fillText(line, 65, 145 + index * 69));
    context.fillRect(65, 408, 76, 3);
    context.font = '400 20px sans-serif';
    context.fillText('A CREATIVE PRACTICE', 65, 450);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function Ring({ radius, tube = 0.025, z, color = palette.silver }: { radius: number; tube?: number; z: number; color?: string }) {
  return (
    <mesh position={[0, 0, z]} castShadow>
      <torusGeometry args={[radius, tube, 10, 72]} />
      <meshStandardMaterial color={color} metalness={0.78} roughness={0.28} />
    </mesh>
  );
}

function Lens({ optic, glass, mount }: { optic: RefObject<Group | null>; glass: RefObject<Group | null>; mount: RefObject<Group | null> }) {
  const blade = useMemo(() => {
    const shape = new Shape();
    shape.moveTo(0.08, 0.04); shape.lineTo(0.26, 0.33); shape.lineTo(0.47, 0.18); shape.lineTo(0.33, -0.04); shape.closePath();
    return shape;
  }, []);
  return (
    <group rotation={[0.02, -0.22, -0.13]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.08]} castShadow>
        <cylinderGeometry args={[0.67, 0.62, 1.13, 72]} />
        <meshStandardMaterial color={palette.ink} metalness={0.83} roughness={0.24} />
      </mesh>
      {Array.from({ length: 22 }, (_, index) => <Ring key={index} radius={0.672} tube={0.013} z={-0.37 + index * 0.025} color={index === 3 ? palette.teal : '#17242f'} />)}
      <group ref={mount}>
        <Ring radius={0.61} tube={0.035} z={-0.67} />
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.675]}><cylinderGeometry args={[0.59, 0.59, 0.10, 72, 1, true]} /><meshStandardMaterial color={palette.silver} metalness={0.95} roughness={0.2} side={2} /></mesh>
        {[0, 1, 2].map(index => <mesh key={index} position={[Math.sin(index * Math.PI * 2 / 3) * 0.62, Math.cos(index * Math.PI * 2 / 3) * 0.62, -0.71]} rotation={[0, 0, -index * Math.PI * 2 / 3]}><boxGeometry args={[0.27, 0.04, 0.11]} /><meshStandardMaterial color={palette.silver} metalness={0.95} roughness={0.21} /></mesh>)}
      </group>
      <Ring radius={0.63} tube={0.032} z={-0.62} />
      <Ring radius={0.68} tube={0.037} z={0.38} color={palette.ink} />
      {Array.from({ length: 12 }, (_, index) => {
        const angle = index * Math.PI / 18 - 0.95;
        return <mesh key={index} position={[Math.sin(angle) * 0.68, Math.cos(angle) * 0.68, 0.08]} rotation={[0, 0, -angle]}><boxGeometry args={[0.009, 0.021, index % 3 ? 0.038 : 0.065]} /><meshStandardMaterial color="#dce5ed" /></mesh>;
      })}
      <group ref={optic}>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.52]} castShadow>
          <cylinderGeometry args={[0.70, 0.68, 0.19, 72]} />
          <meshStandardMaterial color="#293d4c" metalness={0.92} roughness={0.21} />
        </mesh>
        <Ring radius={0.69} tube={0.026} z={0.62} />
        <Ring radius={0.60} tube={0.037} z={0.638} color={palette.ink} />
        <mesh position={[0, 0, 0.61]}>
          <circleGeometry args={[0.56, 72]} />
          <meshStandardMaterial color="#081b26" metalness={0.1} roughness={0.35} />
        </mesh>
        <Ring radius={0.45} tube={0.017} z={0.637} color="#326c7a" />
        {Array.from({ length: 7 }, (_, index) => <mesh key={index} position={[0, 0, 0.638]} rotation={[0, 0, index * Math.PI * 2 / 7]}><shapeGeometry args={[blade]} /><meshStandardMaterial color={index % 2 ? '#213a49' : '#162c39'} metalness={0.72} roughness={0.4} /></mesh>)}
        <group ref={glass}>
        <Ring radius={0.548} tube={0.012} z={0.661} color="#728e9d" />
        <mesh position={[0, 0, 0.66]} scale={[0.535, 0.535, 0.04]}>
          <sphereGeometry args={[1, 48, 24]} />
          <meshPhysicalMaterial color="#183a4b" metalness={0.55} roughness={0.06} transparent opacity={0.46} depthWrite={false} clearcoat={1} iridescence={0.38} iridescenceIOR={1.2} />
        </mesh>
        </group>
      </group>
    </group>
  );
}

function Trace({ points }: { points: [number, number][] }) {
  const geometry = useMemo(() => new TubeGeometry(new CatmullRomCurve3(points.map(([x, z]) => new Vector3(x, 0.067, z)), false, 'catmullrom', 0), 16, 0.009, 4, false), [points]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry}><meshStandardMaterial color="#80b7ce" metalness={0.7} roughness={0.35} /></mesh>;
}

const tracePaths: [number, number][][] = Array.from({ length: 6 }, (_, i) => {
  const z = -0.45 + i * 0.18;
  return [[0.32, z], [0.53, z], [0.68, z + (i % 2 ? 0.10 : -0.08)], [0.94, z + (i % 2 ? 0.10 : -0.08)]];
});

function Circuit({ chip }: { chip: RefObject<Group | null> }) {
  const inscription = useMemo(() => makeInscription(['BUILD.', 'TEST.', 'REFINE.'], palette.ink, '#d6e1ea', '500 54px sans-serif'), []);
  useEffect(() => () => inscription.dispose(), [inscription]);
  return (
    <group rotation={[0.80, -0.18, -0.08]}>
      <mesh castShadow receiveShadow><boxGeometry args={[2.04, 0.09, 1.73]} /><meshStandardMaterial color={palette.blue} metalness={0.25} roughness={0.42} /></mesh>
      <mesh position={[0, -0.057, 0]}><boxGeometry args={[1.98, 0.018, 1.68]} /><meshStandardMaterial color="#041019" metalness={0.5} roughness={0.48} /></mesh>
      {[1, -1].map(side => <group key={side} scale={[side, 1, 1]}>{tracePaths.map((points, index) => <Trace key={index} points={points} />)}</group>)}
      {[1, -1].map(side => <group key={side} rotation={[0, side * Math.PI / 2, 0]}>{tracePaths.slice(0, 4).map((points, index) => <Trace key={index} points={points.map(([x, z]) => [x * 0.8, z * 0.8])} />)}</group>)}
      {[-0.87, 0.87].flatMap(x => [-0.70, 0.70].map(z => <group key={`${x}-${z}`} position={[x, 0.054, z]}><mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.063, 0.013, 8, 24]} /><meshStandardMaterial color="#bfcad3" metalness={0.8} roughness={0.3} /></mesh><mesh rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.045, 24]} /><meshStandardMaterial color="#142e46" /></mesh></group>))}
      {Array.from({ length: 5 }, (_, index) => <group key={index} position={[-0.72 + index * 0.31, 0.095, -0.67]}><mesh castShadow><boxGeometry args={[0.19, 0.08, 0.115]} /><meshStandardMaterial color={index % 2 ? '#c4c7c6' : '#263e52'} metalness={0.5} roughness={0.38} /></mesh><mesh position={[0.11, -0.025, 0]}><boxGeometry args={[0.032, 0.035, 0.105]} /><meshStandardMaterial color={palette.silver} metalness={0.9} roughness={0.28} /></mesh></group>)}
      {Array.from({ length: 7 }, (_, index) => <mesh key={index} position={[-0.73 + index * 0.22, 0.053, 0.75]}><boxGeometry args={[0.095, 0.012, 0.125]} /><meshStandardMaterial color="#c9b880" metalness={0.6} roughness={0.4} /></mesh>)}
      <group ref={chip}>
        <mesh position={[0, 0.16, 0]} castShadow><boxGeometry args={[0.96, 0.20, 0.86]} /><meshStandardMaterial color="#728998" metalness={0.94} roughness={0.2} /></mesh>
        <mesh position={[0, 0.267, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.82, 0.72]} /><meshStandardMaterial map={inscription} metalness={0.34} roughness={0.36} /></mesh>
        {[1, -1].flatMap(side => Array.from({ length: 11 }, (_, index) => <group key={`${side}-${index}`} position={[side * 0.53, 0.10, -0.35 + index * 0.07]}><mesh><boxGeometry args={[0.17, 0.028, 0.035]} /><meshStandardMaterial color={palette.silver} metalness={0.88} roughness={0.3} /></mesh><mesh position={[side * 0.075, -0.027, 0]}><boxGeometry args={[0.035, 0.061, 0.035]} /><meshStandardMaterial color={palette.silver} metalness={0.88} roughness={0.3} /></mesh></group>))}
        {[1, -1].flatMap(side => Array.from({ length: 12 }, (_, index) => <mesh key={`z-${side}-${index}`} position={[-0.40 + index * 0.073, 0.083, side * 0.485]}><boxGeometry args={[0.035, 0.035, 0.17]} /><meshStandardMaterial color={palette.silver} metalness={0.88} roughness={0.3} /></mesh>))}
      </group>
    </group>
  );
}

function Book({ cover }: { cover: RefObject<Group | null> }) {
  const title = useMemo(() => makeInscription(['Crossroads', 'of the', 'Heart'], palette.ink, '#edf1f4', '500 53px serif'), []);
  const page = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 768;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = palette.paper; ctx.fillRect(0, 0, 512, 768);
      ctx.fillStyle = '#53616c'; ctx.font = '18px serif'; ctx.textAlign = 'center'; ctx.fillText('CROSSROADS OF THE HEART', 256, 55);
      ctx.font = '28px serif'; ctx.fillText('Chapter 1', 256, 150); ctx.font = 'italic 23px serif'; ctx.fillText('Just Friends', 256, 192);
      ctx.textAlign = 'left'; ctx.font = '21px serif';
      const excerpt = 'The elevator doors slid open with a soft ding, and Yusuf found himself face-to-face with his reflection. He tugged nervously at his collar, wondering why tonight felt different, even though it was just dinner with Pei Ying and Xin Yi.';
      const words = excerpt.split(' '); let line = ''; let y = 260;
      for (const word of words) {
        const next = line ? line + ' ' + word : word;
        if (ctx.measureText(next).width > 382) { ctx.fillText(line, 65, y); y += 35; line = word; } else line = next;
      }
      ctx.fillText(line, 65, y); ctx.textAlign = 'center'; ctx.font = '18px serif'; ctx.fillText('1', 256, 708);
    }
    const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace; texture.anisotropy = 4; return texture;
  }, []);
  useEffect(() => () => { title.dispose(); page.dispose(); }, [title, page]);
  return (
    <group rotation={[-0.06, -0.26, 0.12]}>
      <mesh position={[0, 0, -0.146]} castShadow><boxGeometry args={[1.33, 1.83, 0.045]} /><meshStandardMaterial color={palette.ink} roughness={0.47} /></mesh>
      <mesh castShadow position={[0.015, 0, 0]}><boxGeometry args={[1.24, 1.70, 0.255]} /><meshStandardMaterial color={palette.paper} roughness={0.88} /></mesh>
      <mesh position={[0.015, 0, 0.128]}><planeGeometry args={[1.18, 1.61]} /><meshStandardMaterial map={page} roughness={0.91} /></mesh>
      {Array.from({ length: 22 }, (_, index) => <mesh key={index} position={[0.013, 0, -0.121 + index * 0.0115]}><boxGeometry args={[1.25, 1.705, 0.0009]} /><meshStandardMaterial color="#bac2c5" roughness={1} /></mesh>)}
      <mesh position={[-0.65, 0, 0]} castShadow><boxGeometry args={[0.095, 1.83, 0.34]} /><meshStandardMaterial color={palette.ink} roughness={0.42} /></mesh>
      <mesh position={[0.28, -0.93, 0.01]}><boxGeometry args={[0.11, 0.20, 0.018]} /><meshStandardMaterial color={palette.teal} roughness={0.65} /></mesh>
      <group ref={cover} position={[-0.647, 0, 0.149]}>
        <mesh position={[0.647, 0, 0]} castShadow><boxGeometry args={[1.33, 1.83, 0.045]} /><meshStandardMaterial color={palette.ink} roughness={0.42} metalness={0.06} /></mesh>
        <mesh position={[0.647, 0, 0.024]}><planeGeometry args={[1.26, 1.68]} /><meshStandardMaterial map={title} roughness={0.48} metalness={0.06} /></mesh>
        <mesh position={[0.647, 0, -0.024]} rotation={[0, Math.PI, 0]}><planeGeometry args={[1.22, 1.72]} /><meshStandardMaterial color="#e3e8e8" roughness={0.83} /></mesh>
      </group>
    </group>
  );
}

function Studio({ ready }: { ready: () => void }) {
  const { gl, scene, invalidate } = useThree();
  useEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, 0.04);
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.55;
    room.dispose();
    pmrem.dispose();
    invalidate();
    ready();
    return () => { scene.environment = null; environment.dispose(); };
  }, [gl, scene, invalidate, ready]);
  return <>
    <hemisphereLight args={['#82a4bd', '#020305', 0.55]} />
    <directionalLight position={[-3, 5, 6]} color="#edf6ff" intensity={2.3} />
    <directionalLight position={[5, 3, -4]} color="#8cceff" intensity={4.6} />
    <directionalLight position={[-5, -1, -2]} color="#447aa8" intensity={2.5} />
    <pointLight position={[3, -2, 4]} color="#d5ebff" intensity={6} distance={12} />
  </>;
}

function WorkbenchScene({ controls, ready }: { controls: RefObject<WorkbenchControls>; ready: () => void }) {
  const { size, viewport, invalidate } = useThree();
  const root = useRef<Group>(null);
  const lens = useRef<Group>(null);
  const circuit = useRef<Group>(null);
  const book = useRef<Group>(null);
  const optic = useRef<Group>(null);
  const glass = useRef<Group>(null);
  const mount = useRef<Group>(null);
  const chip = useRef<Group>(null);
  const cover = useRef<Group>(null);
  const current = useRef({ progress: 0, pointerX: 0, pointerY: 0 });
  const mobile = size.width < 900;
  const anchorX = mobile ? 0 : viewport.width * 0.21;
  const macroScale = mobile ? Math.min(2.45, viewport.width / 2.25) : Math.min(3.0, viewport.height * 0.41);

  useFrame((_, delta) => {
    const state = controls.current;
    if (state.modal || (!state.visible && !state.capture)) return;
    const value = current.current;
    const animated = state.motion && state.cinematic && !state.capture;
    const factor = animated ? 1 - Math.exp(-Math.min(delta, 0.06) * 8) : 1;
    const chosen = state.selected;
    const progress = chosen === 'lens' ? 0.12 : chosen === 'circuit' ? 0.49 : chosen === 'book' ? 0.87 : animated || state.capture ? state.progress : 0;
    const targets = {
      progress,
      pointerX: animated ? state.pointerX : 0,
      pointerY: animated ? state.pointerY : 0,
    };
    let moving = false;
    (Object.keys(targets) as (keyof typeof targets)[]).forEach(key => {
      value[key] += (targets[key] - value[key]) * factor;
      if (Math.abs(targets[key] - value[key]) > 0.001) moving = true;
    });
    const p = value.progress;
    const lensWeight = 1 - range(0.27, 0.37, p);
    const circuitWeight = range(0.28, 0.39, p) * (1 - range(0.62, 0.74, p));
    const bookWeight = range(0.64, 0.76, p);
    if (root.current) { root.current.rotation.y = value.pointerX * 0.04; root.current.rotation.x = -value.pointerY * 0.025; }
    if (lens.current) {
      lens.current.visible = lensWeight > 0.002;
      lens.current.scale.setScalar(macroScale * (0.8 + lensWeight * 0.2));
      lens.current.position.set(anchorX + (1 - lensWeight) * viewport.width * 0.65, mobile ? 0 : -0.08, 0);
      lens.current.rotation.set(0.12 + p * 0.14, -0.34 - p * 0.65, -0.07);
    }
    if (circuit.current) {
      circuit.current.visible = circuitWeight > 0.002;
      circuit.current.scale.setScalar(macroScale * (mobile ? 0.72 : 0.82) * (0.8 + circuitWeight * 0.2));
      circuit.current.position.set(anchorX + (1 - circuitWeight) * viewport.width * 0.70, 0.05 + (1 - circuitWeight) * -1.4, 0);
      circuit.current.rotation.set(0.05, (p - 0.45) * 0.7, -0.09);
    }
    if (book.current) {
      book.current.visible = bookWeight > 0.002;
      book.current.scale.setScalar(macroScale * (mobile ? 0.80 : 0.87));
      book.current.position.set(anchorX + (1 - bookWeight) * viewport.width * 0.70, (1 - bookWeight) * -1.2, 0);
      book.current.rotation.set(-0.035, -0.15 + (p - 0.8) * 0.25, -0.05);
    }
    const mechanical = pulse(p, 0.18, 0.17);
    const separation = mobile ? 0.62 : 1;
    if (optic.current) optic.current.position.z = mechanical * 0.53 * separation;
    if (glass.current) glass.current.position.z = mechanical * 0.21 * separation;
    if (mount.current) mount.current.position.z = mechanical * -0.26 * separation;
    if (chip.current) chip.current.position.y = pulse(p, 0.50, 0.18) * 0.50;
    if (cover.current) cover.current.rotation.y = -pulse(p, 0.88, 0.22) * 1.02;
    if (moving && animated) invalidate();
  });

  const navigate = (event: ThreeEvent<MouseEvent>, target: string) => {
    event.stopPropagation();
    document.getElementById(target)?.scrollIntoView({ behavior: controls.current.motion && controls.current.cinematic ? 'smooth' : 'auto', block: 'start' });
  };
  const hover = () => { document.body.style.cursor = 'pointer'; };
  const leave = () => { document.body.style.cursor = ''; };
  useEffect(() => () => { document.body.style.cursor = ''; }, []);

  return <group ref={root}>
    <Studio ready={ready} />
    <group ref={lens} position={[anchorX, 0, 0]} scale={macroScale} onClick={event => navigate(event, 'work')} onPointerOver={hover} onPointerOut={leave}><Lens optic={optic} glass={glass} mount={mount} /></group>
    <group ref={circuit} visible={false} onClick={event => navigate(event, 'experiments')} onPointerOver={hover} onPointerOut={leave}><Circuit chip={chip} /></group>
    <group ref={book} visible={false} onClick={event => navigate(event, 'writing')} onPointerOver={hover} onPointerOut={leave}><Book cover={cover} /></group>
  </group>;
}

function Capture({ controls, fail }: { controls: RefObject<WorkbenchControls>; fail: () => void }) {
  const { gl, invalidate } = useThree();
  useEffect(() => {
    controls.current.invalidate = invalidate;
    const lost = (event: Event) => { event.preventDefault(); fail(); };
    gl.domElement.addEventListener('webglcontextlost', lost);
    const setProgress = (progress: number) => {
      controls.current.capture = true;
      controls.current.selected = null;
      controls.current.pointerX = 0;
      controls.current.pointerY = 0;
      controls.current.progress = Math.max(0, Math.min(1, progress));
      window.dispatchEvent(new CustomEvent('workbench:focus', { detail: progress < 0.34 ? 'lens' : progress < 0.67 ? 'circuit' : 'book' }));
      invalidate();
      return new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    };
    const api = { canvas: gl.domElement, setProgress, setProgressAsync: setProgress, reset() { controls.current.capture = false; controls.current.progress = 0; invalidate(); } };
    window.__workbenchCapture = api;
    invalidate();
    return () => {
      gl.domElement.removeEventListener('webglcontextlost', lost);
      controls.current.invalidate = undefined;
      if (window.__workbenchCapture === api) delete window.__workbenchCapture;
    };
  }, [gl, invalidate, controls, fail]);
  return null;
}

export default function WorkbenchCanvas({ controls, ready, fail }: { controls: RefObject<WorkbenchControls>; ready: () => void; fail: () => void }) {
  return <Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ position: [0, 0.85, 8.8], fov: 36, near: 0.1, far: 45 }} gl={{ antialias: true, alpha: true, powerPreference: 'low-power', failIfMajorPerformanceCaveat: true }} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', touchAction: 'pan-y' }} aria-hidden="true" onCreated={({ gl, camera }) => { gl.setClearColor('#030405', 0); camera.lookAt(0, 0, 0); }}>
    <WorkbenchScene controls={controls} ready={ready} />
    <Capture controls={controls} fail={fail} />
  </Canvas>;
}
