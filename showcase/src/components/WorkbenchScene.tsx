import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import {
  CanvasTexture, CatmullRomCurve3, DataTexture, Group, LinearFilter,
  PMREMGenerator, RGBAFormat, SRGBColorSpace, TubeGeometry, Vector3,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export type WorkbenchObject = 'lens' | 'circuit' | 'book';
export interface WorkbenchControls {
  progress: number;
  selected: WorkbenchObject | null;
  pointerX: number;
  pointerY: number;
  motion: boolean;
  visible: boolean;
  capture: boolean;
}

const palette = { ink: '#192938', blue: '#2553C7', teal: '#137C72', silver: '#bac7d5', paper: '#f4f5f1' };
const smooth = (value: number) => value * value * (3 - 2 * value);
const pulse = (value: number, center: number, radius: number) => smooth(Math.max(0, 1 - Math.abs(value - center) / radius));

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

function Lens({ optic }: { optic: RefObject<Group | null> }) {
  return (
    <group rotation={[0.02, -0.22, -0.13]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.08]} castShadow>
        <cylinderGeometry args={[0.67, 0.62, 1.13, 72]} />
        <meshStandardMaterial color={palette.ink} metalness={0.63} roughness={0.28} />
      </mesh>
      {Array.from({ length: 18 }, (_, index) => <Ring key={index} radius={0.672} tube={0.013} z={-0.34 + index * 0.025} color={index === 3 ? palette.teal : '#344453'} />)}
      <Ring radius={0.63} tube={0.032} z={-0.62} />
      <Ring radius={0.68} tube={0.037} z={0.38} color={palette.ink} />
      {Array.from({ length: 12 }, (_, index) => {
        const angle = index * Math.PI / 18 - 0.95;
        return <mesh key={index} position={[Math.sin(angle) * 0.68, Math.cos(angle) * 0.68, 0.08]} rotation={[0, 0, -angle]}><boxGeometry args={[0.009, 0.021, index % 3 ? 0.038 : 0.065]} /><meshStandardMaterial color="#dce5ed" /></mesh>;
      })}
      <group ref={optic}>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.52]} castShadow>
          <cylinderGeometry args={[0.70, 0.68, 0.19, 72]} />
          <meshStandardMaterial color="#253747" metalness={0.8} roughness={0.24} />
        </mesh>
        <Ring radius={0.69} tube={0.026} z={0.62} />
        <Ring radius={0.60} tube={0.037} z={0.638} color={palette.ink} />
        <mesh position={[0, 0, 0.61]}>
          <circleGeometry args={[0.56, 72]} />
          <meshStandardMaterial color="#081b26" metalness={0.1} roughness={0.35} />
        </mesh>
        <Ring radius={0.45} tube={0.017} z={0.637} color="#326c7a" />
        <mesh position={[0, 0, 0.66]} scale={[0.545, 0.545, 0.055]}>
          <sphereGeometry args={[1, 48, 24]} />
          <meshPhysicalMaterial color="#143847" metalness={0.37} roughness={0.05} transmission={0.16} thickness={0.12} clearcoat={1} iridescence={0.24} iridescenceIOR={1.2} />
        </mesh>
        <mesh position={[-0.14, 0.17, 0.704]} rotation={[0, 0, -0.48]}>
          <circleGeometry args={[0.12, 40]} />
          <meshBasicMaterial color="#dfeffa" transparent opacity={0.24} depthWrite={false} />
        </mesh>
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
    <group rotation={[0.36, -0.27, -0.08]}>
      <mesh castShadow receiveShadow><boxGeometry args={[2.04, 0.09, 1.73]} /><meshStandardMaterial color={palette.blue} metalness={0.25} roughness={0.42} /></mesh>
      <mesh position={[0, -0.057, 0]}><boxGeometry args={[1.98, 0.018, 1.68]} /><meshStandardMaterial color="#164687" metalness={0.2} roughness={0.6} /></mesh>
      {[1, -1].map(side => <group key={side} scale={[side, 1, 1]}>{tracePaths.map((points, index) => <Trace key={index} points={points} />)}</group>)}
      {[1, -1].map(side => <group key={side} rotation={[0, side * Math.PI / 2, 0]}>{tracePaths.slice(0, 4).map((points, index) => <Trace key={index} points={points.map(([x, z]) => [x * 0.8, z * 0.8])} />)}</group>)}
      {[-0.87, 0.87].flatMap(x => [-0.70, 0.70].map(z => <group key={`${x}-${z}`} position={[x, 0.054, z]}><mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.063, 0.013, 8, 24]} /><meshStandardMaterial color="#bfcad3" metalness={0.8} roughness={0.3} /></mesh><mesh rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.045, 24]} /><meshStandardMaterial color="#142e46" /></mesh></group>))}
      {Array.from({ length: 5 }, (_, index) => <group key={index} position={[-0.72 + index * 0.31, 0.095, -0.67]}><mesh castShadow><boxGeometry args={[0.19, 0.08, 0.115]} /><meshStandardMaterial color={index % 2 ? '#c4c7c6' : '#263e52'} metalness={0.5} roughness={0.38} /></mesh><mesh position={[0.11, -0.025, 0]}><boxGeometry args={[0.032, 0.035, 0.105]} /><meshStandardMaterial color={palette.silver} metalness={0.9} roughness={0.28} /></mesh></group>)}
      {Array.from({ length: 7 }, (_, index) => <mesh key={index} position={[-0.73 + index * 0.22, 0.053, 0.75]}><boxGeometry args={[0.095, 0.012, 0.125]} /><meshStandardMaterial color="#c9b880" metalness={0.6} roughness={0.4} /></mesh>)}
      <group ref={chip}>
        <mesh position={[0, 0.16, 0]} castShadow><boxGeometry args={[0.96, 0.20, 0.86]} /><meshStandardMaterial color={palette.ink} metalness={0.55} roughness={0.27} /></mesh>
        <mesh position={[0, 0.267, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.82, 0.72]} /><meshStandardMaterial map={inscription} metalness={0.34} roughness={0.36} /></mesh>
        {[1, -1].flatMap(side => Array.from({ length: 11 }, (_, index) => <group key={`${side}-${index}`} position={[side * 0.53, 0.10, -0.35 + index * 0.07]}><mesh><boxGeometry args={[0.17, 0.028, 0.035]} /><meshStandardMaterial color={palette.silver} metalness={0.88} roughness={0.3} /></mesh><mesh position={[side * 0.075, -0.027, 0]}><boxGeometry args={[0.035, 0.061, 0.035]} /><meshStandardMaterial color={palette.silver} metalness={0.88} roughness={0.3} /></mesh></group>))}
        {[1, -1].flatMap(side => Array.from({ length: 12 }, (_, index) => <mesh key={`z-${side}-${index}`} position={[-0.40 + index * 0.073, 0.083, side * 0.485]}><boxGeometry args={[0.035, 0.035, 0.17]} /><meshStandardMaterial color={palette.silver} metalness={0.88} roughness={0.3} /></mesh>))}
      </group>
    </group>
  );
}

