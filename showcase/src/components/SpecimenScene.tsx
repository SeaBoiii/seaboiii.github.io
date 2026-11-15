import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import {
  Box3, BufferGeometry, CanvasTexture, CatmullRomCurve3, Float32BufferAttribute,
  Color, Group, IcosahedronGeometry, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial,
  Object3D, PlaneGeometry, PMREMGenerator, Scene, SRGBColorSpace, Texture,
  TextureLoader, TubeGeometry, Vector3,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import specimenUrl from '../../../assets/motion/aleem-specimen.glb?url';

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
  covers?: string[];
  asset?: 'loading' | 'higgsfield' | 'procedural';
  invalidate?: () => void;
}

const palette = { carbon: '#151b20', silver: '#b7ced8', ice: '#a6d4e8', copper: '#b58765', paper: '#dcd8cb' };
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (value: number) => { const p = clamp(value); return p * p * (3 - 2 * p); };
const range = (start: number, end: number, value: number) => smooth((value - start) / (end - start));
const defaultCovers = [
  '/images/crossroads-of-the-heart-cover-640.webp',
  '/images/second-skin-cover-640.webp',
  '/images/the-ledger-of-ash-cover-640.webp',
];

/** Deterministic fine grain instead of a remote material pack. */
function carbonGrain() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 192;
  const context = canvas.getContext('2d');
  if (context) {
    const pixels = context.createImageData(192, 192);
    let seed = 4177;
    for (let index = 0; index < pixels.data.length; index += 4) {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
      const value = 94 + ((seed >>> 16) & 63);
      pixels.data[index] = value; pixels.data[index + 1] = value; pixels.data[index + 2] = value; pixels.data[index + 3] = 255;
    }
    context.putImageData(pixels, 0, 0);
  }
  return new CanvasTexture(canvas);
}

interface Facet { geometry: BufferGeometry; center: Vector3; outward: Vector3; index: number; }

/** Each fragment has a centroid: this shell physically opens instead of fading. */
function fracturedShell(): Facet[] {
  const source = new IcosahedronGeometry(1.45, 1);
  const vertices = source.getAttribute('position');
  const result: Facet[] = [];
  const deform = (point: Vector3) => {
    const irregular = 1 + .075 * Math.sin(point.x * 8 + point.y * 3) * Math.cos(point.z * 5);
    return point.multiplyScalar(irregular).multiply(new Vector3(.96, 1.12, .86));
  };
  for (let offset = 0; offset < vertices.count; offset += 3) {
    const outer = [0, 1, 2].map(index => deform(new Vector3().fromBufferAttribute(vertices, offset + index)));
    const center = outer.reduce((sum, vertex) => sum.add(vertex), new Vector3()).multiplyScalar(1 / 3);
    // A torn opening lets the polished heart register in the first frame.
    if (center.z > .57 && Math.abs(center.x + center.y * .14) < .72 && Math.abs(center.y) < 1.15) continue;
    const outward = center.clone().normalize();
    const points = outer.map(vertex => vertex.clone().sub(center).multiplyScalar(.967));
    const inner = points.map(vertex => vertex.clone().addScaledVector(outward, -.16));
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute([...points, ...inner].flatMap(point => point.toArray()), 3));
    geometry.setAttribute('uv', new Float32BufferAttribute([0, 0, 1, 0, .5, 1, 0, 0, 1, 0, .5, 1], 2));
    geometry.setIndex([0, 1, 2, 5, 4, 3, 0, 3, 4, 0, 4, 1, 1, 4, 5, 1, 5, 2, 2, 5, 3, 2, 3, 0]);
    geometry.addGroup(0, 3, 0); geometry.addGroup(3, 3, 2); geometry.addGroup(6, 18, 1);
    geometry.computeVertexNormals();
    result.push({ geometry, center, outward, index: offset / 3 });
  }
  source.dispose();
  return result;
}

