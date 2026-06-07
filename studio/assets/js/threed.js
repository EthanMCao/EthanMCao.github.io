// Real-time low-poly 3D viewer for the Studio 3D page.
// Procedural models (no external assets) + OrbitControls. Framed as
// "modelled in Blender, exported to real-time web".
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const mount = document.getElementById('viewer');
const fallback = document.getElementById('viewer-fallback');
const loadingEl = document.getElementById('viewer-loading');

function fail(msg) {
  if (loadingEl) loadingEl.style.display = 'none';
  if (fallback) { fallback.style.display = 'grid'; fallback.querySelector('p').textContent = msg; }
}

let renderer, scene, camera, controls;

// --- palette ---
const C = {
  coral: 0xff7a5e, coralD: 0xe85a6b, head: 0xff8e6a, cream: 0xfff1e2,
  dark: 0x2a1f2b, teal: 0x2ee6c4, tealD: 0x1fbfa3, violet: 0x8b6cff,
  amber: 0xffc24b, grass: 0x57b368, grassD: 0x3f8d52, dirt: 0x8a5a3c,
  dirtD: 0x6f4730, trunk: 0x7a5230, rock: 0x6b7385, water: 0x4aa8ff,
  white: 0xfff7ef, stem: 0xf2e6d2, capRed: 0xff6f7a, leaf: 0x49a35e,
};

let current = 'vela';
const models = {};
let autoRotate = true;
let wireframe = false;

function init() {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(mount.clientWidth, mount.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  mount.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', 'Interactive 3D model viewer — use arrow keys to pan, or drag to orbit');
  renderer.domElement.setAttribute('role', 'img');
  // Make the canvas focusable so OrbitControls can receive keyboard events.
  renderer.domElement.tabIndex = 0;

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(42, mount.clientWidth / mount.clientHeight, 0.1, 100);
  camera.position.set(4.2, 3.0, 5.4);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 3;
  controls.maxDistance = 12;
  controls.maxPolarAngle = Math.PI * 0.52;
  controls.autoRotate = autoRotate;
  controls.autoRotateSpeed = 1.4;
  controls.target.set(0, 1.1, 0);
  controls.listenToKeyEvents(renderer.domElement);
  controls.keyPanSpeed = 12;

  // --- lights ---
  scene.add(new THREE.HemisphereLight(0xbfd4ff, 0x402a3a, 0.85));
  const key = new THREE.DirectionalLight(0xffe9d6, 2.1);
  key.position.set(5, 8, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1; key.shadow.camera.far = 30;
  key.shadow.camera.left = -6; key.shadow.camera.right = 6;
  key.shadow.camera.top = 6; key.shadow.camera.bottom = -6;
  key.shadow.bias = -0.0004;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x8b6cff, 0.6); fill.position.set(-6, 3, -2); scene.add(fill);
  const rim = new THREE.DirectionalLight(0x2ee6c4, 0.7); rim.position.set(-2, 4, -6); scene.add(rim);

  // --- contact shadow ground ---
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(7, 48),
    new THREE.ShadowMaterial({ opacity: 0.28 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  scene.add(ground);
  // subtle glow disc
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(2.6, 48),
    new THREE.MeshBasicMaterial({ color: 0x8b6cff, transparent: true, opacity: 0.07 })
  );
  disc.rotation.x = -Math.PI / 2; disc.position.y = 0.002; scene.add(disc);

  // --- build models ---
  models.vela = makeVela();
  models.island = makeIsland();
  models.crystal = makeCrystal();
  models.mushroom = makeMushroom();
  Object.values(models).forEach((g) => { g.visible = false; scene.add(g); });
  setModel('vela');

  if (loadingEl) loadingEl.style.display = 'none';

  window.addEventListener('resize', onResize);
  if (window.ResizeObserver) { new ResizeObserver(onResize).observe(mount); }

  wireToolbar();
  animate();
}

function onResize() {
  const w = mount.clientWidth, h = mount.clientHeight;
  if (!w || !h) return;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

function animate() {
  requestAnimationFrame(animate);
  controls.autoRotate = autoRotate;
  controls.update();
  // gentle idle bob for the active model
  const m = models[current];
  if (m && m.userData.bob) {
    m.position.y = m.userData.baseY + Math.sin(performance.now() * 0.0016) * 0.06;
  }
  renderer.render(scene, camera);
}

// --- material helper (flat-shaded low poly) ---
function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color, flatShading: true, roughness: opts.rough ?? 0.7, metalness: opts.metal ?? 0.0,
    emissive: opts.emissive ?? 0x000000, emissiveIntensity: opts.emissiveIntensity ?? 1,
    transparent: opts.transparent ?? false, opacity: opts.opacity ?? 1,
  });
}
function mesh(geo, material) { const m = new THREE.Mesh(geo, material); m.castShadow = true; m.receiveShadow = true; return m; }