function Book({ cover }: { cover: RefObject<Group | null> }) {
  const title = useMemo(() => makeInscription(['Stories', 'worth', 'staying for.'], palette.ink, '#edf1f4', '500 54px serif'), []);
  useEffect(() => () => title.dispose(), [title]);
  return (
    <group rotation={[-0.06, -0.26, 0.12]}>
      <mesh position={[0, 0, -0.146]} castShadow><boxGeometry args={[1.33, 1.83, 0.045]} /><meshStandardMaterial color={palette.ink} roughness={0.47} /></mesh>
      <mesh castShadow position={[0.015, 0, 0]}><boxGeometry args={[1.24, 1.70, 0.255]} /><meshStandardMaterial color={palette.paper} roughness={0.88} /></mesh>
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
  const shadow = useMemo(() => {
    const size = 96;
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const offset = (y * size + x) * 4;
      const radius = ((x / size - 0.5) ** 2 + (y / size - 0.5) ** 2) * 24;
      data[offset] = 35; data[offset + 1] = 58; data[offset + 2] = 76;
      data[offset + 3] = Math.round(Math.exp(-radius) * 34);
    }
    const texture = new DataTexture(data, size, size, RGBAFormat);
    texture.magFilter = LinearFilter;
    texture.needsUpdate = true;
    return texture;
  }, []);
  useEffect(() => () => shadow.dispose(), [shadow]);
  return <>
    <hemisphereLight args={['#eaf3ff', '#839eaf', 1.6]} />
    <directionalLight position={[-4, 5, 6]} color="#ffffff" intensity={3} />
    <directionalLight position={[4, 3, -2]} color="#d5e8ff" intensity={2} />
    <pointLight position={[-3, 0, 3]} color="#b8e2d9" intensity={9} distance={12} />
    {[-2.25, 0, 2.25].map((x, index) => <mesh key={x} position={[x, -1.02, -0.06]} rotation={[-Math.PI / 2, 0, 0]} scale={[index === 1 ? 2.7 : 2.4, 2.1, 1]}><planeGeometry /><meshBasicMaterial map={shadow} transparent depthWrite={false} /></mesh>)}
  </>;
}