function cutCore() {
  const rings = [
    { y: .64, radius: .46, phase: Math.PI / 8 },
    { y: .10, radius: .98, phase: 0 },
    { y: -.10, radius: .94, phase: 0 },
  ];
  const vertices = rings.flatMap(ring => Array.from({ length: 8 }, (_, index) => {
    const angle = index * Math.PI / 4 + ring.phase;
    return new Vector3(Math.cos(angle) * ring.radius, ring.y, Math.sin(angle) * ring.radius);
  }));
  vertices.push(new Vector3(0, -.98, 0));
  const triangles: number[] = [];
  for (let side = 0; side < 8; side++) {
    const next = (side + 1) % 8;
    if (side < 6) triangles.push(0, side + 2, side + 1);
    triangles.push(side, next, next + 8, side, next + 8, side + 8);
    triangles.push(side + 8, next + 8, next + 16, side + 8, next + 16, side + 16);
    triangles.push(side + 16, next + 16, 24);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(triangles.flatMap(index => vertices[index].toArray()), 3));
  geometry.computeVertexNormals();
  return geometry;
}

function Specimen({ shell, heart, controls }: { shell: RefObject<Group | null>; heart: RefObject<Group | null>; controls: RefObject<WorkbenchControls> }) {
  const pieces = useMemo(fracturedShell, []);
  const core = useMemo(cutCore, []);
  const grain = useMemo(carbonGrain, []);
  const [imported, setImported] = useState<{ shell: Group; heart: Group } | null>(null);
  const materials = useMemo(() => [
    new MeshStandardMaterial({ color: palette.carbon, metalness: .25, roughness: .91, bumpMap: grain, bumpScale: .055, flatShading: true }),
    new MeshStandardMaterial({ color: '#45535d', metalness: .67, roughness: .40, flatShading: true }),
    new MeshStandardMaterial({ color: palette.copper, metalness: .86, roughness: .22, flatShading: true }),
  ], [grain]);
  useEffect(() => () => { pieces.forEach(piece => piece.geometry.dispose()); core.dispose(); grain.dispose(); materials.forEach(material => material.dispose()); }, [pieces, core, grain, materials]);
  useEffect(() => {
    let alive = true;
    const geometry = new Set<BufferGeometry>();
    const loadedMaterials = new Set<MeshStandardMaterial>();
    controls.current.asset = 'loading';
    new GLTFLoader().load(specimenUrl, gltf => {
      const source = gltf.scene.getObjectByName('RIG_Specimen');
      if (!alive) return;
      if (!source) { controls.current.asset = 'procedural'; controls.current.invalidate?.(); return; }
      const rig = source.clone(true);
      const shellRig = new Group();
      const heartRig = new Group();
      rig.traverse(node => {
        if (!(node instanceof Mesh)) return;
        geometry.add(node.geometry);
        const originals = Array.isArray(node.material) ? node.material : [node.material];
        const replacements = originals.map(original => {
          let material = original.clone() as MeshStandardMaterial;
          if (original.name === 'MAT_CoreSilver') {
            material = new MeshPhysicalMaterial({ color: '#8eacbf', metalness: .98, roughness: .12, clearcoat: .45, clearcoatRoughness: .12, envMapIntensity: 1.65, flatShading: true });
          } else if (/RoughCarbon|CarbonFacet/.test(original.name)) {
            material.color.set('#10171c');
            material.roughness = .94;
            material.metalness = .19;
            material.envMapIntensity = .30;
            if (!node.geometry.hasAttribute('uv')) {
              const positions = node.geometry.getAttribute('position');
              const uv: number[] = [];
              for (let index = 0; index < positions.count; index++) uv.push(positions.getX(index) * .62 + .5, positions.getY(index) * .62 + .5);
              node.geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2));
            }
            material.bumpMap = grain; material.bumpScale = .045;
          } else if (original.name === 'MAT_PolishedInterior') {
            material.color.set('#7e9cab'); material.metalness = .96; material.roughness = .14; material.envMapIntensity = 1.3;
          }
          loadedMaterials.add(material);
          return material;
        });
        node.material = Array.isArray(node.material) ? replacements : replacements[0];
      });
      [...rig.children].forEach((node, index) => {
        if (node.name === 'HERO_Core' || node.name.startsWith('PRC_')) { heartRig.add(node); return; }
        let piece = node;
        if (!node.name.startsWith('HERO_Shell')) {
          // Jutsu's seam geometry is world-aligned. Give it a physical pivot too.
          const center = new Box3().setFromObject(node).getCenter(new Vector3());
          const wrapper = new Group(); wrapper.position.copy(center);
          node.position.sub(center); wrapper.add(node); piece = wrapper;
        }
        piece.userData = { rest: piece.position.clone(), outward: piece.position.clone().normalize(), index };
        shellRig.add(piece);
      });
      controls.current.asset = 'higgsfield';
      setImported({ shell: shellRig, heart: heartRig });
      controls.current.invalidate?.();
    }, undefined, () => { if (alive) { controls.current.asset = 'procedural'; controls.current.invalidate?.(); } });
    return () => { alive = false; geometry.forEach(item => item.dispose()); loadedMaterials.forEach(item => item.dispose()); };
  }, [controls, grain]);
  if (imported) return <><primitive object={imported.shell} ref={shell} dispose={null} /><primitive object={imported.heart} ref={heart} dispose={null} /></>;
  return <>
    <group ref={shell} name="RIG_Specimen">
      {pieces.map(piece => <mesh key={piece.index} name={`HERO_Shell_${String(piece.index).padStart(2, '0')}`} geometry={piece.geometry} material={materials} position={piece.center} userData={{ rest: piece.center, outward: piece.outward, index: piece.index }} />)}
    </group>
    <group ref={heart} name="HERO_Core" position={[0, .02, .10]} rotation={[.31, -.21, -.10]}>
      <mesh geometry={core}><meshPhysicalMaterial color="#93b5c5" metalness={.72} roughness={.075} clearcoat={1} clearcoatRoughness={.08} envMapIntensity={2.0} iridescence={.18} iridescenceIOR={1.28} flatShading /></mesh>
      <mesh geometry={core} scale={.974}><meshStandardMaterial color="#234858" metalness={.74} roughness={.24} wireframe transparent opacity={.32} /></mesh>
    </group>
  </>;
}

