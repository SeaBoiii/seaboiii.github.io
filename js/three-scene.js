/**
 * NOTHING TECH 3D INTERACTIVE VIEWPORT ENGINE
 * Author: Aleem (A1E3M)
 * Powered by Three.js (WebGL)
 * Features:
 *  - Frosted Glass Refraction & ACES Filmic Tone Mapping
 *  - Dual Colorway Engine (Black Edition & White Edition ?Color=White)
 *  - 3D Projected Screen Callout Annotation Pins
 *  - Exploded Mechanical Disassembly with Physics Easing
 *  - Stage-Synchronized Scrollytelling Choreography
 *  - 400-Node Particle Constellation (Probow 400 CCU Distributed System)
 *  - Interactive Orbit Drag & Glyph LED Modes
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
    theme: 'black', // 'black' or 'white'
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
  let glyphLight1, glyphLight2, ambientLight, keyLight, fillLight;
  let networkParticles, particleGeo, particleMat;

  // Materials Registry for Wireframe/Theme updates
  const materials = [];
  const tempVec = new THREE.Vector3();

  // Callout DOM Elements
  let calloutsContainer, calloutChip, calloutGear, calloutGlyph, calloutChassis;

  function init() {
    canvasContainer = document.getElementById('webgl-canvas-container');
    canvas = document.getElementById('webgl-canvas');
    if (!canvas) return;

    // Cache Callout DOM Elements
    calloutsContainer = document.getElementById('callouts-container');
    calloutChip = document.getElementById('callout-chip');
    calloutGear = document.getElementById('callout-gear');
    calloutGlyph = document.getElementById('callout-glyph');
    calloutChassis = document.getElementById('callout-chassis');

    // 1. Scene Setup
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x070709, 0.045);

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
      renderer.toneMappingExposure = 1.15;
    }

    // 4. Lighting Setup
    setupLighting();

    // 5. Build Transparent Cybernetic Core & Particle Constellation
    buildHardwareCore();
    buildNetworkConstellation();

    // 6. Event Listeners
    setupEventListeners();

    // 7. Initial Layout Sync
    onWindowResize();

    // 8. Sync Initial Theme from Document
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'black';
    setTheme(currentTheme);

    // 9. Start Render Loop
    requestAnimationFrame(renderLoop);
  }

  function setupLighting() {
    ambientLight = new THREE.AmbientLight(0x22242b, 1.2);
    scene.add(ambientLight);

    // Key Specular Rim Light
    keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
    keyLight.position.set(5, 8, 6);
    scene.add(keyLight);

    // Soft Fill Light
    fillLight = new THREE.DirectionalLight(0x8a99ad, 1.2);
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

    // 1. Outer Frosted Glass Chassis (Nothing Signature Transparent Shell)
    const chassisGeo = new THREE.BoxGeometry(2.7, 2.7, 0.92, 16, 16, 16);
    const chassisMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.1,
      roughness: 0.18,
      transmission: 0.88,
      transparent: true,
      opacity: 0.92,
      ior: 1.45,
      thickness: 0.65,
      reflectivity: 0.7,
      clearcoat: 0.95,
      clearcoatRoughness: 0.1
    });
    materials.push(chassisMat);
    outerChassis = new THREE.Mesh(chassisGeo, chassisMat);
    coreRoot.add(outerChassis);

    // 2. Inner Matte-Black PCB Board
    const pcbGeo = new THREE.BoxGeometry(2.35, 2.35, 0.08);
    const pcbMat = new THREE.MeshStandardMaterial({
      color: 0x0c0d10,
      roughness: 0.75,
      metalness: 0.35
    });
    materials.push(pcbMat);
    pcbBoard = new THREE.Mesh(pcbGeo, pcbMat);
    coreRoot.add(pcbBoard);

    // 3. Circuit Line Traces (Procedural Geometric Matrix)
    const traceGeo = new THREE.BufferGeometry();
    const tracePoints = [];
    for (let i = 0; i < 48; i++) {
      const x1 = (Math.random() - 0.5) * 2.1;
      const y1 = (Math.random() - 0.5) * 2.1;
      const x2 = x1 + (Math.random() > 0.5 ? 0.35 : -0.35);
      const y2 = y1 + (Math.random() > 0.5 ? 0.35 : -0.35);
      tracePoints.push(x1, y1, 0.06, x2, y1, 0.06);
      tracePoints.push(x2, y1, 0.06, x2, y2, 0.06);
    }
    traceGeo.setAttribute('position', new THREE.Float32BufferAttribute(tracePoints, 3));
    const traceMat = new THREE.LineBasicMaterial({ color: 0xd8d8e2, transparent: true, opacity: 0.65 });
    const traces = new THREE.LineSegments(traceGeo, traceMat);
    coreRoot.add(traces);

    // 4. Central Microcontroller (The "A1E3M // AMD · ATMEGA · AI" Chip)
    const chipGeo = new THREE.BoxGeometry(0.85, 0.85, 0.2);
    const chipMat = new THREE.MeshStandardMaterial({
      color: 0x181920,
      roughness: 0.25,
      metalness: 0.85
    });
    materials.push(chipMat);
    microchip = new THREE.Mesh(chipGeo, chipMat);
    microchip.position.z = 0.14;
    coreRoot.add(microchip);

    // 5. Chip Pins (Gold-plated connectors)
    const pinMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.2 });
    materials.push(pinMat);
    for (let side = 0; side < 4; side++) {
      for (let i = -3; i <= 3; i++) {
        const pinGeo = new THREE.BoxGeometry(0.04, 0.1, 0.04);
        const pin = new THREE.Mesh(pinGeo, pinMat);
        const offset = i * 0.095;
        if (side === 0) pin.position.set(offset, 0.46, 0.12);
        if (side === 1) pin.position.set(offset, -0.46, 0.12);
        if (side === 2) pin.position.set(0.46, offset, 0.12);
        if (side === 3) pin.position.set(-0.46, offset, 0.12);
        coreRoot.add(pin);
        floatingChips.push({ mesh: pin, baseZ: pin.position.z, spreadZ: 0.85, spreadXY: 1.15 });
      }
    }

    // 6. Nothing Signature Glyph LED Ring (Central Halo)
    const glyphRingGeo = new THREE.TorusGeometry(0.68, 0.038, 16, 64);
    const glyphRingMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 2.2,
      roughness: 0.1
    });
    materials.push(glyphRingMat);
    glyphRing = new THREE.Mesh(glyphRingGeo, glyphRingMat);
    glyphRing.position.z = 0.24;
    coreRoot.add(glyphRing);

    // 7. Glyph Peripheral Accent Light Strips
    const stripConfigs = [
      { width: 0.72, height: 0.05, x: 0.75, y: 0.88, z: 0.24, rot: 0 },
      { width: 0.72, height: 0.05, x: -0.75, y: -0.88, z: 0.24, rot: 0 },
      { width: 0.05, height: 0.65, x: -0.98, y: 0.2, z: 0.24, rot: 0.2 },
      { width: 0.05, height: 0.65, x: 0.98, y: -0.2, z: 0.24, rot: -0.2 }
    ];

    stripConfigs.forEach(cfg => {
      const stripGeo = new THREE.BoxGeometry(cfg.width, cfg.height, 0.032);
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
      floatingChips.push({ mesh: strip, baseZ: cfg.z, spreadZ: 1.45, spreadXY: 1.1 });
    });

    // 8. Stepper Motor Gears & Optical Lens Rings (ICM Buddy Hardware)
    const gearGeo1 = new THREE.TorusGeometry(1.0, 0.055, 12, 48);
    const gearMat1 = new THREE.MeshStandardMaterial({
      color: 0x9ca0ab,
      metalness: 0.85,
      roughness: 0.25
    });
    materials.push(gearMat1);
    gearRing1 = new THREE.Mesh(gearGeo1, gearMat1);
    gearRing1.position.z = 0.34;
    coreRoot.add(gearRing1);

    const gearGeo2 = new THREE.TorusGeometry(1.2, 0.045, 12, 48);
    const gearMat2 = new THREE.MeshStandardMaterial({
      color: 0x5a5c66,
      metalness: 0.9,
      roughness: 0.3
    });
    materials.push(gearMat2);
    gearRing2 = new THREE.Mesh(gearGeo2, gearMat2);
    gearRing2.position.z = -0.32;
    coreRoot.add(gearRing2);

    // Register primary layers for exploded transformation
    floatingChips.push(
      { mesh: outerChassis, baseZ: 0, spreadZ: 2.4, spreadXY: 1.0 },
      { mesh: microchip, baseZ: 0.14, spreadZ: 0.95, spreadXY: 1.0 },
      { mesh: glyphRing, baseZ: 0.24, spreadZ: 1.65, spreadXY: 1.0 },
      { mesh: gearRing1, baseZ: 0.34, spreadZ: 2.0, spreadXY: 1.2 },
      { mesh: gearRing2, baseZ: -0.32, spreadZ: -1.8, spreadXY: 1.1 }
    );
  }

  // Build 400-node particle constellation representing the 400 CCU Probow Network
  function buildNetworkConstellation() {
    const particleCount = 400;
    const positions = new Float32Array(particleCount * 3);
    const radius = 3.6;

    for (let i = 0; i < particleCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = radius * (0.75 + Math.random() * 0.5);

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }

    particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    particleMat = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 0.08,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending
    });

    networkParticles = new THREE.Points(particleGeo, particleMat);
    scene.add(networkParticles);
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
      if (e.target.closest('.model-controls-pill') || 
          e.target.closest('.hud-header') || 
          e.target.closest('a') || 
          e.target.closest('button') || 
          e.target.closest('input')) {
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

    // Control Buttons
    setupControlButtons();
  }

  function updateScrollProgress() {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    state.scrollProgress = docHeight > 0 ? Math.min(Math.max(window.scrollY / docHeight, 0), 1) : 0;
  }

  function setupControlButtons() {
    const btnExplode = document.getElementById('btn-explode');
    if (btnExplode) {
      btnExplode.addEventListener('click', () => {
        state.exploded = !state.exploded;
        btnExplode.classList.toggle('active', state.exploded);
        if (window.AudioEngine) window.AudioEngine.playClick();
      });
    }

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

    const btnGlyph = document.getElementById('btn-glyph');
    if (btnGlyph) {
      btnGlyph.addEventListener('click', () => {
        cycleGlyphMode();
        if (window.AudioEngine) window.AudioEngine.playGlyph();
      });
    }

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

  // =========================================================================
  // DUAL COLORWAY THEME SWITCHER (BLACK VS WHITE EDITION)
  // =========================================================================
  function setTheme(theme) {
    state.theme = theme;
    if (!scene) return;

    if (theme === 'white') {
      scene.fog.color.setHex(0xf6f7f9);
      if (ambientLight) {
        ambientLight.color.setHex(0xe8ebf0);
        ambientLight.intensity = 1.6;
      }
      if (keyLight) {
        keyLight.color.setHex(0xffffff);
        keyLight.intensity = 2.8;
      }
      if (fillLight) {
        fillLight.color.setHex(0xbcc4d4);
        fillLight.intensity = 1.4;
      }
      if (outerChassis) {
        outerChassis.material.color.setHex(0xffffff);
        outerChassis.material.roughness = 0.12;
      }
      if (pcbBoard) {
        pcbBoard.material.color.setHex(0x1a1c24);
      }
      if (particleMat) {
        particleMat.color.setHex(0x0077b6);
      }
    } else {
      scene.fog.color.setHex(0x070709);
      if (ambientLight) {
        ambientLight.color.setHex(0x22242b);
        ambientLight.intensity = 1.2;
      }
      if (keyLight) {
        keyLight.color.setHex(0xffffff);
        keyLight.intensity = 2.5;
      }
      if (fillLight) {
        fillLight.color.setHex(0x8a99ad);
        fillLight.intensity = 1.2;
      }
      if (outerChassis) {
        outerChassis.material.color.setHex(0xffffff);
        outerChassis.material.roughness = 0.18;
      }
      if (pcbBoard) {
        pcbBoard.material.color.setHex(0x0c0d10);
      }
      if (particleMat) {
        particleMat.color.setHex(0x00f0ff);
      }
    }
  }

  // =========================================================================
  // 3D PROJECTED SCREEN CALLOUT ANNOTATION PINS
  // =========================================================================
  function updateCallouts(currentExplosion) {
    if (!calloutsContainer || !camera) return;

    // Show callouts only when explosion is visible
    const isVisible = currentExplosion > 0.18;
    const opacity = isVisible ? Math.min((currentExplosion - 0.18) / 0.35, 1) : 0;

    const targets = [
      { el: calloutChip, mesh: microchip },
      { el: calloutGear, mesh: gearRing1 },
      { el: calloutGlyph, mesh: glyphRing },
      { el: calloutChassis, mesh: outerChassis }
    ];

    targets.forEach(({ el, mesh }) => {
      if (!el || !mesh) return;

      if (!isVisible) {
        el.style.opacity = '0';
        return;
      }

      tempVec.setFromMatrixPosition(mesh.matrixWorld);
      tempVec.project(camera);

      // Check if within view frustum
      if (tempVec.z > 1.0) {
        el.style.opacity = '0';
        return;
      }

      const x = (tempVec.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-(tempVec.y * 0.5) + 0.5) * window.innerHeight;

      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      el.style.opacity = String(opacity);
    });
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

  // =========================================================================
  // RENDER LOOP & SCROLLYTELLING EASING
  // =========================================================================
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

    // Smooth Mouse Gyro Easing
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

    // Stepper Gears Rotation (Internal hardware mechanics)
    if (gearRing1) gearRing1.rotation.z += 0.015;
    if (gearRing2) gearRing2.rotation.z -= 0.01;

    // Network Particle Rotation
    if (networkParticles) {
      networkParticles.rotation.y = now * 0.0002;
      networkParticles.rotation.x = Math.sin(now * 0.00015) * 0.2;

      // Particle intensity increases during Stage 04 (Probow 400 CCU)
      const isNetworkStage = p >= 0.58 && p <= 0.76;
      const targetParticleAlpha = isNetworkStage ? 0.85 : 0.2;
      particleMat.opacity += (targetParticleAlpha - particleMat.opacity) * 0.05;
    }

    // Dynamic Camera Pan / Offset Choreography across All Stages
    const isMobile = window.innerWidth < 992;
    let targetCamX = 0;
    let targetCamY = 0;
    let targetCamZ = 7.5;

    if (!isMobile) {
      if (p < 0.12) {
        // Hero: Centered-Right resting angle
        targetCamX = 1.6;
        targetCamY = 0.1;
        targetCamZ = 7.5;
      } else if (p < 0.26) {
        // Stage 01 (AMD Silicon): Camera zooms tight into Central Microchip
        targetCamX = -1.4;
        targetCamY = 0.15;
        targetCamZ = 5.6;
      } else if (p < 0.44) {
        // Stage 02 (ICM Buddy Hardware): Exploded Disassembly, wider view
        targetCamX = 1.9;
        targetCamY = 0.2;
        targetCamZ = 8.2;
      } else if (p < 0.60) {
        // Stage 03 (Project LYON 2.0 AI): Camera shifts left, neural pulse
        targetCamX = -1.8;
        targetCamY = -0.1;
        targetCamZ = 7.2;
      } else if (p < 0.76) {
        // Stage 04 (Probow 400 CCU): Constellation network focus
        targetCamX = 1.8;
        targetCamY = 0.1;
        targetCamZ = 7.8;
      } else if (p < 0.88) {
        // Stage 05 (Novel Platform): Settled right quadrant
        targetCamX = -1.6;
        targetCamY = 0.0;
        targetCamZ = 8.0;
      } else {
        // Web Hub & Datasheet: Ambient background docking
        targetCamX = 2.0;
        targetCamZ = 9.2;
      }
    }

    camera.position.x += (targetCamX - camera.position.x) * 0.06;
    camera.position.y += (targetCamY - camera.position.y) * 0.06;
    camera.position.z += (targetCamZ - camera.position.z) * 0.06;

    // Exploded View Interpolation
    // Automated explosion during Hardware stage (p between 0.26 and 0.44) or when button active
    const autoExplode = (p >= 0.26 && p <= 0.44) ? (Math.sin(((p - 0.26) / 0.18) * Math.PI) * 0.95) : 0;
    const targetExplosion = state.exploded ? 1.0 : autoExplode;
    explosionAmount += (targetExplosion - explosionAmount) * 0.06;

    floatingChips.forEach(item => {
      const spread = item.spreadZ || 1.0;
      item.mesh.position.z = item.baseZ + (spread * explosionAmount);
    });

    // Update 3D projected screen callout pins
    updateCallouts(explosionAmount);

    // Glyph Pulse Mode Animation
    if (state.glyphMode === 'pulse') {
      const pulseIntensity = 1.5 + Math.sin(now * 0.005) * 1.5;
      setGlyphIntensity(pulseIntensity, state.theme === 'white' ? 0x0077b6 : 0x00f0ff);
    }

    renderer.render(scene, camera);
  }

  // Expose Public Engine Interface for UI Integration
  window.ThreeEngine = {
    setTheme,
    cycleGlyphMode,
    toggleExplode: () => {
      state.exploded = !state.exploded;
      const btn = document.getElementById('btn-explode');
      if (btn) btn.classList.toggle('active', state.exploded);
    },
    toggleWireframe: () => {
      state.wireframe = !state.wireframe;
      materials.forEach(m => m.wireframe = state.wireframe);
      const btn = document.getElementById('btn-wireframe');
      if (btn) btn.classList.toggle('active', state.wireframe);
    },
    resetCamera: () => {
      state.manualRotationX = 0;
      state.manualRotationY = 0;
      state.exploded = false;
      const btn = document.getElementById('btn-explode');
      if (btn) btn.classList.remove('active');
    },
    getState: () => state
  };

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