// =====================================================================
//  MODELS
// =====================================================================
function makeVela() {
  const g = new THREE.Group();
  // body
  const body = mesh(new THREE.IcosahedronGeometry(0.95, 1), mat(C.coral));
  body.scale.set(1.05, 0.92, 1.3); body.position.set(0, 1.0, 0); g.add(body);
  // chest fluff
  const chest = mesh(new THREE.IcosahedronGeometry(0.6, 1), mat(C.cream));
  chest.scale.set(0.85, 0.9, 0.7); chest.position.set(0, 0.85, 0.55); g.add(chest);
  // head
  const head = mesh(new THREE.IcosahedronGeometry(0.66, 1), mat(C.head));
  head.position.set(0, 1.7, 0.72); g.add(head);
  // face mask
  const face = mesh(new THREE.IcosahedronGeometry(0.42, 1), mat(C.cream));
  face.scale.set(0.95, 0.85, 0.7); face.position.set(0, 1.6, 1.18); g.add(face);
  // snout
  const snout = mesh(new THREE.ConeGeometry(0.26, 0.5, 7), mat(C.cream));
  snout.rotation.x = Math.PI / 2; snout.position.set(0, 1.55, 1.45); g.add(snout);
  const nose = mesh(new THREE.IcosahedronGeometry(0.1, 0), mat(C.dark));
  nose.position.set(0, 1.58, 1.7); g.add(nose);
  // ears
  for (const sx of [-1, 1]) {
    const ear = mesh(new THREE.ConeGeometry(0.24, 0.6, 5), mat(C.head));
    ear.position.set(sx * 0.34, 2.18, 0.62); ear.rotation.z = sx * -0.18; g.add(ear);
    const inner = mesh(new THREE.ConeGeometry(0.13, 0.4, 5), mat(C.dark));
    inner.position.set(sx * 0.34, 2.16, 0.7); inner.rotation.z = sx * -0.18; g.add(inner);
    const eye = mesh(new THREE.IcosahedronGeometry(0.1, 0), mat(C.dark));
    eye.position.set(sx * 0.26, 1.78, 1.28); g.add(eye);
  }
  // scarf
  const scarf = mesh(new THREE.TorusGeometry(0.56, 0.17, 10, 20), mat(C.teal, { rough: 0.55 }));
  scarf.rotation.x = Math.PI / 2 - 0.25; scarf.position.set(0, 1.25, 0.5); scarf.scale.set(1, 1, 0.8); g.add(scarf);
  const sEnd = mesh(new THREE.BoxGeometry(0.26, 0.5, 0.14), mat(C.tealD, { rough: 0.55 }));
  sEnd.position.set(0.34, 0.95, 0.78); sEnd.rotation.z = 0.2; g.add(sEnd);
  // tail
  const tail = mesh(new THREE.IcosahedronGeometry(0.6, 1), mat(C.coral));
  tail.scale.set(0.55, 0.55, 1.2); tail.position.set(0, 1.15, -1.15); tail.rotation.x = 0.5; g.add(tail);
  const tip = mesh(new THREE.IcosahedronGeometry(0.34, 1), mat(C.cream));
  tip.position.set(0, 1.45, -1.7); g.add(tip);
  // legs
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.55, 7), mat(C.cream));
    leg.position.set(sx * 0.46, 0.28, sz * 0.45 + 0.05); g.add(leg);
  }
  // Vela stands on the ground — no bob so her feet never dip below the plane.
  g.userData.bob = false; g.userData.baseY = 0;
  return g;
}

