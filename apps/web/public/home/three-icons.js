/* Real-time Three.js versions of the "Pourquoi" step icons.
   Icon 1 — glossy blue chat bubble + user badge.
   Icon 2 — four-pointed sparkle with a luminous core (radial vertex-colour gradient).
   Both faithful to the reference renders. */

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

/* ── shared stage: renderer, env, lights, sizing, paused-offscreen loop ── */
function createStage(container, camZ, lookY) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
  camera.position.set(0, 0.1, camZ);
  camera.lookAt(0, lookY, 0);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const key = new THREE.DirectionalLight(0xffffff, 1.45);
  key.position.set(-2.4, 4.2, 5.2);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xcfe2ff, 0.4);
  fill.position.set(3.4, -1.6, 4.0);
  scene.add(fill);
  scene.add(new THREE.AmbientLight(0xffffff, 0.26));

  function resize() {
    const w = container.clientWidth || 300;
    const h = container.clientHeight || w;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  }
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(resize).observe(container);
  resize();

  let visible = true;
  if (typeof IntersectionObserver !== "undefined") {
    new IntersectionObserver(
      function (entries) {
        visible = entries[0].isIntersecting;
      },
      { rootMargin: "120px" }
    ).observe(container);
  }
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function runLoop(animate) {
    const t0 = performance.now();
    function tick(now) {
      requestAnimationFrame(tick);
      if (!visible) return;
      if (!reduce) animate((now - t0) / 1000);
      renderer.render(scene, camera);
    }
    requestAnimationFrame(tick);
    renderer.render(scene, camera); // immediate first frame (rAF can be frozen in previews)
  }

  return { renderer, scene, camera, runLoop };
}

/* ════════════════ ICON 1 — chat bubble + user badge ════════════════ */
const bubbleMount = document.querySelector('.w3d[data-icon="bubble"]');
if (bubbleMount) initBubble(bubbleMount);

function initBubble(container) {
  const { scene, runLoop } = createStage(container, 11.4, -0.32);

  const blueGlass = new THREE.MeshPhysicalMaterial({
    color: 0x3c89f3, // saturated azure, opaque (transmission washed it out)
    roughness: 0.24,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.14,
    envMapIntensity: 0.5,
  });
  const blueSolid = new THREE.MeshPhysicalMaterial({
    color: 0x3886f2,
    roughness: 0.24,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.16,
    envMapIntensity: 0.55,
  });
  const blueRim = new THREE.MeshPhysicalMaterial({
    color: 0x8fc0fa,
    roughness: 0.3,
    metalness: 0,
    clearcoat: 0.8,
    clearcoatRoughness: 0.25,
    envMapIntensity: 0.5,
  });
  const whitePanel = new THREE.MeshPhysicalMaterial({
    color: 0xfdfeff,
    roughness: 0.32,
    metalness: 0,
    clearcoat: 0.35,
    clearcoatRoughness: 0.4,
    envMapIntensity: 0.55,
  });
  const pillMat = new THREE.MeshStandardMaterial({
    color: 0xaec3e8,
    roughness: 0.55,
    metalness: 0,
    envMapIntensity: 0.4,
  });
  const whiteMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.38,
    metalness: 0,
    envMapIntensity: 0.6,
  });

  const g = new THREE.Group();
  scene.add(g);

  const body = new THREE.Mesh(new RoundedBoxGeometry(3.45, 2.75, 0.6, 6, 0.56), blueGlass);
  g.add(body);

  const panel = new THREE.Mesh(new RoundedBoxGeometry(2.8, 2.12, 0.22, 5, 0.3), whitePanel);
  panel.position.set(0, 0.02, 0.26);
  g.add(panel);

  const pill1 = new THREE.Mesh(new RoundedBoxGeometry(1.34, 0.2, 0.08, 3, 0.1), pillMat);
  pill1.position.set(-0.38, 0.42, 0.42);
  g.add(pill1);
  const pill2 = new THREE.Mesh(new RoundedBoxGeometry(0.92, 0.2, 0.08, 3, 0.1), pillMat);
  pill2.position.set(-0.59, 0.05, 0.42);
  g.add(pill2);

  const tailShape = new THREE.Shape();
  tailShape.moveTo(-0.3, 0.5);
  tailShape.lineTo(0.34, 0.5);
  tailShape.quadraticCurveTo(0.18, -0.16, 0.04, -0.6);
  tailShape.quadraticCurveTo(-0.01, -0.74, -0.12, -0.62);
  tailShape.quadraticCurveTo(-0.28, -0.2, -0.3, 0.5);
  const tail = new THREE.Mesh(
    new THREE.ExtrudeGeometry(tailShape, {
      depth: 0.38,
      bevelEnabled: true,
      bevelSize: 0.06,
      bevelThickness: 0.06,
      bevelSegments: 5,
      curveSegments: 28,
    }),
    blueGlass
  );
  tail.position.set(-1.18, -1.52, -0.26);
  g.add(tail);

  const badge = new THREE.Group();
  badge.position.set(1.38, -1.08, 0.46);
  g.add(badge);

  const lens = new THREE.Mesh(new THREE.SphereGeometry(0.8, 48, 32), blueSolid);
  lens.scale.set(1, 1, 0.5);
  badge.add(lens);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.05, 16, 64), blueRim);
  ring.position.z = 0.18;
  badge.add(ring);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 32, 24), whiteMat);
  head.position.set(0, 0.2, 0.34);
  badge.add(head);

  const bust = new THREE.Mesh(new THREE.SphereGeometry(0.34, 32, 24), whiteMat);
  bust.scale.set(1.12, 0.78, 0.6);
  bust.position.set(0, -0.24, 0.3);
  badge.add(bust);

  runLoop(function (t) {
    g.rotation.y = Math.sin(t * 0.55) * 0.16;
    g.rotation.x = Math.sin(t * 0.4) * 0.045;
    g.position.y = Math.sin(t * 0.85) * 0.07;
  });
}