function Route({ points, ice = false }: { points: [number, number, number][]; ice?: boolean }) {
  const geometry = useMemo(() => new TubeGeometry(new CatmullRomCurve3(points.map(point => new Vector3(...point)), false, 'catmullrom', 0), 16, .008, 4, false), [points]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry}><meshStandardMaterial color={ice ? palette.ice : palette.copper} metalness={.8} roughness={.28} emissive={ice ? '#19516a' : '#2c1b0d'} emissiveIntensity={ice ? .55 : .18} /></mesh>;
}

const routes = Array.from({ length: 5 }, (_, row) => {
  const y = -.42 + row * .21;
  return [[.52, y, .13], [.74, y, .13], [.86, y + (row % 2 ? .15 : -.15), .13], [1.14, y + (row % 2 ? .15 : -.15), .13]] as [number, number, number][];
});

function Precision({ rig, layers }: { rig: RefObject<Group | null>; layers: RefObject<Group | null> }) {
  const pins = useRef<InstancedMesh>(null);
  useEffect(() => {
    const node = pins.current;
    if (!node) return;
    const matrix = new Matrix4();
    const dummy = new Object3D();
    let index = 0;
    for (let side = 0; side < 4; side++) {
      for (let pin = 0; pin < 10; pin++) {
        const angle = side * Math.PI / 2;
        dummy.position.set(Math.cos(angle) * (-.405 + pin * .09) - Math.sin(angle) * .59, Math.sin(angle) * (-.405 + pin * .09) + Math.cos(angle) * .59, .035);
        dummy.rotation.z = angle; dummy.updateMatrix(); matrix.copy(dummy.matrix);
        node.setMatrixAt(index++, matrix);
      }
    }
    node.instanceMatrix.needsUpdate = true;
  }, []);
  return <group ref={rig} name="RIG_Precision" rotation={[.08, -.12, -.09]}>
    <group ref={layers}>
      <mesh name="HERO_Substrate"><boxGeometry args={[2.46, 2.2, .085]} /><meshStandardMaterial color="#0c1821" metalness={.42} roughness={.38} /></mesh>
      <mesh name="HERO_Ceramic" position={[0, 0, .075]}><boxGeometry args={[1.22, 1.22, .12]} /><meshStandardMaterial color="#263843" metalness={.78} roughness={.24} /></mesh>
      <group name="HERO_Die" position={[0, 0, .17]}>
        <mesh><boxGeometry args={[1.04, 1.04, .085]} /><meshPhysicalMaterial color="#a0b8c5" metalness={.93} roughness={.16} clearcoat={1} envMapIntensity={1.25} /></mesh>
        <mesh position={[0, 0, .047]}><planeGeometry args={[.91, .91]} /><meshStandardMaterial color="#243b4a" metalness={.8} roughness={.23} /></mesh>
        {/* The quiet engraved A is authored geometry, not generated lettering. */}
        <Route points={[[-.14, -.16, .052], [0, .18, .052], [.14, -.16, .052]]} />
        <Route points={[[-.075, -.025, .052], [.075, -.025, .052]]} />
      </group>
      <instancedMesh ref={pins} args={[undefined, undefined, 40]}><boxGeometry args={[.045, .20, .035]} /><meshStandardMaterial color={palette.copper} metalness={.9} roughness={.23} /></instancedMesh>
      {[1, -1].map(side => <group key={side} scale={[side, 1, 1]}>{routes.map((points, index) => <Route key={index} points={points} ice={index === 2} />)}</group>)}
      {[1, -1].map(side => <group key={`vertical-${side}`} rotation={[0, 0, side * Math.PI / 2]}>{routes.map((points, index) => <Route key={index} points={points} />)}</group>)}
      {[-1, 1].flatMap(x => [-1, 1].map(y => <mesh key={`${x}:${y}`} position={[x * 1.08, y * .95, .05]}><cylinderGeometry args={[.032, .032, .015, 12]} /><meshStandardMaterial color={palette.silver} metalness={.85} roughness={.27} /></mesh>))}
    </group>
  </group>;
}

