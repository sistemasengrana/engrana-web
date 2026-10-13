/* Engrana · taller en 3D
   Carro y moto hechos con piezas de Three.js (sin modelos descargados).
   Arrastrar = girar. Tocar = marcar un golpe, como en la recepción del sistema. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const cssVar = (n, fb) => (getComputedStyle(document.documentElement).getPropertyValue(n) || '').trim() || fb;
const easeOut = (k) => 1 - Math.pow(1 - k, 3);
const easeOutExpo = (k) => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k));
const easeOutBack = (k) => { const c = 1.6; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };

export function createGarage(container, { initial = 'carro', onMark = () => {}, onReady = () => {} } = {}) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;

  /* ---------- Render ---------- */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.75 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.className = 'garage__gl';
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const target = new THREE.Vector3(0, 0.6, 0);
  const homeDir = new THREE.Vector3(1, 0.42, 1.18).normalize();
  let dist = 10;

  const hemi = new THREE.HemisphereLight(0xdbe6ff, 0x0b1220, 0.4);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(3.5, 7.5, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(coarse ? 1024 : 2048, coarse ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 20 });
  key.shadow.bias = -0.0004;
  key.shadow.radius = 5;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x6b95ff, 2.4);
  rim.position.set(-5, 3, -4);
  scene.add(rim);

  /* ---------- Materiales ---------- */
  const M = {
    paint: new THREE.MeshPhysicalMaterial({ metalness: 0.45, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.06 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x0c1322, metalness: 0.25, roughness: 0.05, clearcoat: 1 }),
    tire: new THREE.MeshStandardMaterial({ color: 0x15181d, roughness: 0.92 }),
    rim: new THREE.MeshStandardMaterial({ color: 0xc8d0db, metalness: 1, roughness: 0.22 }),
    trim: new THREE.MeshStandardMaterial({ color: 0x14171c, roughness: 0.55, metalness: 0.2 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xe5e9ef, metalness: 1, roughness: 0.12 }),
    head: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xeaf2ff, emissiveIntensity: 1.5 }),
    tail: new THREE.MeshStandardMaterial({ color: 0x7f1d1d, emissive: 0xdc2626, emissiveIntensity: 1.1 }),
    brand: new THREE.MeshStandardMaterial({ color: 0x2563eb, metalness: 0.45, roughness: 0.32 }),
    engine: new THREE.MeshStandardMaterial({ color: 0x3b4250, metalness: 0.75, roughness: 0.38 }),
    seat: new THREE.MeshStandardMaterial({ color: 0x111317, roughness: 0.82 }),
    plate: new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.5 }),
    mark: new THREE.MeshBasicMaterial({ color: 0xdc2626 }),
    halo: new THREE.MeshBasicMaterial({ color: 0xdc2626, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false })
  };

  /* ---------- Plataforma ---------- */
  const discMat = new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.12 });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.3, 0.1, 96), discMat);
  disc.position.y = -0.05;
  disc.receiveShadow = true;
  scene.add(disc);
  const ringMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.6 });
  const ring = new THREE.Mesh(new THREE.RingGeometry(3.08, 3.12, 160), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.002;
  scene.add(ring);

  function applyTheme() {
    M.paint.color.set(cssVar('--g-paint', '#e9edf3'));
    discMat.color.set(cssVar('--g-disc', '#121b2f'));
    ringMat.color.set(cssVar('--g-ring', '#2563eb'));
    hemi.groundColor.set(cssVar('--g-disc', '#121b2f'));
  }
  applyTheme();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

  /* ---------- Piezas ---------- */
  const part = (mesh, name) => { mesh.userData.part = name; mesh.castShadow = true; mesh.receiveShadow = true; return mesh; };
  const rbox = (w, h, d, r, mat, name) => part(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat), name);
  function rod(a, b, r, mat, name) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const m = part(new THREE.Mesh(new THREE.CylinderGeometry(r, r, A.distanceTo(B), 16), mat), name);
    m.position.copy(A).add(B).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
    return m;
  }
  function tube(points, r, mat, name) {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    return part(new THREE.Mesh(new THREE.TubeGeometry(curve, 48, r, 12, false), mat), name);
  }

  /* ---------- Carro (sedán, como el Nissan Sentra del video) ---------- */
  function carWheel(name) {
    const g = new THREE.Group();
    const r = 0.36, w = 0.26;
    const tire = part(new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 48), M.tire), name);
    const rimM = part(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.64, r * 0.64, w + 0.012, 40), M.rim), name);
    const cap = part(new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, w + 0.024, 20), M.brand), name);
    [tire, rimM, cap].forEach((m) => { m.rotation.x = Math.PI / 2; g.add(m); });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const hole = part(new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, w + 0.016, 16), M.trim), name);
      hole.rotation.x = Math.PI / 2;
      hole.position.set(Math.cos(a) * 0.14, Math.sin(a) * 0.14, 0);
      g.add(hole);
    }
    return g;
  }

  function buildCar() {
    const g = new THREE.Group();
    g.name = 'carro';
    const W = 1.62;
    const s = new THREE.Shape();
    s.moveTo(-2.12, 0.34);
    s.lineTo(-1.81, 0.34);
    s.absarc(-1.35, 0.36, 0.46, Math.PI, 0, true);
    s.lineTo(0.89, 0.34);
    s.absarc(1.35, 0.36, 0.46, Math.PI, 0, true);
    s.lineTo(2.1, 0.34);
    s.quadraticCurveTo(2.2, 0.36, 2.2, 0.55);
    s.lineTo(2.16, 0.74);
    s.quadraticCurveTo(2.1, 0.85, 1.9, 0.87);
    s.lineTo(0.9, 0.97);
    s.lineTo(-1.55, 1.0);
    s.quadraticCurveTo(-2.05, 1.0, -2.12, 0.9);
    s.lineTo(-2.18, 0.6);
    s.quadraticCurveTo(-2.2, 0.36, -2.12, 0.34);
    const bodyGeo = new THREE.ExtrudeGeometry(s, { depth: W, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 5, curveSegments: 28 });
    bodyGeo.translate(0, 0, -W / 2);
    g.add(part(new THREE.Mesh(bodyGeo, M.paint), 'body'));

    const c = new THREE.Shape();
    c.moveTo(0.95, 0.96);
    c.quadraticCurveTo(0.45, 1.25, 0.12, 1.42);
    c.lineTo(-0.95, 1.45);
    c.quadraticCurveTo(-1.35, 1.38, -1.7, 1.0);
    c.lineTo(0.95, 0.96);
    const cabGeo = new THREE.ExtrudeGeometry(c, { depth: 1.36, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.05, bevelSegments: 4, curveSegments: 20 });
    cabGeo.translate(0, 0, -0.68);
    g.add(part(new THREE.Mesh(cabGeo, M.glass), 'glass'));

    const roof = rbox(1.12, 0.07, 1.46, 0.03, M.paint, 'roof');
    roof.position.set(-0.42, 1.47, 0);
    g.add(roof);
    [0.735, -0.735].forEach((z) => {
      const pillar = rbox(0.09, 0.46, 0.04, 0.015, M.paint, 'body');
      pillar.position.set(-0.36, 1.2, z);
      pillar.rotation.z = 0.05;
      g.add(pillar);
    });

    [[1.35, 0.76, 'Llanta delantera derecha'], [1.35, -0.76, 'Llanta delantera izquierda'], [-1.35, 0.76, 'Llanta trasera derecha'], [-1.35, -0.76, 'Llanta trasera izquierda']]
      .forEach(([x, z, n]) => { const w = carWheel(n); w.position.set(x, 0.36, z); g.add(w); });

    [0.52, -0.52].forEach((z) => {
      const hl = rbox(0.08, 0.1, 0.42, 0.03, M.head, 'Faro delantero');
      hl.position.set(2.14, 0.77, z);
      hl.rotation.z = -0.35;
      g.add(hl);
      const tl = rbox(0.06, 0.1, 0.4, 0.03, M.tail, 'Stop trasero');
      tl.position.set(-2.17, 0.84, z * 1.05);
      g.add(tl);
    });
    const grille = rbox(0.06, 0.15, 0.86, 0.03, M.trim, 'Bumper delantero');
    grille.position.set(2.2, 0.55, 0);
    g.add(grille);
    const lip = rbox(0.12, 0.08, 1.62, 0.03, M.trim, 'Bumper delantero');
    lip.position.set(2.16, 0.37, 0);
    g.add(lip);
    const rearLip = rbox(0.12, 0.08, 1.62, 0.03, M.trim, 'Bumper trasero');
    rearLip.position.set(-2.17, 0.38, 0);
    g.add(rearLip);
    const plate = rbox(0.02, 0.12, 0.38, 0.01, M.plate, 'Bumper trasero');
    plate.position.set(-2.24, 0.62, 0);
    g.add(plate);
    [0.89, -0.89].forEach((z) => {
      const skirt = rbox(1.82, 0.07, 0.05, 0.02, M.trim, z > 0 ? 'Estribo derecho' : 'Estribo izquierdo');
      skirt.position.set(-0.02, 0.39, z);
      g.add(skirt);
      const mirror = rbox(0.16, 0.1, 0.14, 0.04, M.paint, z > 0 ? 'Retrovisor derecho' : 'Retrovisor izquierdo');
      mirror.position.set(0.74, 1.06, z * 1.03);
      g.add(mirror);
      [0.2, -0.86].forEach((x) => {
        const h = rbox(0.16, 0.03, 0.02, 0.008, M.chrome, 'body');
        h.position.set(x, 0.88, z * 0.997);
        g.add(h);
      });
    });
    return g;
  }

  /* ---------- Moto (naked, como la Yamaha FZ 150 del video) ---------- */
  function motoWheel(name) {
    const g = new THREE.Group();
    g.add(part(new THREE.Mesh(new THREE.TorusGeometry(0.262, 0.058, 18, 60), M.tire), name));
    g.add(part(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.016, 10, 48), M.brand), name));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const sp = part(new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.02, 0.014), M.brand), name);
      sp.position.set(Math.cos(a) * 0.11, Math.sin(a) * 0.11, 0);
      sp.rotation.z = a;
      g.add(sp);
    }
    const hub = part(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.11, 16), M.chrome), name);
    hub.rotation.x = Math.PI / 2;
    g.add(hub);
    const brake = part(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.008, 32), M.chrome), name);
    brake.rotation.x = Math.PI / 2;
    brake.position.z = 0.05;
    g.add(brake);
    return g;
  }

  function buildMoto() {
    const g = new THREE.Group();
    g.name = 'moto';
    const m = new THREE.Group();
    m.scale.setScalar(1.8);
    m.position.x = -0.12;
    g.add(m);

    const fw = motoWheel('Llanta delantera'); fw.position.set(0.7, 0.32, 0); m.add(fw);
    const rw = motoWheel('Llanta trasera'); rw.position.set(-0.7, 0.32, 0); m.add(rw);

    [0.075, -0.075].forEach((z) => {
      m.add(rod([0.7, 0.32, z], [0.5, 0.93, z], 0.021, M.chrome, 'Horquilla'));
      m.add(rod([0.7, 0.32, z], [0.645, 0.52, z], 0.032, M.trim, 'Horquilla'));
      m.add(rod([-0.12, 0.43, z * 1.1], [-0.7, 0.32, z * 1.1], 0.022, M.trim, 'Basculante'));
    });
    const clamp = rbox(0.08, 0.045, 0.22, 0.015, M.trim, 'Manubrio'); clamp.position.set(0.5, 0.95, 0); m.add(clamp);
    m.add(tube([[0.44, 1.0, -0.34], [0.49, 1.035, -0.16], [0.49, 1.035, 0.16], [0.44, 1.0, 0.34]], 0.015, M.trim, 'Manubrio'));
    [1, -1].forEach((s) => {
      m.add(rod([0.44, 1.0, 0.27 * s], [0.42, 0.995, 0.37 * s], 0.022, M.seat, 'Manubrio'));
      m.add(rod([0.47, 1.02, 0.22 * s], [0.45, 1.17, 0.27 * s], 0.008, M.trim, s > 0 ? 'Espejo derecho' : 'Espejo izquierdo'));
      const mirror = part(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.016, 24), M.trim), s > 0 ? 'Espejo derecho' : 'Espejo izquierdo');
      mirror.rotation.z = Math.PI / 2;
      mirror.position.set(0.45, 1.185, 0.28 * s);
      m.add(mirror);
      const shroud = rbox(0.3, 0.17, 0.04, 0.02, M.paint, 'Tanque');
      shroud.position.set(0.3, 0.78, 0.16 * s);
      shroud.rotation.z = -0.42;
      m.add(shroud);
      m.add(rod([-0.06, 0.38, 0.1 * s], [-0.06, 0.38, 0.19 * s], 0.014, M.trim, 'Pedal'));
    });

    const cowl = rbox(0.14, 0.15, 0.18, 0.05, M.paint, 'Faro'); cowl.position.set(0.58, 0.87, 0); m.add(cowl);
    const lens = rbox(0.02, 0.08, 0.11, 0.01, M.head, 'Faro'); lens.position.set(0.655, 0.86, 0); m.add(lens);
    const dash = rbox(0.06, 0.05, 0.09, 0.015, M.trim, 'Manubrio'); dash.position.set(0.48, 1.04, 0); m.add(dash);

    m.add(tube([[0.5, 0.92, 0], [0.25, 0.72, 0], [0.05, 0.5, 0], [-0.15, 0.42, 0]], 0.03, M.brand, 'Chasis'));
    m.add(tube([[0.48, 0.9, 0], [0.1, 0.8, 0], [-0.3, 0.78, 0], [-0.66, 0.83, 0]], 0.022, M.brand, 'Chasis'));

    const tank = part(new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), M.paint), 'Tanque');
    tank.scale.set(0.3, 0.15, 0.17); tank.position.set(0.2, 0.89, 0); tank.rotation.z = -0.15; m.add(tank);
    const seat = rbox(0.58, 0.07, 0.22, 0.035, M.seat, 'Asiento'); seat.position.set(-0.3, 0.87, 0); seat.rotation.z = 0.06; m.add(seat);
    const tail = rbox(0.36, 0.1, 0.16, 0.04, M.paint, 'Colín'); tail.position.set(-0.62, 0.87, 0); tail.rotation.z = 0.22; m.add(tail);
    const stop = rbox(0.03, 0.045, 0.1, 0.01, M.tail, 'Stop'); stop.position.set(-0.8, 0.92, 0); m.add(stop);
    m.add(rod([-0.72, 0.81, 0], [-0.86, 0.62, 0], 0.012, M.trim, 'Porta placa'));
    const plate = rbox(0.012, 0.1, 0.16, 0.006, M.plate, 'Porta placa'); plate.position.set(-0.865, 0.6, 0); plate.rotation.z = -0.3; m.add(plate);

    const engine = rbox(0.34, 0.28, 0.24, 0.04, M.engine, 'Motor'); engine.position.set(0.06, 0.48, 0); m.add(engine);
    const cyl = new THREE.Group(); cyl.position.set(0.19, 0.64, 0); cyl.rotation.z = -0.35; m.add(cyl);
    cyl.add(rbox(0.15, 0.2, 0.17, 0.03, M.engine, 'Motor'));
    for (let i = 0; i < 4; i++) { const fin = rbox(0.2, 0.012, 0.21, 0.004, M.engine, 'Motor'); fin.position.y = -0.07 + i * 0.045; cyl.add(fin); }

    m.add(rod([-0.26, 0.46, 0], [-0.17, 0.75, 0], 0.022, M.chrome, 'Amortiguador'));
    m.add(tube([[0.16, 0.42, 0.1], [0.02, 0.27, 0.15], [-0.3, 0.3, 0.17]], 0.026, M.chrome, 'Escape'));
    m.add(rod([-0.3, 0.3, 0.17], [-0.64, 0.43, 0.17], 0.056, M.engine, 'Escape'));
    m.add(rod([-0.62, 0.425, 0.17], [-0.68, 0.45, 0.17], 0.036, M.chrome, 'Escape'));

    const fender = part(new THREE.Mesh(new THREE.TorusGeometry(0.335, 0.022, 8, 28, Math.PI * 0.55), M.paint), 'Guardafango delantero');
    fender.rotation.z = Math.PI * 0.22; fender.scale.z = 3; fender.position.set(0.7, 0.32, 0); m.add(fender);
    return g;
  }

  const vehicles = { carro: buildCar(), moto: buildMoto() };
  Object.values(vehicles).forEach((v) => { v.visible = false; scene.add(v); });
  let current = initial === 'moto' ? 'moto' : 'carro';
  vehicles[current].visible = true;

  /* ---------- Golpes ---------- */
  const marks = { carro: [], moto: [] };
  const markGeo = new THREE.SphereGeometry(0.05, 20, 14);
  const haloGeo = new THREE.RingGeometry(0.07, 0.11, 36);

  function carRegion(p, n, name) {
    const der = p.z >= 0;
    const sideF = der ? 'derecha' : 'izquierda';
    const sideM = der ? 'derecho' : 'izquierdo';
    if (name === 'glass') {
      if (p.x > 0.3 && n.x > 0.25) return 'Parabrisas';
      if (p.x < -1.0 && n.x < -0.25) return 'Vidrio trasero';
      return `Vidrio ${sideM}`;
    }
    if (name === 'roof') return 'Techo';
    if (name && name !== 'body') return name;
    if (n.y > 0.55) {
      if (p.y > 1.38) return 'Techo';
      if (p.x > 0.85) return 'Capó';
      if (p.x < -1.5) return 'Baúl';
    }
    if (p.x > 2.0) return 'Bumper delantero';
    if (p.x < -2.0) return 'Bumper trasero';
    if (p.x > 0.92) return `Guardafango delantero ${sideM}`;
    if (p.x > -0.38) return `Puerta delantera ${sideF}`;
    if (p.x > -1.2) return `Puerta trasera ${sideF}`;
    return `Guardafango trasero ${sideM}`;
  }

  const tweens = [];
  const tween = (dur, fn, done) => tweens.push({ t0: performance.now(), dur, fn, done });

  function addMark(hit) {
    const root = vehicles[current];
    const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize();
    const local = root.worldToLocal(hit.point.clone());
    const label = current === 'carro' ? carRegion(local, n, hit.object.userData.part) : (hit.object.userData.part || 'Chasis');

    const g = new THREE.Group();
    g.add(new THREE.Mesh(markGeo, M.mark));
    const halo = new THREE.Mesh(haloGeo, M.halo);
    g.add(halo);
    root.add(g);
    g.position.copy(root.worldToLocal(hit.point.clone().addScaledVector(n, 0.015)));
    g.lookAt(hit.point.clone().addScaledVector(n, 1));
    const list = marks[current];
    list.push({ obj: g, label });
    if (list.length > 6) { const old = list.shift(); root.remove(old.obj); }
    if (!reduce) { g.scale.setScalar(0.5); tween(420, (k) => g.scale.setScalar(0.5 + 0.5 * easeOutBack(k))); }
    onMark(current, list.map((m) => m.label));
  }

  function clearMarks() {
    const root = vehicles[current];
    marks[current].forEach((m) => root.remove(m.obj));
    marks[current] = [];
    onMark(current, []);
  }

  /* ---------- Controles ---------- */
  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.rotateSpeed = 0.7;
  controls.minPolarAngle = 0.75;
  controls.maxPolarAngle = 1.42;
  controls.autoRotate = !reduce;
  controls.autoRotateSpeed = 0.7;
  canvas.style.touchAction = 'pan-y';   // en el celular, deslizar vertical sigue bajando la página

  let resumeTimer = 0;
  controls.addEventListener('start', () => { controls.autoRotate = false; clearTimeout(resumeTimer); });
  controls.addEventListener('end', () => { clearTimeout(resumeTimer); resumeTimer = setTimeout(() => { controls.autoRotate = !reduce; }, 5000); });

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pick(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.intersectObject(vehicles[current], true).find((h) => h.object.userData.part);
  }
  let down = null;
  canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  canvas.addEventListener('pointerup', (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    const quick = performance.now() - down.t < 600;
    down = null;
    if (moved < 8 && quick) { const h = pick(e); if (h) addMark(h); }
  });
  let hoverEvt = null;
  if (!coarse) canvas.addEventListener('pointermove', (e) => { if (!down) hoverEvt = e; });

  /* ---------- Cambio de vehículo ---------- */
  function setVehicle(type) {
    if (type === current || !vehicles[type]) return;
    const out = vehicles[current], inn = vehicles[type];
    current = type;
    onMark(type, marks[type].map((m) => m.label));
    if (reduce) { out.visible = false; inn.visible = true; return; }
    tween(220, (k) => { const e = easeOut(k); out.scale.setScalar(1 - 0.1 * e); out.position.y = -0.3 * e; }, () => {
      out.visible = false; out.scale.setScalar(1); out.position.y = 0;
      inn.visible = true;
      tween(760, (k) => { const e = easeOutExpo(k); inn.scale.setScalar(0.88 + 0.12 * e); inn.position.y = -0.3 * (1 - e); inn.rotation.y = -0.8 * (1 - e); });
    });
  }

  /* ---------- Tamaño ---------- */
  function fit() {
    const w = Math.max(1, container.clientWidth), h = Math.max(1, container.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    dist = 3.05 / Math.sin(Math.min(vfov, hfov * 1.1) / 2);
    // La hoja de recepción tapa la parte de abajo: sube el vehículo en el encuadre
    // (y en pantallas anchas, lo corre un poco a la derecha)
    camera.setViewOffset(w, h, w >= 560 ? -w * 0.06 : 0, h * (w >= 560 ? 0.1 : 0.12), w, h);
    camera.updateProjectionMatrix();
    const dir = camera.position.lengthSq() ? camera.position.clone().sub(target).normalize() : homeDir;
    camera.position.copy(target).addScaledVector(dir, dist);
  }
  new ResizeObserver(fit).observe(container);
  fit();

  /* Entrada: la cámara llega girando hasta su lugar (una sola vez) */
  if (!reduce) {
    const startDir = homeDir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -0.9);
    controls.enabled = false;
    const t0 = performance.now();
    tweens.push({ t0, dur: 1700, fn: (k) => {
      const e = easeOutExpo(k);
      const d = startDir.clone().lerp(homeDir, e).normalize();
      camera.position.copy(target).addScaledVector(d, dist * (1.35 - 0.35 * e));
    }, done: () => { controls.enabled = true; } });
  } else {
    camera.position.copy(target).addScaledVector(homeDir, dist);
  }

  /* ---------- Bucle (solo corre si se ve en pantalla) ---------- */
  let visible = true, raf = 0, ready = false;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) start(); }, { threshold: 0 }).observe(container);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
  function start() { if (!raf) raf = requestAnimationFrame(frame); }
  function frame(now) {
    raf = 0;
    if (!visible || document.hidden) return;
    for (let i = tweens.length - 1; i >= 0; i--) {
      const t = tweens[i];
      const k = Math.min(1, (now - t.t0) / t.dur);
      t.fn(k);
      if (k >= 1) { tweens.splice(i, 1); t.done && t.done(); }
    }
    controls.update();
    if (hoverEvt) { canvas.style.cursor = pick(hoverEvt) ? 'crosshair' : 'grab'; hoverEvt = null; }
    renderer.render(scene, camera);
    if (!ready) { ready = true; onReady(); }
    raf = requestAnimationFrame(frame);
  }
  start();

  return { setVehicle, clearMarks };
}
