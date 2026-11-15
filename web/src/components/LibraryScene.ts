/** A demand-rendered Three scene. No React renderer crosses the two applications. */
import {
  ACESFilmicToneMapping, AmbientLight, BoxGeometry, CanvasTexture,
  DirectionalLight, FogExp2, Group, HemisphereLight, IcosahedronGeometry,
  LinearMipmapLinearFilter, Mesh, MeshPhysicalMaterial, MeshStandardMaterial,
  NoColorSpace, PCFShadowMap, PerspectiveCamera, PlaneGeometry, PMREMGenerator, Scene,
  SpotLight, SRGBColorSpace, Texture, TextureLoader, Vector3, WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

interface ArchiveBook { slug: string; title: string; cover: string; image?: HTMLImageElement; }
interface View { progress: number; pointerX: number; pointerY: number; selected: number; }
export interface ArchiveScene { setView(view: View): void; setActive(active: boolean): void; resize(): void; dispose(): void; }
interface Options { onReady(): void; onUnavailable(): void; }

const ink = "#080A10";
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (value: number) => { const x = clamp(value); return x * x * (3 - 2 * x); };

export function createLibraryScene(host: HTMLDivElement, books: ArchiveBook[], options: Options): ArchiveScene {
  const compact = () => host.clientWidth < 560;
  const renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setClearColor(ink, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = !compact();
  renderer.shadowMap.type = PCFShadowMap;
  renderer.domElement.setAttribute("aria-hidden", "true");
  renderer.domElement.dataset.libraryCanvas = "true";
  host.appendChild(renderer.domElement);
  const scene = new Scene();
  scene.fog = new FogExp2(ink, .035);
  const camera = new PerspectiveCamera(35, 1, .1, 60);
  camera.position.set(4.5, 2.6, 9.3);
  const target = new Vector3(0, .2, 0);
  const cameraTarget = new Vector3();
  const lookTarget = new Vector3();
  const archive = new Group();
  scene.add(archive);
  const resources: { dispose(): void }[] = [];
  const own = <T extends { dispose(): void }>(resource: T): T => { resources.push(resource); return resource; };
  const environment = new RoomEnvironment();
  const pmrem = new PMREMGenerator(renderer);
  const environmentMap = own(pmrem.fromScene(environment, .04));
  scene.environment = environmentMap.texture;
  environment.dispose();
  pmrem.dispose();
  scene.add(new AmbientLight("#C5D2E1", .38));
  scene.add(new HemisphereLight("#EDEBE7", "#17202E", .8));
  const key = new SpotLight("#F7EEE1", 110, 30, .55, 1, 2);
  key.position.set(-4, 7, 7);
  key.castShadow = !compact();
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -.0005;
  scene.add(key);
  const rim = new DirectionalLight("#B9DBEA", 3.1);
  rim.position.set(5, 3, -2);
  scene.add(rim);
  const fill = new DirectionalLight("#C89C78", 1.2);
  fill.position.set(-5, -.5, 3);
  scene.add(fill);

  function canvasTexture(width: number, height: number, paint: (context: CanvasRenderingContext2D) => void) {
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext("2d");
    if (context) paint(context);
    const texture = own(new CanvasTexture(canvas));
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    return texture;
  }
  const paperTexture = canvasTexture(64, 512, context => {
    context.fillStyle = "#D8D2C6"; context.fillRect(0, 0, 64, 512);
    for (let y = 0; y < 512; y += 3) {
      context.fillStyle = y % 5 === 0 ? "#A8A49C" : "#C1BDB3";
      context.fillRect(0, y, 64, 1);
    }
  });
  const paperMaterial = own(new MeshStandardMaterial({ map: paperTexture, color: "#F1EDE3", roughness: .88 }));
  const coverEdge = own(new MeshStandardMaterial({ color: "#18202B", roughness: .36, metalness: .15 }));
  const coverGeometry = own(new BoxGeometry(1.06, 1.59, .027));
  const pageGeometry = own(new BoxGeometry(1.015, 1.525, .19));
  const spineGeometry = own(new PlaneGeometry(.23, 1.59));
  const bookGroups: Group[] = [];
  const coverMaterials: MeshPhysicalMaterial[] = [];
  const total = compact() ? Math.min(12, books.length) : books.length;

  for (let index = 0; index < total; index++) {
    const book = books[index];
    const group = new Group();
    group.name = `novel-${book.slug}`;
    archive.add(group);
    bookGroups.push(group);
    const page = new Mesh(pageGeometry, paperMaterial);
    page.castShadow = index < 3; page.receiveShadow = true;
    group.add(page);
    const coverMaterial = own(new MeshPhysicalMaterial({ color: "#EEECE6", roughness: .42, metalness: .02, clearcoat: .32, clearcoatRoughness: .26 }));
    coverMaterials.push(coverMaterial);
    const front = new Mesh(coverGeometry, [coverEdge, coverEdge, coverEdge, coverEdge, coverMaterial, coverEdge]);
    front.position.z = .111; front.castShadow = index < 3;
    group.add(front);
    const back = new Mesh(coverGeometry, coverEdge);
    back.position.z = -.111;
    group.add(back);
    const spineTexture = canvasTexture(128, 768, context => {
      context.fillStyle = index % 3 === 0 ? "#202B36" : index % 3 === 1 ? "#382A23" : "#242536";
      context.fillRect(0, 0, 128, 768);
      context.strokeStyle = "#C89C78"; context.lineWidth = 2;
      context.strokeRect(16, 24, 96, 720);
      context.save(); context.translate(64, 384); context.rotate(-Math.PI / 2);
      context.fillStyle = "#EEECE6"; context.textAlign = "center"; context.textBaseline = "middle";
      context.font = "28px Georgia, serif"; context.fillText(book.title, 0, 0, 620); context.restore();
      context.fillStyle = "#B9DBEA"; context.textAlign = "center"; context.font = "14px sans-serif";
      context.fillText("ALEEM", 64, 705);
    });
    const spine = new Mesh(spineGeometry, own(new MeshStandardMaterial({ map: spineTexture, roughness: .52, metalness: .06 })));
    spine.position.x = -.533; spine.rotation.y = -Math.PI / 2;
    group.add(spine);
  }
  const stoneTexture = canvasTexture(256, 256, context => {
    const pixels = context.createImageData(256, 256);
    let seed = 719;
    for (let offset = 0; offset < pixels.data.length; offset += 4) {
      seed = (seed * 16807) % 2147483647;
      const value = 100 + (seed % 85);
      pixels.data[offset] = value; pixels.data[offset + 1] = value; pixels.data[offset + 2] = value; pixels.data[offset + 3] = 255;
    }
    context.putImageData(pixels, 0, 0);
    context.strokeStyle = "#636363"; context.lineWidth = .6;
    for (let index = 0; index < 15; index++) {
      context.beginPath();
      context.moveTo((index * 37) % 256, (index * 83) % 256);
      context.lineTo((index * 71 + 20) % 256, (index * 51 + 40) % 256);
      context.stroke();
    }
  });
  stoneTexture.colorSpace = NoColorSpace;
  const stone = own(new MeshStandardMaterial({ color: "#090D13", roughness: .8, metalness: .25, flatShading: true, bumpMap: stoneTexture, bumpScale: .045 }));
  const polished = own(new MeshPhysicalMaterial({ color: "#B9DBEA", roughness: .12, metalness: .4, clearcoat: .9, flatShading: true }));
  const groundGeometry = own(new IcosahedronGeometry(1, 1));
  const foundation = new Mesh(groundGeometry, stone);
  foundation.scale.set(3.05, .18, 2.05); foundation.position.set(.1, -2.28, -.2);
  foundation.rotation.y = .23; foundation.receiveShadow = true;
  archive.add(foundation);
  for (let index = 0; index < 7; index++) {
    const shard = new Mesh(groundGeometry, index === 3 ? polished : stone);
    const angle = index * .91;
    const size = .12 + (index % 3) * .12;
    shard.scale.set(size * 1.8, size * .65, size * 1.3);
    shard.position.set(Math.cos(angle) * 2.9, -2.2 + size * .5, Math.sin(angle) * 1.9);
    shard.rotation.set(index * .4, angle, index * .17);
    archive.add(shard);
  }

  let active = true;
  let disposed = false;
  let frame = 0;
  let renders = 0;
  let ready = false;
  let unavailable = false;
  let frontLoaded = 0;
  let frontFailed = false;
  let view: View = { progress: 0, pointerX: 0, pointerY: 0, selected: 1 };
  const current: View = { ...view };
  const focusWeights = [0, 1, 0];
  const textureLoader = new TextureLoader();
  const queue = books.slice(0, total).map((book, index) => ({ book, index }));
  let loadingTextures = 0;

  function loadedFront(success: boolean) {
    frontLoaded++;
    if (!success) frontFailed = true;
    if (!ready && frontLoaded >= Math.min(3, total)) {
      if (frontFailed) {
        unavailable = true; active = false;
        cancelAnimationFrame(frame); frame = 0;
        host.dataset.archiveState = "unavailable";
        options.onUnavailable();
        return;
      }
      ready = true;
      host.dataset.archiveState = "ready";
      host.dataset.archiveBooks = String(total);
      options.onReady();
    }
  }
  function pumpTextures() {
    if (disposed || !active) return;
    while (loadingTextures < 3 && queue.length) {
      const { book, index } = queue.shift()!;
      loadingTextures++;
      const finish = (texture?: Texture) => {
        loadingTextures--;
        if (disposed) { texture?.dispose(); return; }
        if (texture) {
          own(texture);
          texture.colorSpace = SRGBColorSpace;
          texture.minFilter = LinearMipmapLinearFilter;
          texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
          coverMaterials[index].map = texture;
          coverMaterials[index].needsUpdate = true;
        }
        if (index < 3) loadedFront(Boolean(texture));
        invalidate();
        pumpTextures();
      };
      // A fresh image element avoids srcset's density-corrected naturalWidth;
      // the selected URL is still reused from the browser's HTTP image cache.
      textureLoader.load(book.image?.currentSrc || book.cover, finish, undefined, () => finish());
    }
  }

  function positionBook(group: Group, index: number) {
    const p = current.progress;
    const focus = focusWeights[index] ?? 0;
    if (index < 3) {
      const x = [-1.58, 0, 1.56][index];
      const y = [.15, 1.05, -.45][index];
      group.position.set(x * (1 - p * .14), y + Math.sin(p * Math.PI) * .34 + focus * .12, 1.0 + focus * .22 + p * .2);
      group.rotation.set([.02, -.08, .04][index], [.20, -.08, -.23][index] - p * .13, [-.18, .035, .16][index] * (1 - p * .42));
      group.scale.setScalar(1.2 + focus * .04);
    } else {
      const fraction = (index - 3) / Math.max(1, total - 3);
      const angle = fraction * Math.PI * 2.13 - .25;
      const radius = 2.6 + (index % 3) * .16;
      group.position.set(Math.cos(angle) * radius * (1 - p * .12), Math.sin(angle) * 2.0 + .1 + p * .25, -1.1 - fraction * 1.45);
      group.rotation.set(Math.sin(angle) * .08, Math.cos(angle) * .45 - .05 + p * .16, Math.sin(angle) * .14);
      group.scale.setScalar(.64 + (index % 4) * .05);
    }
  }

  function draw() {
    frame = 0;
    if (disposed || !active || document.hidden) return;
    let unsettled = false;
    for (const key of ["progress", "pointerX", "pointerY"] as const) {
      const distance = view[key] - current[key];
      current[key] += distance * .12;
      if (Math.abs(distance) > .0005) unsettled = true;
      else current[key] = view[key];
    }
    current.selected = view.selected;
    for (let index = 0; index < 3; index++) {
      const distance = (view.selected === index ? 1 : 0) - focusWeights[index];
      focusWeights[index] += distance * .12;
      if (Math.abs(distance) > .001) unsettled = true;
    }
    const p = smooth(current.progress);
    cameraTarget.set(3.65 * (1 - p) + current.pointerX * .32, 2.1 - p * .6 - current.pointerY * .2, compact() ? 11.4 : 9.4 - p * .5);
    camera.position.lerp(cameraTarget, .15);
    if (camera.position.distanceToSquared(cameraTarget) > .00001) unsettled = true;
    lookTarget.set(.15 + current.pointerX * .08, .15 + p * .25, 0);
    target.lerp(lookTarget, .15);
    camera.lookAt(target);
    archive.rotation.y = -.06 + current.pointerX * .035 + p * .12;
    archive.rotation.x = current.pointerY * .012;
    bookGroups.forEach(positionBook);
    renderer.render(scene, camera);
    renders++;
    host.dataset.archiveFrames = String(renders);
    if (unsettled) invalidate();
  }
  function invalidate() { if (!frame && active && !disposed && !document.hidden) frame = requestAnimationFrame(draw); }
  function resize() {
    if (disposed) return;
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, compact() ? 1 : 1.5));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    invalidate();
  }
  const lost = (event: Event) => {
    event.preventDefault();
    if (!disposed) { unavailable = true; active = false; options.onUnavailable(); host.dataset.archiveState = "unavailable"; }
  };
  renderer.domElement.addEventListener("webglcontextlost", lost);
  resize(); pumpTextures(); invalidate();
  return {
    setView(next) { view = next; invalidate(); },
    setActive(next) {
      active = next && !unavailable;
      if (!active) { cancelAnimationFrame(frame); frame = 0; }
      else { pumpTextures(); invalidate(); }
    },
    resize,
    dispose() {
      disposed = true; active = false; cancelAnimationFrame(frame);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      resources.forEach(resource => resource.dispose());
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    },
  };
}
