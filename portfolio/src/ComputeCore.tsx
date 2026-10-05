import {
  Component,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  ACESFilmicToneMapping,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  EdgesGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  OrthographicCamera,
  Path,
  PMREMGenerator,
  RepeatWrapping,
  Shape,
  SRGBColorSpace,
} from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { scrollSignal, subscribeToScroll } from "./scrollSignal";

type CoreProps = { onReady?: () => void; onFailure?: () => void };
type Tier = "high" | "medium" | "low";
type Instance = {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  colour?: string;
};
type Diagnostics = {
  tier: Tier;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  dpr: number;
  rendering: "settling" | "resting";
  procedural: true;
};
declare global {
  interface Window {
    __computeDiagnostics?: Diagnostics;
  }
}
const PROJECT_TINTS = [0xc3e85b, 0xb4c8c4, 0xd7c89e, 0xaed4ad] as const;

/** No GPU, slow connection, or a genuinely small device gets the authored SVG. */
function deviceTier(): Tier {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  if (
    nav.connection?.saveData ||
    (nav.deviceMemory !== undefined && nav.deviceMemory <= 2) ||
    navigator.hardwareConcurrency <= 2
  )
    return "low";
  // Catch a missing GPU before Fiber tries to construct its renderer. The probe
  // context is immediately released; it never draws or stays in memory.
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2", {
      failIfMajorPerformanceCaveat: true,
    });
    if (!context) return "low";
    context.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    return "low";
  }
  return matchMedia("(pointer: coarse)").matches ||
    matchMedia("(max-width: 760px)").matches ||
    (nav.deviceMemory !== undefined && nav.deviceMemory <= 4)
    ? "medium"
    : "high";
}

function slab(
  width: number,
  depth: number,
  thickness: number,
  notch = false,
  aperture = false,
) {
  const x = width / 2,
    z = depth / 2,
    c = Math.min(width, depth) * 0.065;
  const outline = new Shape();
  outline.moveTo(-x + c, -z);
  outline.lineTo(x - c, -z);
  outline.lineTo(x, -z + c);
  if (notch) {
    outline.lineTo(x, z - 0.52);
    outline.lineTo(x - 0.36, z - 0.52);
    outline.lineTo(x - 0.36, z - c);
    outline.lineTo(x - 0.36 - c, z);
  } else {
    outline.lineTo(x, z - c);
    outline.lineTo(x - c, z);
  }
  outline.lineTo(-x + c, z);
  outline.lineTo(-x, z - c);
  outline.lineTo(-x, -z + c);
  outline.closePath();
  if (aperture) {
    const hole = new Path();
    hole.moveTo(-0.89, -0.78);
    hole.lineTo(-0.89, 0.78);
    hole.lineTo(1.15, 0.78);
    hole.lineTo(1.15, -0.78);
    hole.closePath();
    outline.holes.push(hole);
  }
  const geometry = new ExtrudeGeometry(outline, {
    depth: thickness,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.027,
    bevelThickness: 0.027,
    curveSegments: 1,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, -thickness / 2, 0);
  return geometry;
}

function makePins(tier: Tier): Instance[] {
  const rows = tier === "high" ? 18 : 11;
  const pins: Instance[] = [];
  for (let i = 0; i < rows; i++) {
    const x = -1.56 + (i * 3.12) / (rows - 1);
    pins.push({ x, y: -0.1, z: -1.4, w: 0.052, h: 0.045, d: 0.24 });
    pins.push({ x, y: -0.1, z: 1.4, w: 0.052, h: 0.045, d: 0.24 });
    if (i < rows - 3) {
      const z = -1.04 + (i * 1.92) / (rows - 4);
      pins.push({ x: -1.88, y: -0.1, z, w: 0.24, h: 0.045, d: 0.052 });
      if (z < 0.7)
        pins.push({ x: 1.88, y: -0.1, z, w: 0.24, h: 0.045, d: 0.052 });
    }
  }
  return pins;
}

function makeTraces(tier: Tier): Instance[] {
  const traces: Instance[] = [];
  const routes = tier === "high" ? 10 : 6;
  for (let i = 0; i < routes; i++) {
    const x = -1.32 + (i * 2.62) / (routes - 1);
    const offset = 0.18 + (i % 3) * 0.05;
    const colour = i % 4 === 0 ? "#c3e85b" : "#697e67";
    for (const sign of [-1, 1]) {
      traces.push({
        x,
        y: 0.123,
        z: sign * (0.81 + offset / 2),
        w: 0.012,
        h: 0.009,
        d: offset,
        colour,
      });
      traces.push({
        x: x + 0.055,
        y: 0.123,
        z: sign * (0.81 + offset),
        w: 0.12,
        h: 0.009,
        d: 0.012,
        colour,
      });
      traces.push({
        x: x + 0.11,
        y: 0.123,
        z: sign * (1.05 + offset / 2),
        w: 0.012,
        h: 0.009,
        d: 0.1,
        colour,
      });
    }
  }
  for (let i = 0; i < 6; i++) {
    const z = -0.57 + i * 0.21;
    traces.push({
      x: -1.31,
      y: 0.123,
      z,
      w: 0.37,
      h: 0.009,
      d: 0.012,
      colour: i === 2 ? "#c3e85b" : "#697e67",
    });
    traces.push({
      x: -1.49,
      y: 0.123,
      z: z - 0.043,
      w: 0.012,
      h: 0.009,
      d: 0.09,
      colour: "#697e67",
    });
  }
  return traces;
}

function makeTopology(tier: Tier): Instance[] {
  const tiles: Instance[] = [];
  const cols = tier === "high" ? 9 : 7,
    rows = tier === "high" ? 7 : 5;
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < rows; j++) {
      const band = i < Math.ceil(cols / 3) ? 0 : j < rows / 2 ? 1 : 2;
      tiles.push({
        x: -0.76 + (i * 1.52) / (cols - 1),
        y: 0.11,
        z: -0.53 + (j * 1.06) / (rows - 1),
        w: 1.3 / cols,
        h: 0.022 + (band === 1 ? 0.012 : 0),
        d: 0.85 / rows,
        colour: ["#536259", "#8d9a8a", "#344d3c"][band],
      });
    }
  return tiles;
}