export default function WorkbenchScene({ controls, ready }: { controls: RefObject<WorkbenchControls>; ready: () => void }) {
  const { size, invalidate } = useThree();
  const root = useRef<Group>(null);
  const lens = useRef<Group>(null);
  const circuit = useRef<Group>(null);
  const book = useRef<Group>(null);
  const optic = useRef<Group>(null);
  const chip = useRef<Group>(null);
  const cover = useRef<Group>(null);
  const current = useRef({ progress: 0, pointerX: 0, pointerY: 0, lens: 1, circuit: 1, book: 1, lensOpen: 0, chipOpen: 0, bookOpen: 0 });
  const scale = Math.min(1, (size.width / size.height) / 1.35);

  useFrame((_, delta) => {
    const state = controls.current;
    if (!state.visible && !state.capture) return;
    const value = current.current;
    const animated = state.motion && !state.capture;
    const factor = animated ? 1 - Math.exp(-Math.min(delta, 0.06) * 9) : 1;
    const progress = state.motion || state.capture ? state.progress : 0;
    const targets = {
      progress,
      pointerX: state.motion ? state.pointerX : 0,
      pointerY: state.motion ? state.pointerY : 0,
      lens: state.selected === 'lens' ? 1.07 : 1,
      circuit: state.selected === 'circuit' ? 1.07 : 1,
      book: state.selected === 'book' ? 1.07 : 1,
      lensOpen: state.selected === 'lens' ? 1 : pulse(progress, 0.18, 0.22) * 0.8,
      chipOpen: state.selected === 'circuit' ? 1 : pulse(progress, 0.52, 0.22),
      bookOpen: state.selected === 'book' ? 1 : pulse(progress, 0.84, 0.24),
    };
    let moving = false;
    (Object.keys(targets) as (keyof typeof targets)[]).forEach(key => {
      value[key] += (targets[key] - value[key]) * factor;
      if (Math.abs(targets[key] - value[key]) > 0.001) moving = true;
    });
    if (root.current) { root.current.rotation.y = value.pointerX * 0.075; root.current.rotation.x = -value.pointerY * 0.038; }
    if (lens.current) { lens.current.scale.setScalar(value.lens); lens.current.rotation.y = value.progress * -0.13; }
    if (circuit.current) { circuit.current.scale.setScalar(value.circuit); circuit.current.rotation.y = value.progress * 0.20; }
    if (book.current) { book.current.scale.setScalar(value.book); book.current.rotation.y = value.progress * -0.10; }
    if (optic.current) optic.current.position.z = value.lensOpen * 0.36;
    if (chip.current) chip.current.position.y = value.chipOpen * 0.33;
    if (cover.current) cover.current.rotation.y = -value.bookOpen * 0.9;
    if (moving && animated) invalidate();
  });

  const navigate = (event: ThreeEvent<MouseEvent>, target: string) => {
    event.stopPropagation();
    document.getElementById(target)?.scrollIntoView({ behavior: controls.current.motion ? 'smooth' : 'auto', block: 'start' });
  };
  const hover = () => { document.body.style.cursor = 'pointer'; };
  const leave = () => { document.body.style.cursor = ''; };
  useEffect(() => () => { document.body.style.cursor = ''; }, []);

  return <group ref={root} scale={scale} position={[0, size.width < 768 ? 0.15 : 0.05, 0]}>
    <Studio ready={ready} />
    <group ref={lens} position={[-2.25, -0.01, 0]} onClick={event => navigate(event, 'work')} onPointerOver={hover} onPointerOut={leave}><Lens optic={optic} /></group>
    <group ref={circuit} position={[0, -0.01, 0]} onClick={event => navigate(event, 'experiments')} onPointerOver={hover} onPointerOut={leave}><Circuit chip={chip} /></group>
    <group ref={book} position={[2.25, -0.04, 0]} onClick={event => navigate(event, 'writing')} onPointerOver={hover} onPointerOut={leave}><Book cover={cover} /></group>
  </group>;
}