function CoverBook({ src, index }: { src: string; index: number }) {
  const cover = useRef<MeshStandardMaterial>(null);
  const { invalidate } = useThree();
  useEffect(() => {
    let alive = true;
    let texture: Texture | null = null;
    const loader = new TextureLoader();
    loader.load(src, loaded => {
      if (!alive) { loaded.dispose(); return; }
      texture = loaded; texture.colorSpace = SRGBColorSpace; texture.anisotropy = 4;
      if (cover.current) { cover.current.map = texture; cover.current.color.set('#ffffff'); cover.current.needsUpdate = true; }
      invalidate();
    }, undefined, () => { /* A thumbnail failure must not remove the specimen. */ });
    return () => { alive = false; texture?.dispose(); };
  }, [src, invalidate]);
  return <group name={`HERO_Book_${index}`} userData={{ index }}>
    <mesh position={[0, 0, -.07]}><boxGeometry args={[1.05, 1.57, .035]} /><meshStandardMaterial color={index === 0 ? '#293838' : index === 1 ? '#191c32' : '#40372d'} roughness={.6} /></mesh>
    <mesh position={[.012, 0, 0]}><boxGeometry args={[1.005, 1.49, .10]} /><meshStandardMaterial color={palette.paper} roughness={.93} /></mesh>
    <mesh position={[-.51, 0, .005]}><boxGeometry args={[.04, 1.56, .15]} /><meshStandardMaterial color="#202a31" metalness={.1} roughness={.55} /></mesh>
    <mesh position={[0, 0, .079]}><planeGeometry args={[1.05, 1.57]} /><meshStandardMaterial ref={cover} color={index === 0 ? '#38545b' : index === 1 ? '#433b61' : '#62513c'} roughness={.49} metalness={.025} /></mesh>
    {[-.025, 0, .025].map(z => <mesh key={z} position={[.014, -.744, z]}><boxGeometry args={[.99, .002, .002]} /><meshStandardMaterial color="#93978d" /></mesh>)}
  </group>;
}