function Instances({
  items,
  geometry,
  colour = "#b7b8a6",
  metalness = 0.7,
  roughness = 0.35,
}: {
  items: Instance[];
  geometry: BoxGeometry;
  colour?: string;
  metalness?: number;
  roughness?: number;
}) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const transform = new Object3D(),
      tint = new Color();
    items.forEach((item, i) => {
      transform.position.set(item.x, item.y, item.z);
      transform.scale.set(item.w, item.h, item.d);
      transform.updateMatrix();
      ref.current!.setMatrixAt(i, transform.matrix);
      ref.current!.setColorAt(i, tint.set(item.colour ?? colour));
    });
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [items, colour]);
  return (
    <instancedMesh ref={ref} args={[geometry, undefined, items.length]}>
      <meshStandardMaterial metalness={metalness} roughness={roughness} />
    </instancedMesh>
  );
}

function surfaceMark() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const c = canvas.getContext("2d");
  if (c) {
    c.fillStyle = "#28352d";
    c.textAlign = "left";
    c.font = "500 37px monospace";
    c.fillText("AS / CORE 01", 12, 48);
    c.fillStyle = "#576356";
    c.font = "22px monospace";
    c.fillText("MULTIPLE DISCIPLINES", 12, 91);
    c.strokeStyle = "#657461";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(450, 20);
    c.lineTo(450, 93);
    c.moveTo(432, 58);
    c.lineTo(469, 58);
    c.stroke();
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function grounding() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const c = canvas.getContext("2d");
  if (c) {
    const gradient = c.createRadialGradient(64, 64, 8, 64, 64, 64);
    gradient.addColorStop(0, "rgba(17,25,17,.27)");
    gradient.addColorStop(0.45, "rgba(17,25,17,.12)");
    gradient.addColorStop(1, "rgba(17,25,17,0)");
    c.fillStyle = gradient;
    c.fillRect(0, 0, 128, 128);
  }
  return new CanvasTexture(canvas);
}