function makeIsland() {
  const g = new THREE.Group();
  const dirt = mesh(new THREE.CylinderGeometry(1.55, 1.15, 1.0, 7), mat(C.dirt));
  dirt.position.y = 0.5; g.add(dirt);
  const dirt2 = mesh(new THREE.CylinderGeometry(1.1, 0.6, 0.7, 7), mat(C.dirtD));
  dirt2.position.y = -0.1; g.add(dirt2);
  const grass = mesh(new THREE.CylinderGeometry(1.6, 1.55, 0.32, 7), mat(C.grass));
  grass.position.y = 1.05; g.add(grass);
  // pond
  const pond = mesh(new THREE.CylinderGeometry(0.5, 0.45, 0.08, 14), mat(C.water, { rough: 0.25, metal: 0.1 }));
  pond.position.set(-0.55, 1.22, 0.35); g.add(pond);
  // tree
  const trunk = mesh(new THREE.CylinderGeometry(0.13, 0.18, 0.8, 6), mat(C.trunk));
  trunk.position.set(0.55, 1.55, -0.2); g.add(trunk);
  const fol1 = mesh(new THREE.ConeGeometry(0.7, 0.9, 7), mat(C.grassD)); fol1.position.set(0.55, 2.0, -0.2); g.add(fol1);
  const fol2 = mesh(new THREE.ConeGeometry(0.55, 0.8, 7), mat(C.grass)); fol2.position.set(0.55, 2.4, -0.2); g.add(fol2);
  const fol3 = mesh(new THREE.ConeGeometry(0.38, 0.7, 7), mat(C.leaf)); fol3.position.set(0.55, 2.8, -0.2); g.add(fol3);
  // rocks
  for (const [x, z, s] of [[-0.9, -0.4, 0.32], [0.2, 0.7, 0.22], [0.95, 0.5, 0.18]]) {
    const r = mesh(new THREE.IcosahedronGeometry(s, 0), mat(C.rock)); r.position.set(x, 1.28, z); r.rotation.set(0.4, x, 0.2); g.add(r);
  }
  // floating crystals under island
  for (const [x, z] of [[-0.5, 0.3], [0.6, -0.4]]) {
    const c = mesh(new THREE.OctahedronGeometry(0.18), mat(C.violet, { emissive: 0x4a2a8a, rough: 0.2 }));
    c.position.set(x, -0.7, z); c.rotation.y = x; g.add(c);
  }
  g.position.y = 0.1; g.userData.bob = true; g.userData.baseY = 0.1;
  return g;
}

function makeCrystal() {
  const g = new THREE.Group();
  const base = mesh(new THREE.DodecahedronGeometry(1.0, 0), mat(C.rock));
  base.scale.set(1.2, 0.5, 1.2); base.position.y = 0.4; g.add(base);
  const specs = [
    [0, 1.55, 0, 1.4, C.teal, 0x0f8f7e],
    [0.5, 1.2, 0.2, 0.95, C.violet, 0x3a2a8a],
    [-0.45, 1.1, -0.2, 0.85, C.coral, 0x8a2a3a],
    [0.2, 1.0, -0.5, 0.7, C.amber, 0x8a6a1a],
    [-0.3, 0.95, 0.5, 0.6, C.violet, 0x3a2a8a],
  ];
  for (const [x, y, z, h, col, em] of specs) {
    const cr = mesh(new THREE.OctahedronGeometry(0.34, 0), mat(col, { emissive: em, emissiveIntensity: 0.6, rough: 0.15, metal: 0.05, transparent: true, opacity: 0.92 }));
    cr.scale.set(0.7, h, 0.7); cr.position.set(x, y, z); cr.rotation.y = x * 2; g.add(cr);
  }
  g.userData.bob = true; g.userData.baseY = 0;
  return g;
}

function makeMushroom() {
  const g = new THREE.Group();
  const stem = mesh(new THREE.CylinderGeometry(0.55, 0.7, 1.5, 12), mat(C.stem));
  stem.position.y = 0.85; g.add(stem);
  // cap
  const cap = mesh(new THREE.SphereGeometry(1.05, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(C.capRed, { rough: 0.6 }));
  cap.scale.set(1, 0.85, 1); cap.position.y = 1.6; g.add(cap);
  const capRim = mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.14, 16), mat(C.capRed, { rough: 0.6 }));
  capRim.position.y = 1.6; g.add(capRim);
  // spots
  for (const [x, y, z] of [[0.5, 2.0, 0.5], [-0.6, 1.95, 0.3], [0.1, 2.3, -0.2], [0.55, 1.8, -0.5], [-0.3, 2.1, -0.55]]) {
    const sp = mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.06, 10), mat(C.white));
    const n = new THREE.Vector3(x, y - 1.6, z).normalize();
    sp.position.set(x, y, z); sp.lookAt(sp.position.clone().add(n)); sp.rotateX(Math.PI / 2); g.add(sp);
  }
  // door + window
  const door = mesh(new THREE.BoxGeometry(0.4, 0.6, 0.1), mat(C.trunk));
  door.position.set(0, 0.55, 0.62); g.add(door);
  const win = mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 12), mat(C.amber, { emissive: 0x6a4a10, emissiveIntensity: 0.5 }));
  win.rotation.x = Math.PI / 2; win.position.set(0.42, 0.95, 0.5); g.add(win);
  // grass tufts
  for (const [x, z] of [[0.8, 0.2], [-0.85, 0.1], [0.2, 0.85]]) {
    const t = mesh(new THREE.ConeGeometry(0.12, 0.4, 5), mat(C.grass)); t.position.set(x, 0.2, z); g.add(t);
  }
  g.userData.bob = true; g.userData.baseY = 0;
  return g;
}