/* ════════════════ ICON 2 — four-pointed sparkle ════════════════ */
const sparkleMount = document.querySelector('.w3d[data-icon="sparkle"]');
if (sparkleMount) initSparkle(sparkleMount);

function initSparkle(container) {
  const { scene, runLoop } = createStage(container, 11.0, 0);

  // 4-point sparkle outline — vertical points longer, concave sides
  const TIP_Y = 2.05,
    TIP_X = 1.5,
    PULL = 0.21;
  const s = new THREE.Shape();
  s.moveTo(0, TIP_Y);
  s.quadraticCurveTo(PULL, PULL, TIP_X, 0);
  s.quadraticCurveTo(PULL, -PULL, 0, -TIP_Y);
  s.quadraticCurveTo(-PULL, -PULL, -TIP_X, 0);
  s.quadraticCurveTo(-PULL, PULL, 0, TIP_Y);

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.16,
    bevelEnabled: true,
    bevelThickness: 0.3,
    bevelSize: 0.16,
    bevelSegments: 10,
    curveSegments: 48,
  });
  geo.center();

  // radial vertex-colour gradient: bright WHITE luminous core → ice → azure → deep blue tips
  const cCore = new THREE.Color(0xffffff);
  const cIce = new THREE.Color(0xdcefff);
  const cAzure = new THREE.Color(0x6cadf9);
  const cDeep = new THREE.Color(0x1f63dd);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const tmp = new THREE.Color();
  const RX = TIP_X + 0.18,
    RY = TIP_Y + 0.18; // elliptic normalisation → all tips reach deep blue
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      y = pos.getY(i);
    const r = Math.min(1, Math.hypot(x / RX, y / RY) * 1.18);
    if (r < 0.34)
      tmp.lerpColors(cCore, cIce, Math.pow(r / 0.34, 0.8)); // wider, whiter core
    else if (r < 0.62) tmp.lerpColors(cIce, cAzure, (r - 0.34) / 0.28);
    else tmp.lerpColors(cAzure, cDeep, (r - 0.62) / 0.38);
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    roughness: 0.16,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
    envMapIntensity: 0.38, // let the vivid vertex colours read through (less wash-out)
  });

  const sparkle = new THREE.Mesh(geo, mat);
  const g = new THREE.Group();
  g.add(sparkle);
  scene.add(g);

  runLoop(function (t) {
    g.rotation.y = Math.sin(t * 0.5) * 0.38; // slow swivel shows the bevel depth
    g.rotation.z = Math.sin(t * 0.35) * 0.05;
    g.position.y = Math.sin(t * 0.85) * 0.08;
  });
}