function Studio({ ready }: { ready: () => void }) {
  const { gl, scene, invalidate } = useThree();
  useEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    // Broad photographic cards create controlled dark-to-light metal reflections.
    // A general room environment fills every face grey and hides the cut quality.
    const room = new Scene();
    room.background = new Color('#030609');
    const cards: Mesh[] = [];
    const card = (width: number, height: number, position: [number, number, number], color: Color) => {
      const plane = new Mesh(new PlaneGeometry(width, height), new MeshBasicMaterial({ color, toneMapped: false }));
      plane.position.set(...position); plane.lookAt(0, 0, 0); room.add(plane); cards.push(plane);
    };
    card(3.5, 7, [-4, 2, 5], new Color(3.2, 3.4, 3.5));
    card(.8, 6.5, [4, .4, 3], new Color(2.7, 3.1, 3.4));
    card(4, 2, [.2, 5, -1], new Color(2.7, 2.8, 2.9));
    card(2.5, 4, [-3, -1, -4], new Color(.20, .47, .67));
    card(2, 2.5, [3, -3, -2], new Color(.47, .22, .10));
    const environment = pmrem.fromScene(room, .015);
    scene.environment = environment.texture;
    scene.environmentIntensity = .65;
    cards.forEach(mesh => { mesh.geometry.dispose(); (mesh.material as MeshBasicMaterial).dispose(); });
    pmrem.dispose(); invalidate(); ready();
    return () => { scene.environment = null; environment.dispose(); };
  }, [gl, scene, invalidate, ready]);
  return <>
    <ambientLight intensity={.08} color="#9fb5c1" />
    <directionalLight position={[-3, 5, 6]} intensity={2.1} color="#f0eee8" />
    <directionalLight position={[5, 2, -3]} intensity={4.2} color="#a6d4e8" />
    <directionalLight position={[-4, -2, -1]} intensity={1.3} color="#bf9476" />
  </>;
}

function WorkbenchScene({ controls, ready }: { controls: RefObject<WorkbenchControls>; ready: () => void }) {
  const { size, viewport, camera, invalidate } = useThree();
  const root = useRef<Group>(null);
  const shell = useRef<Group>(null);
  const heart = useRef<Group>(null);
  const precision = useRef<Group>(null);
  const layers = useRef<Group>(null);
  const books = useRef<Group>(null);
  const current = useRef({ progress: 0, pointerX: 0, pointerY: 0 });
  const mobile = size.width < 900;
  const anchor = mobile ? 0 : viewport.width * .26;
  const scale = mobile ? Math.min(1.55, viewport.width / 3.55) : Math.min(1.56, viewport.height * .20);
  const covers = controls.current.covers?.slice(0, 3) ?? defaultCovers;

  useFrame((_, delta) => {
    const state = controls.current;
    if (state.modal || (!state.visible && !state.capture)) return;
    const value = current.current;
    const animated = state.motion && state.cinematic && !state.capture;
    const factor = animated ? 1 - Math.exp(-Math.min(delta, .06) * 9) : 1;
    const progress = state.selected === 'lens' ? .08 : state.selected === 'circuit' ? .49 : state.selected === 'book' ? .93 : animated || state.capture ? state.progress : 0;
    const targets = { progress, pointerX: animated ? state.pointerX : 0, pointerY: animated ? state.pointerY : 0 };
    let moving = false;
    (Object.keys(targets) as (keyof typeof targets)[]).forEach(key => {
      value[key] += (targets[key] - value[key]) * factor;
      if (Math.abs(targets[key] - value[key]) > .0006) moving = true;
    });
    const p = value.progress;
    const opening = range(.035, .43, p);
    const precisionIn = range(.23, .48, p);
    const stories = range(.64, .93, p);
    const closeUp = Math.sin(Math.PI * range(.10, .80, p));
    camera.position.set(-.18 * closeUp + value.pointerX * .035, .52 + .14 * closeUp - .12 * stories, 10.3 - .42 * closeUp);
    camera.lookAt(0, 0, 0);
    if (root.current) {
      root.current.position.set(anchor, mobile ? -.02 : -.18, 0);
      root.current.scale.setScalar(scale * (1 - opening * .19));
      root.current.rotation.set(.08 - .05 * precisionIn - value.pointerY * .018, -.16 + .25 * opening + value.pointerX * .032, -.11 + .075 * stories);
    }
    if (shell.current) {
      shell.current.children.forEach(node => {
        const rest = node.userData.rest as Vector3;
        const outward = node.userData.outward as Vector3;
        const index = node.userData.index as number;
        const stagger = range(.025 + (index % 5) * .012, .44 + (index % 3) * .024, p);
        const distance = stagger * (.70 + (index % 4) * .09) + stories * .18;
        node.position.copy(rest).addScaledVector(outward, distance);
        node.rotation.set(stagger * Math.sin(index * 3) * .18, stagger * Math.cos(index) * .23, stagger * Math.sin(index) * .12);
        node.scale.setScalar(1 - stories * .32);
      });
      shell.current.rotation.y = opening * .11;
    }
    if (heart.current) {
      heart.current.rotation.set(.31 + opening * .15, -.21 + opening * .76, -.10);
      heart.current.scale.setScalar(1 - precisionIn * .37 - stories * .24);
      heart.current.position.z = .10 - precisionIn * .45;
    }
    if (precision.current) {
      precision.current.visible = precisionIn > .001;
      precision.current.position.set(0, -.04, -.02 + precisionIn * .28 - stories * .68);
      precision.current.scale.setScalar(.35 + precisionIn * .52 - stories * .14);
      precision.current.rotation.set(.08 + stories * .24, -.12 + stories * .16, -.09);
    }
    if (layers.current) {
      layers.current.children.forEach(node => {
        if (node.name === 'HERO_Substrate') node.position.z = -precisionIn * .20;
        if (node.name === 'HERO_Ceramic') node.position.z = .075 + precisionIn * .06;
        if (node.name === 'HERO_Die') node.position.z = .17 + precisionIn * .16;
      });
    }
    if (books.current) {
      books.current.visible = stories > .001;
      books.current.children.forEach((node, index) => {
        const spread = range(.64 + index * .025, .90 + index * .025, p);
        node.position.set([-.86, .08, 1.04][index] * spread, -.10 + ([.17, .14, -.20][index] + .1) * spread, [.58, .96, .72][index] * spread);
        node.rotation.set(.01, [-.27, .035, .28][index] * spread, [-.18, .035, .17][index] * spread);
        node.scale.setScalar(Math.max(.001, spread * (index === 1 ? 1.27 : 1.03)));
      });
    }
    if (moving && animated) invalidate();
  });

  const navigate = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    const p = current.current.progress;
    document.getElementById(p < .34 ? 'work' : p < .67 ? 'experience' : 'writing')?.scrollIntoView({ behavior: controls.current.motion && controls.current.cinematic ? 'smooth' : 'auto', block: 'start' });
  };
  useEffect(() => () => { document.body.style.cursor = ''; }, []);
  return <>
    <Studio ready={ready} />
    <group ref={root} onClick={navigate} onPointerOver={() => { document.body.style.cursor = 'pointer'; }} onPointerOut={() => { document.body.style.cursor = ''; }}>
      <Specimen shell={shell} heart={heart} controls={controls} />
      <Precision rig={precision} layers={layers} />
      <group ref={books} visible={false}>{covers.map((src, index) => <CoverBook key={src} src={src} index={index} />)}</group>
    </group>
  </>;
}