function brushedMetal() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const c = canvas.getContext("2d");
  if (c) {
    // A small deterministic normal texture catches the studio cards along fine
    // machining lines. It is material detail, not a network asset or animation.
    for (let row = 0; row < 128; row++) {
      const groove = Math.round(
        128 + Math.sin(row * 2.71) * 9 + Math.sin(row * 0.83) * 4,
      );
      c.fillStyle = `rgb(128,${groove},255)`;
      c.fillRect(0, row, 128, 1);
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  return texture;
}

function networkGeometry() {
  const points: number[] = [];
  const nodePositions = [
    [-2.8, -1.7],
    [2.8, -1.45],
    [-2.65, 1.55],
    [2.7, 1.45],
    [-0.9, 2.4],
    [1.3, -2.4],
  ];
  for (const [x, z] of nodePositions) {
    const startX = Math.sign(x) * 1.45,
      startZ = Math.sign(z) * 0.83;
    points.push(
      startX,
      -0.12,
      startZ,
      x,
      -0.12,
      startZ,
      x,
      -0.12,
      startZ,
      x,
      -0.12,
      z,
    );
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(points, 3));
  const nodes = nodePositions.map(([x, z], i) => ({
    x,
    y: -0.12,
    z,
    w: 0.42 + (i % 2) * 0.12,
    h: 0.11,
    d: 0.38,
    colour: i % 2 === 0 ? "#777e71" : "#37463b",
  }));
  const signals = nodes.map((node) => ({
    ...node,
    y: -0.052,
    w: 0.15,
    h: 0.008,
    d: 0.11,
    colour: "#c3e85b",
  }));
  return { geometry, nodes, signals };
}

function CoreScene({ tier, onReady, onFailure }: CoreProps & { tier: Tier }) {
  const { gl, scene, camera, size, invalidate } = useThree();
  const root = useRef<Group>(null),
    plate = useRef<Group>(null),
    die = useRef<Group>(null),
    wafer = useRef<Group>(null),
    network = useRef<Group>(null);
  const accent = useRef<MeshStandardMaterial>(null);
  const callback = useRef({ onReady, onFailure });
  callback.current = { onReady, onFailure };
  const readyFrame = useRef(0),
    ready = useRef(false);
  const state = useRef({
    separation: 0,
    network: 0,
    yaw: -0.38,
    tilt: 0,
    scale: 1,
    offset: 0,
    waferTilt: 0,
    dieShift: 0,
  });
  const colourTarget = useMemo(() => new Color("#c3e85b"), []);
  const diagnostics = useMemo<Diagnostics>(
    () => ({
      tier,
      drawCalls: 0,
      triangles: 0,
      geometries: 0,
      textures: 0,
      dpr: gl.getPixelRatio(),
      rendering: "resting",
      procedural: true,
    }),
    [tier, gl],
  );
  const pieces = useMemo(() => {
    const base = slab(3.65, 2.65, 0.22, true),
      silver = slab(3.28, 2.3, 0.17, true, true),
      silicon = slab(1.88, 1.4, 0.14),
      glass = slab(2.25, 1.78, 0.018);
    return {
      base,
      silver,
      silicon,
      glass,
      glassEdge: new EdgesGeometry(glass, 30),
      unit: new BoxGeometry(1, 1, 1),
      pins: makePins(tier),
      traces: makeTraces(tier),
      topology: makeTopology(tier),
      mark: surfaceMark(),
      shadow: grounding(),
      brushed: brushedMetal(),
      net: networkGeometry(),
    };
  }, [tier]);
  const screws = useMemo<Instance[]>(
    () => [
      { x: -1.5, y: 0.127, z: -0.91, w: 0.07, h: 0.024, d: 0.07 },
      { x: -1.5, y: 0.127, z: 0.91, w: 0.07, h: 0.024, d: 0.07 },
      { x: 1.41, y: 0.127, z: -0.91, w: 0.07, h: 0.024, d: 0.07 },
      { x: 1.1, y: 0.127, z: 0.91, w: 0.07, h: 0.024, d: 0.07 },
    ],
    [],
  );

  useLayoutEffect(() => {
    const cam = camera as OrthographicCamera;
    cam.zoom =
      Math.min(size.width, size.height) / (tier === "high" ? 5.2 : 5.05);
    cam.lookAt(0, 0.21, 0);
    cam.updateProjectionMatrix();
    invalidate();
  }, [camera, size.width, size.height, tier, invalidate]);

  useEffect(() => {
    // Generated once from geometry; no environment download or runtime capture.
    const studio = new RoomEnvironment(),
      pmrem = new PMREMGenerator(gl);
    const environment = pmrem.fromScene(studio, 0.025, 0.1, 100, {
      size: tier === "high" ? 128 : 64,
    });
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.76;
    studio.dispose();
    pmrem.dispose();
    invalidate();
    const lost = (event: Event) => {
      event.preventDefault();
      callback.current.onFailure?.();
    };
    gl.domElement.addEventListener("webglcontextlost", lost);
    let wasVisible = scrollSignal.visible && !document.hidden;
    let wasReduced = scrollSignal.reducedMotion;
    let wasExpanded = scrollSignal.expanded;
    let previousChapter = scrollSignal.chapter;
    let previousProject = scrollSignal.project;
    let previousProgress = scrollSignal.progress;
    let previousPointerX = scrollSignal.pointerX;
    let previousPointerY = scrollSignal.pointerY;
    const unsubscribe = subscribeToScroll(() => {
      if (!scrollSignal.expanded) delete window.__computeDiagnostics;
      const visible = scrollSignal.visible && !document.hidden;
      // Moving the DOM anchor does not change pixels inside the canvas. Only
      // signals used by the current pose need a GPU frame; reduced motion keeps
      // its assembly unchanged while native page scrolling carries the figure.
      const poseChanged =
        scrollSignal.reducedMotion !== wasReduced ||
        scrollSignal.expanded !== wasExpanded ||
        (!scrollSignal.reducedMotion &&
          (scrollSignal.chapter !== previousChapter ||
            (scrollSignal.chapter === 3 &&
              scrollSignal.project !== previousProject) ||
            (scrollSignal.chapter >= 1 &&
              scrollSignal.chapter <= 3 &&
              scrollSignal.progress !== previousProgress) ||
            (tier === "high" &&
              (scrollSignal.pointerX !== previousPointerX ||
                scrollSignal.pointerY !== previousPointerY))));
      if (visible && (!wasVisible || poseChanged)) invalidate();
      wasVisible = visible;
      wasReduced = scrollSignal.reducedMotion;
      wasExpanded = scrollSignal.expanded;
      previousChapter = scrollSignal.chapter;
      previousProject = scrollSignal.project;
      previousProgress = scrollSignal.progress;
      previousPointerX = scrollSignal.pointerX;
      previousPointerY = scrollSignal.pointerY;
    });
    return () => {
      unsubscribe();
      gl.domElement.removeEventListener("webglcontextlost", lost);
      cancelAnimationFrame(readyFrame.current);
      delete window.__computeDiagnostics;
      scene.environment = null;
      environment.dispose();
    };
  }, [gl, scene, tier, invalidate]);

  useEffect(
    () => () => {
      pieces.base.dispose();
      pieces.silver.dispose();
      pieces.silicon.dispose();
      pieces.glass.dispose();
      pieces.glassEdge.dispose();
      pieces.unit.dispose();
      pieces.mark.dispose();
      pieces.shadow.dispose();
      pieces.brushed.dispose();
      pieces.net.geometry.dispose();
    },
    [pieces],
  );

  useFrame((_, delta) => {
    if (
      !scrollSignal.visible ||
      document.hidden ||
      !root.current ||
      !plate.current ||
      !die.current ||
      !wafer.current ||
      !network.current
    )
      return;
    const s = state.current,
      reduced = scrollSignal.reducedMotion;
    const chapter = reduced ? 0 : scrollSignal.chapter,
      p = scrollSignal.progress;
    const project = Math.max(0, Math.min(3, scrollSignal.project));
    let separation = 0,
      networkAmount = 0,
      yaw = -0.38,
      tilt = 0,
      scale = 1,
      offset = 0,
      waferTilt = 0,
      dieShift = 0;
    if (chapter === 1) {
      separation = 0.08 + p * 0.12;
      yaw += p * 0.16;
    }
    if (chapter === 2) {
      separation = 0.86 + p * 0.12;
      yaw = -0.52;
      scale = 0.92;
      offset = -0.4;
    }
    if (chapter === 3) {
      separation = 0.42 + p * 0.08;
      yaw = -0.3 + project * 0.18;
      scale = 0.95;
      offset = -0.14;
      waferTilt = project === 1 ? -0.16 : project === 3 ? 0.12 : 0;
      dieShift = project === 2 ? 0.25 : 0;
    }
    if (chapter === 4) {
      separation = 0.22;
      networkAmount = 1;
      scale = 0.77;
      yaw = -0.22;
    }
    if (chapter === 5) {
      separation = 0.1;
      yaw = -0.3;
      scale = 0.92;
    }
    if (chapter === 6) {
      yaw = -0.24;
      scale = 0.96;
    }
    if (scrollSignal.expanded && !reduced) {
      separation += 0.48;
      scale *= 0.9;
      offset -= 0.1;
    }
    if (!reduced && tier === "high") {
      yaw += scrollSignal.pointerX * 0.035;
      tilt = scrollSignal.pointerY * 0.018;
    }
    const speed = reduced ? 1 : 1 - Math.exp(-Math.min(delta, 0.05) * 18);
    let remaining = 0;
    remaining += Math.abs(s.separation - separation);
    s.separation += (separation - s.separation) * speed;
    remaining += Math.abs(s.network - networkAmount);
    s.network += (networkAmount - s.network) * speed;
    remaining += Math.abs(s.yaw - yaw);
    s.yaw += (yaw - s.yaw) * speed;
    remaining += Math.abs(s.tilt - tilt);
    s.tilt += (tilt - s.tilt) * speed;
    remaining += Math.abs(s.scale - scale);
    s.scale += (scale - s.scale) * speed;
    remaining += Math.abs(s.offset - offset);
    s.offset += (offset - s.offset) * speed;
    remaining += Math.abs(s.waferTilt - waferTilt);
    s.waferTilt += (waferTilt - s.waferTilt) * speed;
    remaining += Math.abs(s.dieShift - dieShift);
    s.dieShift += (dieShift - s.dieShift) * speed;
    root.current.rotation.set(s.tilt, s.yaw, 0);
    root.current.scale.setScalar(s.scale);
    root.current.position.y = s.offset;
    plate.current.position.y = -0.015 + s.separation * 0.43;
    die.current.position.set(
      0.13 + s.dieShift,
      0.075 + s.separation * 0.86,
      -0.015,
    );
    wafer.current.position.y = 0.35 + s.separation * 1.54;
    wafer.current.rotation.z = s.waferTilt;
    network.current.visible = s.network > 0.005;
    network.current.scale.setScalar(Math.max(0.01, s.network));
    if (accent.current) {
      colourTarget.setHex(chapter === 3 ? PROJECT_TINTS[project] : 0xc3e85b);
      remaining +=
        Math.abs(accent.current.color.r - colourTarget.r) +
        Math.abs(accent.current.color.g - colourTarget.g) +
        Math.abs(accent.current.color.b - colourTarget.b);
      accent.current.color.lerp(colourTarget, speed);
    }
    const settling = remaining > 0.0015;
    if (settling) invalidate();
    if (!ready.current) {
      ready.current = true;
      // Fiber's frame callbacks precede drawing. Notify DOM only after it draws.
      readyFrame.current = requestAnimationFrame(() =>
        callback.current.onReady?.(),
      );
    }
    if (scrollSignal.expanded) {
      diagnostics.drawCalls = gl.info.render.calls;
      diagnostics.triangles = gl.info.render.triangles;
      diagnostics.geometries = gl.info.memory.geometries;
      diagnostics.textures = gl.info.memory.textures;
      diagnostics.dpr = gl.getPixelRatio();
      diagnostics.rendering = settling ? "settling" : "resting";
      window.__computeDiagnostics = diagnostics;
    }
  });

  return (
    <>
      <ambientLight intensity={0.24} color="#f6f4e9" />
      <directionalLight position={[-3, 7, 4]} intensity={2.4} color="#fff9e9" />
      <directionalLight position={[4, 2, -4]} intensity={1.1} color="#e9f1f1" />
      <group ref={root} rotation={[0, -0.38, 0]}>
        <mesh position={[0, -0.39, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[5.3, 4.1]} />
          <meshBasicMaterial
            map={pieces.shadow}
            transparent
            opacity={0.75}
            depthWrite={false}
          />
        </mesh>
        <group position={[0, -0.19, 0]}>
          <mesh geometry={pieces.base}>
            <meshStandardMaterial
              color="#27342d"
              metalness={0.64}
              roughness={0.36}
            />
          </mesh>
          <Instances
            items={pieces.pins}
            geometry={pieces.unit}
            colour="#b5b89e"
            metalness={0.85}
            roughness={0.3}
          />
        </group>
        <group ref={plate} position={[0, -0.015, 0]}>
          <mesh geometry={pieces.silver}>
            {tier === "high" ? (
              <meshPhysicalMaterial
                color="#c1c4be"
                metalness={0.94}
                roughness={0.22}
                envMapIntensity={1.15}
                normalMap={pieces.brushed}
                normalScale={[0.18, 0.18]}
                anisotropy={0.45}
                clearcoat={0.14}
                clearcoatRoughness={0.28}
              />
            ) : (
              <meshStandardMaterial
                color="#b8beb4"
                metalness={0.87}
                roughness={0.26}
                normalMap={pieces.brushed}
                normalScale={[0.12, 0.12]}
              />
            )}
          </mesh>
          <Instances
            items={pieces.traces}
            geometry={pieces.unit}
            metalness={0.45}
            roughness={0.42}
          />
          <Instances items={screws} geometry={pieces.unit} colour="#27342d" />
          <mesh
            position={[-0.3, 0.141, 0.98]}
            rotation={[-Math.PI / 2, 0, 0]}
            renderOrder={1}
          >
            <planeGeometry args={[1.3, 0.17]} />
            <meshBasicMaterial
              map={pieces.mark}
              transparent
              alphaTest={0.1}
              depthWrite={false}
              polygonOffset
              polygonOffsetFactor={-1}
            />
          </mesh>
        </group>
        <group ref={die} position={[0.13, 0.075, -0.015]}>
          <mesh geometry={pieces.silicon}>
            <meshStandardMaterial
              color="#17251d"
              metalness={0.62}
              roughness={0.29}
            />
          </mesh>
          <Instances
            items={pieces.topology}
            geometry={pieces.unit}
            metalness={0.58}
            roughness={0.3}
          />
          <mesh position={[-0.19, 0.134, -0.01]}>
            <boxGeometry args={[0.016, 0.009, 1.24]} />
            <meshStandardMaterial
              ref={accent}
              color="#c3e85b"
              metalness={0.24}
              roughness={0.38}
            />
          </mesh>
          <mesh position={[0.16, 0.134, 0.066]}>
            <boxGeometry args={[1.65, 0.009, 0.016]} />
            <meshStandardMaterial
              color="#a9ba90"
              metalness={0.35}
              roughness={0.42}
            />
          </mesh>
        </group>
        <group ref={wafer} position={[0, 0.35, 0]}>
          <mesh geometry={pieces.glass} renderOrder={2}>
            <meshStandardMaterial
              color="#d4ead6"
              metalness={0.08}
              roughness={0.22}
              transparent
              opacity={tier === "high" ? 0.16 : 0.12}
              depthWrite={false}
              side={DoubleSide}
            />
          </mesh>
          <lineSegments geometry={pieces.glassEdge}>
            <lineBasicMaterial color="#a6bf9b" transparent opacity={0.6} />
          </lineSegments>
        </group>
        <group ref={network} visible={false}>
          <lineSegments geometry={pieces.net.geometry}>
            <lineBasicMaterial color="#6b845f" transparent opacity={0.65} />
          </lineSegments>
          <Instances
            items={pieces.net.nodes}
            geometry={pieces.unit}
            metalness={0.55}
            roughness={0.4}
          />
          <Instances
            items={pieces.net.signals}
            geometry={pieces.unit}
            metalness={0.22}
            roughness={0.5}
          />
        </group>
      </group>
    </>
  );
}

class CoreBoundary extends Component<
  { children: ReactNode; onFailure?: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure?.();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function StaticTier({ onFailure }: CoreProps) {
  useEffect(() => {
    onFailure?.();
  }, [onFailure]);
  return null;
}

export default function ComputeCore({ onReady, onFailure }: CoreProps) {
  const tier = useMemo(deviceTier, []);
  useEffect(() => {
    const stage = document.querySelector<HTMLElement>(".core-stage");
    if (stage) stage.dataset.quality = tier === "low" ? "static" : tier;
  }, [tier]);
  if (tier === "low") return <StaticTier onFailure={onFailure} />;
  return (
    <CoreBoundary onFailure={onFailure}>
      <Canvas
        resize={{ scroll: false }}
        orthographic
        camera={{ position: [6, 5.8, 7.8], near: 0.1, far: 40, zoom: 80 }}
        frameloop="demand"
        dpr={tier === "high" ? [1, 1.5] : 1}
        gl={{
          antialias: tier === "high",
          alpha: true,
          powerPreference: tier === "high" ? "high-performance" : "low-power",
          failIfMajorPerformanceCaveat: true,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
          gl.toneMapping = ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.1;
        }}
        fallback={null}
      >
        <CoreScene tier={tier} onReady={onReady} onFailure={onFailure} />
      </Canvas>
    </CoreBoundary>
  );
}
