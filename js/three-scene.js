/**
 * NOTHING TECH 3D INTERACTIVE VIEWPORT ENGINE
 * Author: Aleem (A1E3M)
 * Powered by Three.js (WebGL)
 * Features: Frosted Glass Refraction, Glyph LEDs, Exploded Disassembly, Scrollytelling Lerp
 */

(function () {
  'use strict';

  // Check WebGL Support
  function isWebGLAvailable() {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
      return false;
    }
  }

  if (!isWebGLAvailable()) {
    console.warn('[3D Engine] WebGL not supported. Graceful fallback active.');
    return;
  }

  // Scene State
  const state = {
    exploded: false,
    wireframe: false,
    glyphMode: 'white', // 'white', 'pulse', 'red', 'off'
    mouseX: 0,
    mouseY: 0,
    targetMouseX: 0,
    targetMouseY: 0,
    scrollProgress: 0,
    isUserInteracting: false,
    manualRotationY: 0,
    manualRotationX: 0,
    lastTouchX: 0,
    lastTouchY: 0,
    fps: 60,
    frameCount: 0,
    lastFpsUpdate: performance.now()
  };

  // Three.js Core Variables
  let scene, camera, renderer;
  let canvasContainer, canvas;
  let coreRoot, outerChassis, pcbBoard, microchip, glyphRing, glyphStrips = [], gearRing1, gearRing2, floatingChips = [];
  let glyphLight1, glyphLight2, ambientLight;

  // Materials Registry for Wireframe/Theme updates
  const materials = [];

  function init() {
    canvasContainer = document.getElementById('webgl-canvas-container');
    canvas = document.getElementById('webgl-canvas');
    if (!canvas) return;

    // 1. Scene Setup
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x070709, 0.05);

    // 2. Camera Setup
    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    camera.position.set(0, 0, 7.5);

    // 3. Renderer Setup
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    if (THREE.ACESFilmicToneMapping) {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
    }

    // 4. Lighting
    setupLighting();

    // 5. Build the Transparent Cybernetic Core
    buildHardwareCore();

    // 6. Event Listeners
    setupEventListeners();

    // 7. Initial Layout Sync
    onWindowResize();

    // 8. Start Render Loop
    requestAnimationFrame(renderLoop);
  }

  function setupLighting() {
    ambientLight = new THREE.AmbientLight(0x22242b, 1.2);
    scene.add(ambientLight);

    // Key Specular Rim Light
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
    keyLight.position.set(5, 8, 6);
    scene.add(keyLight);

    // Soft Fill Light
    const fillLight = new THREE.DirectionalLight(0x8a99ad, 1.2);
    fillLight.position.set(-6, -4, -4);
    scene.add(fillLight);

    // Internal Glyph Glow Lights
    glyphLight1 = new THREE.PointLight(0xffffff, 3.5, 8);
    glyphLight1.position.set(0, 0, 0.2);
    scene.add(glyphLight1);

    glyphLight2 = new THREE.PointLight(0xd71920, 1.5, 6);
    glyphLight2.position.set(0, 0, -0.6);
    scene.add(glyphLight2);
  }

  function buildHardwareCore() {
    coreRoot = new THREE.Group();
    scene.add(coreRoot);

    // Outer Frosted Glass Chassis
    const chassisGeo = new THREE.BoxGeometry(2.6, 2.6, 0.9, 16, 16, 16);
    const chassisMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.1,
      roughness: 0.18,
      transmission: 0.88,
      transparent: true,
      opacity: 0.92,
      ior: 1.45,
      thickness: 0.6,
      reflectivity: 0.7,
      clearcoat: 0.9,
      clearcoatRoughness: 0.1
    });
    materials.push(chassisMat);
    outerChassis = new THREE.Mesh(chassisGeo, chassisMat);
    coreRoot.add(outerChassis);

    // Inner Matte-Black PCB Board
    const pcbGeo = new THREE.BoxGeometry(2.3, 2.3, 0.08);
    const pcbMat = new THREE.MeshStandardMaterial({
      color: 0x0c0d10,
      roughness: 0.7,
      metalness: 0.4
    });
    materials.push(pcbMat);
    pcbBoard = new THREE.Mesh(pcbGeo, pcbMat);
    coreRoot.add(pcbBoard);

    // Circuit Line Traces (Procedural Geometric Matrix)
    const traceGeo = new THREE.BufferGeometry();
    const tracePoints = [];
    for (let i = 0; i < 40; i++) {
      const x1 = (Math.random() - 0.5) * 2.0;
      const y1 = (Math.random() - 0.5) * 2.0;
      const x2 = x1 + (Math.random() > 0.5 ? 0.3 : -0.3);
      const y2 = y1 + (Math.random() > 0.5 ? 0.3 : -0.3);
      tracePoints.push(x1, y1, 0.06, x2, y1, 0.06);
      tracePoints.push(x2, y1, 0.06, x2, y2, 0.06);
    }
    traceGeo.setAttribute('position', new THREE.Float32BufferAttribute(tracePoints, 3));
    const traceMat = new THREE.LineBasicMaterial({ color: 0xc8c8d0, transparent: true, opacity: 0.6 });
    const traces = new THREE.LineSegments(traceGeo, traceMat);
    coreRoot.add(traces);

    // Central Microcontroller (The "A1E3M // ATMEGA-AI" Chip)
    const chipGeo = new THREE.BoxGeometry(0.8, 0.8, 0.18);
    const chipMat = new THREE.MeshStandardMaterial({
      color: 0x18191f,
      roughness: 0.3,
      metalness: 0.8
    });
    materials.push(chipMat);
    microchip = new THREE.Mesh(chipGeo, chipMat);
    microchip.position.z = 0.12;
    coreRoot.add(microchip);

    // Chip Pins (Gold-plated connectors)
    const pinMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.2 });
    materials.push(pinMat);
    for (let side = 0; side < 4; side++) {
      for (let i = -3; i <= 3; i++) {
        const pinGeo = new THREE.BoxGeometry(0.04, 0.1, 0.04);
        const pin = new THREE.Mesh(pinGeo, pinMat);
        const offset = i * 0.09;
        if (side === 0) pin.position.set(offset, 0.44, 0.1);
        if (side === 1) pin.position.set(offset, -0.44, 0.1);
        if (side === 2) pin.position.set(0.44, offset, 0.1);
        if (side === 3) pin.position.set(-0.44, offset, 0.1);
        coreRoot.add(pin);
        floatingChips.push({ mesh: pin, baseZ: pin.position.z, spreadZ: 0.8, spreadXY: 1.2 });
      }
    }

    // Nothing Signature Glyph LED Ring (Central Circle)
    const glyphRingGeo = new THREE.TorusGeometry(0.65, 0.035, 16, 64);
    const glyphRingMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 2.2,
      roughness: 0.1
    });
    materials.push(glyphRingMat);
    glyphRing = new THREE.Mesh(glyphRingGeo, glyphRingMat);
    glyphRing.position.z = 0.22;
    coreRoot.add(glyphRing);

    // Glyph Peripheral Accent Light Strips (Nothing Phone / Headphone style)
    const stripConfigs = [
      { width: 0.7, height: 0.05, x: 0.75, y: 0.85, z: 0.22, rot: 0 },
      { width: 0.7, height: 0.05, x: -0.75, y: -0.85, z: 0.22, rot: 0 },
      { width: 0.05, height: 0.6, x: -0.95, y: 0.2, z: 0.22, rot: 0.2 },
      { width: 0.05, height: 0.6, x: 0.95, y: -0.2, z: 0.22, rot: -0.2 }
    ];

    stripConfigs.forEach(cfg => {
      const stripGeo = new THREE.BoxGeometry(cfg.width, cfg.height, 0.03);
      const stripMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 2.0,
        roughness: 0.2
      });
      materials.push(stripMat);
      const strip = new THREE.Mesh(stripGeo, stripMat);
      strip.position.set(cfg.x, cfg.y, cfg.z);
      strip.rotation.z = cfg.rot;
      coreRoot.add(strip);
      glyphStrips.push(strip);
      floatingChips.push({ mesh: strip, baseZ: cfg.z, spreadZ: 1.4, spreadXY: 1.1 });
    });

    // Precision Stepper Motor Gears & Optical Lens Rings (ICM Buddy tribute)
    const gearGeo1 = new THREE.TorusGeometry(0.95, 0.05, 12, 48);
    const gearMat1 = new THREE.MeshStandardMaterial({
      color: 0x999da8,
      metalness: 0.85,
      roughness: 0.25
    });
    materials.push(gearMat1);
    gearRing1 = new THREE.Mesh(gearGeo1, gearMat1);
    gearRing1.position.z = 0.32;
    coreRoot.add(gearRing1);

    const gearGeo2 = new THREE.TorusGeometry(1.15, 0.04, 12, 48);
    const gearMat2 = new THREE.MeshStandardMaterial({
      color: 0x5a5c66,
      metalness: 0.9,
      roughness: 0.3
    });
    materials.push(gearMat2);
    gearRing2 = new THREE.Mesh(gearGeo2, gearMat2);
    gearRing2.position.z = -0.28;
    coreRoot.add(gearRing2);

    // Register primary layers for exploded transformation
    floatingChips.push(
      { mesh: outerChassis, baseZ: 0, spreadZ: 2.2, spreadXY: 1.0 },
      { mesh: microchip, baseZ: 0.12, spreadZ: 0.9, spreadXY: 1.0 },
      { mesh: glyphRing, baseZ: 0.22, spreadZ: 1.6, spreadXY: 1.0 },
      { mesh: gearRing1, baseZ: 0.32, spreadZ: 1.9, spreadXY: 1.2 },
      { mesh: gearRing2, baseZ: -0.28, spreadZ: -1.6, spreadXY: 1.1 }
    );
  }

  function setupEventListeners() {
    window.addEventListener('resize', onWindowResize, { passive: true });

    // Cursor Parallax Gyro
    window.addEventListener('mousemove', (e) => {
      state.targetMouseX = (e.clientX / window.innerWidth) * 2 - 1;
      state.targetMouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    }, { passive: true });

    // Scroll Progress Tracker
    window.addEventListener('scroll', updateScrollProgress, { passive: true });

    // Interactive Drag to Rotate Canvas
    window.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.model-controls-pill') || e.target.closest('a') || e.target.closest('button') || e.target.closest('input')) {
        return;
      }
      state.isUserInteracting = true;
      state.lastTouchX = e.clientX;
      state.lastTouchY = e.clientY;
    });

    window.addEventListener('pointermove', (e) => {
      if (!state.isUserInteracting) return;
      const deltaX = e.clientX - state.lastTouchX;
      const deltaY = e.clientY - state.lastTouchY;
      state.manualRotationY += deltaX * 0.006;
      state.manualRotationX += deltaY * 0.006;
      state.lastTouchX = e.clientX;
      state.lastTouchY = e.clientY;
    });

    window.addEventListener('pointerup', () => {
      state.isUserInteracting = false;
    });
    window.addEventListener('pointercancel', () => {
      state.isUserInteracting = false;
    });

    // HUD & Controls Pill Actions
    setupControlButtons();
  }

  function updateScrollProgress() {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    state.scrollProgress = docHeight > 0 ? Math.min(Math.max(window.scrollY / docHeight, 0), 1) : 0;
  }

  function setupControlButtons() {
    // Exploded View Button
    const btnExplode = document.getElementById('btn-explode');
    if (btnExplode) {
      btnExplode.addEventListener('click', () => {
        state.exploded = !state.exploded;
        btnExplode.classList.toggle('active', state.exploded);
        if (window.AudioEngine) window.AudioEngine.playClick();
      });
    }

    // Wireframe Mode Button
    const btnWireframe = document.getElementById('btn-wireframe');
    if (btnWireframe) {
      btnWireframe.addEventListener('click', () => {
        state.wireframe = !state.wireframe;
        btnWireframe.classList.toggle('active', state.wireframe);
        materials.forEach(mat => {
          mat.wireframe = state.wireframe;
        });
        if (window.AudioEngine) window.AudioEngine.playClick();
      });
    }

    // Glyph LED Mode Switcher
    const btnGlyph = document.getElementById('btn-glyph');
    if (btnGlyph) {
      btnGlyph.addEventListener('click', () => {
        cycleGlyphMode();
        if (window.AudioEngine) window.AudioEngine.playGlyph();
      });
    }

    // Reset Camera Button
    const btnReset = document.getElementById('btn-reset');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        state.manualRotationX = 0;
        state.manualRotationY = 0;
        state.exploded = false;
        if (btnExplode) btnExplode.classList.remove('active');
        if (window.AudioEngine) window.AudioEngine.playClick();
      });
    }
  }

  function cycleGlyphMode() {
    const modes = ['white', 'pulse', 'red', 'off'];
    const nextIdx = (modes.indexOf(state.glyphMode) + 1) % modes.length;
    state.glyphMode = modes[nextIdx];

    const btnGlyph = document.getElementById('btn-glyph');
    const ledIndicator = btnGlyph ? btnGlyph.querySelector('.ctrl-led-indicator') : null;

    if (state.glyphMode === 'white') {
      setGlyphIntensity(2.2, 0xffffff);
      if (ledIndicator) ledIndicator.style.backgroundColor = '#ffffff';
    } else if (state.glyphMode === 'pulse') {
      if (ledIndicator) ledIndicator.style.backgroundColor = '#00f0ff';
    } else if (state.glyphMode === 'red') {
      setGlyphIntensity(2.5, 0xd71920);
      if (ledIndicator) ledIndicator.style.backgroundColor = '#d71920';
    } else if (state.glyphMode === 'off') {
      setGlyphIntensity(0.0, 0x111111);
      if (ledIndicator) ledIndicator.style.backgroundColor = '#333333';
    }
  }

  function setGlyphIntensity(intensity, colorHex) {
    if (glyphRing) {
      glyphRing.material.emissive.setHex(colorHex);
      glyphRing.material.emissiveIntensity = intensity;
    }
    glyphStrips.forEach(s => {
      s.material.emissive.setHex(colorHex);
      s.material.emissiveIntensity = intensity;
    });
    if (glyphLight1) {
      glyphLight1.intensity = intensity * 1.5;
      glyphLight1.color.setHex(colorHex);
    }
  }

  function onWindowResize() {
    if (!camera || !renderer) return;
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  // Render Loop with Physics Easing
  let explosionAmount = 0;
  function renderLoop(now) {
    requestAnimationFrame(renderLoop);

    // Track FPS
    state.frameCount++;
    if (now - state.lastFpsUpdate >= 1000) {
      state.fps = Math.round((state.frameCount * 1000) / (now - state.lastFpsUpdate));
      state.frameCount = 0;
      state.lastFpsUpdate = now;
      const fpsDisplay = document.getElementById('telemetry-fps');
      if (fpsDisplay) fpsDisplay.textContent = `${state.fps} FPS`;
    }

    // Smooth Mouse Easing
    state.mouseX += (state.targetMouseX - state.mouseX) * 0.05;
    state.mouseY += (state.targetMouseY - state.mouseY) * 0.05;

    // Scrollytelling Transformations
    const p = state.scrollProgress;
    
    // Core Rotation: Continuous slow spin + scroll progression + manual drag
    const baseSpin = now * 0.0003;
    const scrollSpinY = p * Math.PI * 4;
    const targetRotY = baseSpin + scrollSpinY + state.manualRotationY + state.mouseX * 0.35;
    const targetRotX = state.manualRotationX - state.mouseY * 0.25 + Math.sin(p * Math.PI * 2) * 0.2;

    coreRoot.rotation.y += (targetRotY - coreRoot.rotation.y) * 0.08;
    coreRoot.rotation.x += (targetRotX - coreRoot.rotation.x) * 0.08;

    // Stepper Gears Rotation (Internal mechanics)
    if (gearRing1) gearRing1.rotation.z += 0.015;
    if (gearRing2) gearRing2.rotation.z -= 0.01;

    // Dynamic Camera Pan / Offset
    // At Hero: centered or right-shifted (for desktop text layout)
    // At Stage 01 (Hardware): moves to right (x: 1.8)
    // At Stage 02 (AI): moves to left (x: -1.8)
    // At Stage 03 (Distributed): center-right (x: 1.2)
    // At Project Hub & beyond: docks subtly into background
    const isMobile = window.innerWidth < 992;
    let targetCamX = 0;
    let targetCamY = 0;
    let targetCamZ = 7.5;

    if (!isMobile) {
      if (p < 0.15) {
        targetCamX = 1.6;
        targetCamY = 0.1;
      } else if (p < 0.35) {
        targetCamX = -1.8; // Left side while text is on right
        targetCamY = 0.2;
      } else if (p < 0.55) {
        targetCamX = 1.9;  // Right side while text is on left
        targetCamY = -0.1;
      } else if (p < 0.75) {
        targetCamX = -1.6;
      } else {
        targetCamX = 2.0;
        targetCamZ = 9.0;
      }
    }

    camera.position.x += (targetCamX - camera.position.x) * 0.06;
    camera.position.y += (targetCamY - camera.position.y) * 0.06;
    camera.position.z += (targetCamZ - camera.position.z) * 0.06;

    // Exploded View Interpolation
    // Automated explosion during Hardware stage (p between 0.15 and 0.35) or when button active
    const autoExplode = (p >= 0.14 && p <= 0.38) ? (Math.sin(((p - 0.14) / 0.24) * Math.PI) * 0.9) : 0;
    const targetExplosion = state.exploded ? 1.0 : autoExplode;
    explosionAmount += (targetExplosion - explosionAmount) * 0.06;

    floatingChips.forEach(item => {
      const spread = item.spreadZ || 1.0;
      item.mesh.position.z = item.baseZ + (spread * explosionAmount);
    });

    // Glyph Pulse Mode Animation
    if (state.glyphMode === 'pulse') {
      const pulseIntensity = 1.5 + Math.sin(now * 0.005) * 1.5;
      setGlyphIntensity(pulseIntensity, 0x00f0ff);
    }

    renderer.render(scene, camera);
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