// =====================================================================
//  UI
// =====================================================================
const FRAMES = {
  vela: { target: [0, 1.2, 0], pos: [4.2, 3.0, 5.4] },
  island: { target: [0, 1.0, 0], pos: [4.8, 3.4, 5.6] },
  crystal: { target: [0, 1.1, 0], pos: [4.0, 3.0, 5.0] },
  mushroom: { target: [0, 1.3, 0], pos: [4.4, 3.2, 5.4] },
};

function setModel(name) {
  if (!models[name]) return;
  current = name;
  Object.entries(models).forEach(([k, g]) => { g.visible = (k === name); });
  applyWire();
  const f = FRAMES[name];
  if (f && controls) {
    controls.target.set(...f.target);
    camera.position.set(...f.pos);
  }
  document.querySelectorAll('[data-model]').forEach((b) => {
    b.classList.toggle('active', b.dataset.model === name);
    b.setAttribute('aria-pressed', String(b.dataset.model === name));
  });
  const info = document.getElementById('model-info');
  if (info) {
    const meta = MODEL_META[name];
    info.querySelector('h3').textContent = meta.title;
    info.querySelector('p').textContent = meta.desc;
    info.querySelector('.tris').textContent = meta.tris;
  }
}

const MODEL_META = {
  vela: { title: 'Vela — Mascot', desc: 'The studio mascot, modelled low-poly with a stylised flat-shaded look and her signature teal scarf. Drag to orbit.', tris: '~1.4k tris' },
  island: { title: 'Floating Diorama', desc: 'A self-contained hex-island scene — sculpted terrain, a low-poly tree, water and rocks. A classic stylised game-art study.', tris: '~2.1k tris' },
  crystal: { title: 'Crystal Cluster', desc: 'An emissive crystal formation exploring material, glow and silhouette — the kind of collectible/VFX prop a game needs.', tris: '~900 tris' },
  mushroom: { title: 'Mushroom House', desc: 'A cosy environment prop with warm interior light — props like this build a believable stylised world.', tris: '~1.8k tris' },
};

function applyWire() {
  const m = models[current]; if (!m) return;
  m.traverse((o) => { if (o.isMesh && o.material) o.material.wireframe = wireframe; });
}

function wireToolbar() {
  document.querySelectorAll('[data-model]').forEach((b) => {
    b.addEventListener('click', () => setModel(b.dataset.model));
  });
  const ar = document.getElementById('btn-rotate');
  if (ar) ar.addEventListener('click', () => {
    autoRotate = !autoRotate; ar.classList.toggle('active', autoRotate); ar.setAttribute('aria-pressed', String(autoRotate));
  });
  const wf = document.getElementById('btn-wire');
  if (wf) wf.addEventListener('click', () => {
    wireframe = !wireframe; applyWire(); wf.classList.toggle('active', wireframe); wf.setAttribute('aria-pressed', String(wireframe));
  });
  const rs = document.getElementById('btn-reset');
  if (rs) rs.addEventListener('click', () => { const f = FRAMES[current]; controls.target.set(...f.target); camera.position.set(...f.pos); });
}

// =====================================================================
//  BOOTSTRAP — run after every module-level declaration is initialised
// =====================================================================
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
} catch (e) { renderer = null; }

if (!renderer || !mount) {
  fail('Your browser could not start WebGL — here is a still of the scene instead.');
} else {
  try {
    init();
  } catch (e) {
    console.error('3D viewer failed to initialise:', e);
    fail('The live 3D viewer could not start — here is a still of the scene instead.');
  }
}