function Capture({ controls, fail }: { controls: RefObject<WorkbenchControls>; fail: () => void }) {
  const { gl, invalidate } = useThree();
  useEffect(() => {
    controls.current.invalidate = invalidate;
    const lost = (event: Event) => { event.preventDefault(); fail(); };
    gl.domElement.addEventListener('webglcontextlost', lost);
    const setProgress = (progress: number) => {
      controls.current.capture = true; controls.current.selected = null;
      controls.current.pointerX = 0; controls.current.pointerY = 0;
      controls.current.progress = clamp(progress);
      window.dispatchEvent(new CustomEvent('workbench:focus', { detail: progress < .34 ? 'lens' : progress < .67 ? 'circuit' : 'book' }));
      invalidate();
      return new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    };
    const api = { canvas: gl.domElement, get asset() { return controls.current.asset; }, setProgress, setProgressAsync: setProgress, reset() { controls.current.capture = false; controls.current.progress = 0; invalidate(); } };
    window.__workbenchCapture = api; invalidate();
    return () => {
      gl.domElement.removeEventListener('webglcontextlost', lost);
      controls.current.invalidate = undefined;
      if (window.__workbenchCapture === api) delete window.__workbenchCapture;
    };
  }, [gl, invalidate, controls, fail]);
  return null;
}

export default function WorkbenchCanvas({ controls, ready, fail }: { controls: RefObject<WorkbenchControls>; ready: () => void; fail: () => void }) {
  return <Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ position: [0, .52, 10.3], fov: 36, near: .1, far: 40 }} gl={{ antialias: true, alpha: true, powerPreference: 'low-power', failIfMajorPerformanceCaveat: true }} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', touchAction: 'pan-y' }} aria-hidden="true" onCreated={({ gl, camera }) => { gl.setClearColor('#030405', 0); camera.lookAt(0, 0, 0); }}>
    <WorkbenchScene controls={controls} ready={ready} />
    <Capture controls={controls} fail={fail} />
  </Canvas>;
}
