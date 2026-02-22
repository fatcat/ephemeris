/**
 * Three.js scene for the Sundial view.
 *
 * Renders a horizontal sundial with a latitude-correct gnomon,
 * hour lines, half-hour lines, and Roman numeral labels.
 * A DirectionalLight casts the gnomon shadow onto the dial face.
 */

import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Mesh,
  MeshStandardMaterial,
  CylinderGeometry,
  Group,
  DirectionalLight,
  AmbientLight,
  BufferGeometry,
  Line,
  LineBasicMaterial,
  Vector2,
  Vector3,
  MeshBasicMaterial,
  PlaneGeometry,
  CanvasTexture,
  DoubleSide,
  LatheGeometry,
  PCFSoftShadowMap,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ── Constants ──

const DIAL_RADIUS = 12
const DIAL_HEIGHT = 1.50;
const GNOMON_BASE_LENGTH = DIAL_RADIUS * 0.75;
const HOUR_LINE_INNER = 7.6; // start offset from center
const HOUR_LINE_OUTER = DIAL_RADIUS * 0.75; // stops just short of labels
const LABEL_RADIUS = DIAL_RADIUS * 0.85;
const BEVEL = 0.28;         // chamfer width on top edge of dial
const INNER_RING_R = 6.5;   // decorative ring inside hour lines (around boss)
const OUTER_RING_R = 11.40; // decorative ring between labels and rim

//const ROMAN = [
//  '', 'I', 'II', 'III', 'IV', 'V', 'VI',
//  'VII', 'VIII', 'IX', 'X', 'XI', 'XII',
//];

const ROMAN = [
  '', '', 'II', 'III', 'IV', 'V', 'VI',
  'VII', 'VIII', 'IX', 'X', '', 'XII',
];

const GNOMON_COLOR = 0x6b5b45; // dark bronze
const LINE_COLOR = 0x3a3226; // dark marking
const LABEL_COLOR = '#000000';

/**
 * Generate a procedural stone-grain canvas texture for the dial face.
 * Uses a deterministic xorshift RNG so the result is reproducible.
 */
function createDialTexture(): CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Base warm cream/limestone colour
  ctx.fillStyle = '#e8e2d4';
  ctx.fillRect(0, 0, size, size);

  // Deterministic xorshift32 RNG
  let seed = 0x6D2B79F5;
  function rng(): number {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    return (seed >>> 0) / 0xFFFFFFFF;
  }

  // Fine grain: thousands of tiny dots in light/dark warm tones
  for (let i = 0; i < 14000; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const r = rng() * 1.1 + 0.2;
    ctx.globalAlpha = rng() * 0.065 + 0.01;
    ctx.fillStyle = rng() > 0.5 ? '#fff5dc' : '#5a3f1a';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Subtle veins / fossil-like scratches
  for (let i = 0; i < 40; i++) {
    const x1 = rng() * size;
    const y1 = rng() * size;
    const angle = rng() * Math.PI * 2;
    const len = rng() * 80 + 15;
    ctx.globalAlpha = rng() * 0.045 + 0.01;
    ctx.strokeStyle = rng() > 0.45 ? '#d4c9a8' : '#7a6038';
    ctx.lineWidth = rng() * 0.8 + 0.2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    const cpx = x1 + Math.cos(angle) * len * 0.5 + (rng() - 0.5) * 30;
    const cpy = y1 + Math.sin(angle) * len * 0.5 + (rng() - 0.5) * 30;
    ctx.quadraticCurveTo(cpx, cpy, x1 + Math.cos(angle) * len, y1 + Math.sin(angle) * len);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  return new CanvasTexture(canvas);
}

export interface SundialScene {
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  update: (
    elevationDeg: number,
    azimuthDeg: number,
    latDeg: number,
    litHours: Set<number>,
    clearColor: number,
  ) => void;
  resize: (width: number, height: number) => void;
  dispose: () => void;
}

/** Create a canvas texture with a Roman numeral label. */
function createLabelTexture(text: string): CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = LABEL_COLOR;
  ctx.font = 'bold 56px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, size / 2, size / 2);
  const tex = new CanvasTexture(canvas);
  return tex;
}

/**
 * Compute hour line angle on the dial face.
 * For a horizontal sundial: tan(θ) = sin(latitude) × tan(15° × h)
 * where h is the hour offset from noon and θ is the angle from the noon line.
 * Returns angle in radians.
 */
function hourLineAngle(latRad: number, hourOffset: number): number {
  const ha = hourOffset * 15 * (Math.PI / 180); // hour angle in radians
  return Math.atan2(Math.sin(latRad) * Math.sin(ha), Math.cos(ha));
}

export function createSundialScene(container: HTMLElement): SundialScene {
  const scene = new Scene();

  const camera = new PerspectiveCamera(45, 1, 0.1, 200);
  // Default: northern hemisphere view from south-southwest (slight X offset
  // so the gnomon blade's triangular profile is visible, not edge-on)
  camera.position.set(5, 23, 22);
  camera.lookAt(0, 0, 0);

  const renderer = new WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x0a0a1a);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // ── Orbit controls (limited: ±10% zoom, ±10° polar, ±15° azimuth) ──
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.22
  controls.enablePan = false;
  const INIT_DIST = camera.position.length();
  controls.minDistance = INIT_DIST * 0.9;
  controls.maxDistance = INIT_DIST * 1.1;
  const INIT_POLAR = Math.acos(camera.position.y / INIT_DIST);
  const POLAR_MARGIN = 10 * (Math.PI / 180);
  controls.minPolarAngle = INIT_POLAR - POLAR_MARGIN;
  controls.maxPolarAngle = INIT_POLAR + POLAR_MARGIN;
  const INIT_AZ = Math.atan2(camera.position.x, camera.position.z);
  const AZ_MARGIN = 15 * (Math.PI / 180);
  controls.minAzimuthAngle = INIT_AZ - AZ_MARGIN;
  controls.maxAzimuthAngle = INIT_AZ + AZ_MARGIN;

  // ── Lights ──
  const sunLight = new DirectionalLight(0xfff5e0, 2.0);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.left = -12;
  sunLight.shadow.camera.right = 12;
  sunLight.shadow.camera.top = 12;
  sunLight.shadow.camera.bottom = -12;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 100;
  sunLight.shadow.bias = -0.001;
  scene.add(sunLight);
  scene.add(sunLight.target);

  const ambientLight = new AmbientLight(0x404060, 0.3);
  scene.add(ambientLight);

  // ── Dial face (LatheGeometry with chamfered top edge) ──
  // Profile swept around Y axis: bottom-centre → outer bottom →
  // outer side → chamfer → top-centre. Top face sits at y=0.
  const dialProfile: Vector2[] = [
    new Vector2(0,                   -DIAL_HEIGHT),
    new Vector2(DIAL_RADIUS,         -DIAL_HEIGHT),
    new Vector2(DIAL_RADIUS,         -BEVEL),
    new Vector2(DIAL_RADIUS - BEVEL,  0),
    new Vector2(0,                    0),
  ];
  const dialGeo = new LatheGeometry(dialProfile, 64);
  const dialTexture = createDialTexture();
  const dialMat = new MeshStandardMaterial({
    map: dialTexture,
    roughness: 0.85,
    metalness: 0.02,
  });
  const dialMesh = new Mesh(dialGeo, dialMat);
  dialMesh.receiveShadow = true;
  scene.add(dialMesh);

  // ── Dynamic group for gnomon + hour lines + labels ──
  const dialGroup = new Group();
  scene.add(dialGroup);

  // Track the current configuration to avoid rebuilding every frame
  let builtKey = '';

  // Disposable arrays for cleanup on rebuild
  let dynamicMeshes: (Mesh | Line)[] = [];
  let dynamicGeometries: BufferGeometry[] = [];
  let dynamicMaterials: (MeshStandardMaterial | MeshBasicMaterial | LineBasicMaterial)[] = [];
  let dynamicTextures: CanvasTexture[] = [];

  function clearDynamic() {
    for (const m of dynamicMeshes) dialGroup.remove(m);
    for (const g of dynamicGeometries) g.dispose();
    for (const m of dynamicMaterials) m.dispose();
    for (const t of dynamicTextures) t.dispose();
    dynamicMeshes = [];
    dynamicGeometries = [];
    dynamicMaterials = [];
    dynamicTextures = [];
  }

  function buildDial(latDeg: number, litHours: Set<number>, southernHemi: boolean) {
    clearDynamic();

    const latRad = Math.abs(latDeg) * (Math.PI / 180);

    // ── Gnomon ──
    // Thin tapered needle pointing toward the celestial north pole at angle = |lat|.
    // CylinderGeometry default axis is +Y; rotation.x by (latRad - π/2) tilts it so
    // local +Y aligns to world (0, sin(lat), -cos(lat)) = up and north.
    // The needle base sits at the dial center (0,0,0); tip is at (0, H, -L).
    if (latRad > 0.01) {
      const styleLength = (GNOMON_BASE_LENGTH / Math.cos(latRad)) * 0.85;
      const gnomonGeo = new CylinderGeometry(0.04, 0.18, styleLength, 8);
      const gnomonMat = new MeshStandardMaterial({
        color: GNOMON_COLOR,
        roughness: 0.5,
        metalness: 0.4,
      });
      const gnomonMesh = new Mesh(gnomonGeo, gnomonMat);
      gnomonMesh.castShadow = true;
      gnomonMesh.rotation.x = latRad - Math.PI / 2;
      // Place midpoint of needle halfway along the style direction
      gnomonMesh.position.set(
        0,
        0.5 * styleLength * Math.sin(latRad),
        -0.5 * styleLength * Math.cos(latRad),
      );
      dialGroup.add(gnomonMesh);
      dynamicMeshes.push(gnomonMesh);
      dynamicGeometries.push(gnomonGeo);
      dynamicMaterials.push(gnomonMat);
    }

    // ── Center boss (brass ring around gnomon base) ──
    const bossGeo = new CylinderGeometry(0.9, 1.25, 0.3, 32);
    const bossMat = new MeshStandardMaterial({
      color: 0xc8a038,
      roughness: 0.22,
      metalness: 0.88,
    });
    const bossMesh = new Mesh(bossGeo, bossMat);
    bossMesh.castShadow = true;
    bossMesh.receiveShadow = true;
    bossMesh.position.y = 0.15; // base at y=0 (dial top), top at y=0.3
    dialGroup.add(bossMesh);
    dynamicMeshes.push(bossMesh);
    dynamicGeometries.push(bossGeo);
    dynamicMaterials.push(bossMat);

    // ── Hour lines ──
    const lineMat = new LineBasicMaterial({ color: LINE_COLOR });
    dynamicMaterials.push(lineMat);

    for (let h = -6; h <= 6; h++) {
      if (!litHours.has(h)) continue;

      const angle = hourLineAngle(latRad, h);
      const outerR = HOUR_LINE_OUTER;

      // Negate Z so lines fan toward -Z (north, away from camera)
      const pts = [
        new Vector3(Math.sin(angle) * HOUR_LINE_INNER, 0.01, -Math.cos(angle) * HOUR_LINE_INNER),
        new Vector3(Math.sin(angle) * outerR, 0.01, -Math.cos(angle) * outerR),
      ];
      const lineGeo = new BufferGeometry().setFromPoints(pts);
      const line = new Line(lineGeo, lineMat);
      dialGroup.add(line);
      dynamicMeshes.push(line);
      dynamicGeometries.push(lineGeo);
    }

    // ── Roman numeral labels ──
    // Hour 0 (noon) = XII, hour -6 = VI (morning), hour +6 = VI (evening)
    // Traditionally labeled in civil time: 6 AM = VI, 12 PM = XII, 6 PM = VI
    for (let h = -6; h <= 6; h++) {
      if (!litHours.has(h)) continue;

      // Civil hour: noon (h=0) = 12, morning negative, afternoon positive
      const civilHour = 12 + h;
      // Convert to 12-hour for Roman numeral
      const display12 = civilHour > 12 ? civilHour - 12 : civilHour;
      const label = ROMAN[display12];
      if (!label) continue;

      const angle = hourLineAngle(latRad, h);
      const tex = createLabelTexture(label);
      dynamicTextures.push(tex);

      const labelGeo = new PlaneGeometry(2.0, 2.0);
      dynamicGeometries.push(labelGeo);
      const labelMat = new MeshBasicMaterial({
        map: tex,
        transparent: true,
        side: DoubleSide,
        depthWrite: false,
      });
      dynamicMaterials.push(labelMat);

      const labelMesh = new Mesh(labelGeo, labelMat);
      // Lay flat on the dial face: rotate -90° around X so the plane is in XZ
      labelMesh.rotation.x = -Math.PI / 2;
      labelMesh.position.set(
        Math.sin(angle) * LABEL_RADIUS,
        0.02,
        -Math.cos(angle) * LABEL_RADIUS,
      );
      // When the group is flipped (scale.z=-1 for southern hemisphere), the plane's
      // back face is rendered, making the texture appear horizontally mirrored.
      // A second mirror in local X restores readability.
      if (southernHemi) labelMesh.scale.x = -1;
      dialGroup.add(labelMesh);
      dynamicMeshes.push(labelMesh);
    }

    // ── Decorative concentric rings ──
    // Inner ring frames the boss area; outer ring frames the label zone.
    for (const ringR of [INNER_RING_R, OUTER_RING_R]) {
      const pts: Vector3[] = [];
      for (let i = 0; i <= 72; i++) {
        const a = (i / 72) * Math.PI * 2;
        pts.push(new Vector3(Math.cos(a) * ringR, 0.01, Math.sin(a) * ringR));
      }
      const ringGeo = new BufferGeometry().setFromPoints(pts);
      const ringLine = new Line(ringGeo, lineMat);
      dialGroup.add(ringLine);
      dynamicMeshes.push(ringLine);
      dynamicGeometries.push(ringGeo);
    }

    // Southern hemisphere: flip the dial group so gnomon points south
    if (southernHemi) {
      dialGroup.scale.z = -1;
    } else {
      dialGroup.scale.z = 1;
    }
  }

  function update(
    elevationDeg: number,
    azimuthDeg: number,
    latDeg: number,
    litHours: Set<number>,
    clearColor: number,
  ) {
    const southernHemi = latDeg < 0;

    // Build key to detect when we need to rebuild geometry
    const litKey = Array.from(litHours).sort((a, b) => a - b).join(',');
    const roundedLat = Math.round(Math.abs(latDeg) * 10) / 10;
    const newKey = `${roundedLat}|${litKey}|${southernHemi}`;

    if (newKey !== builtKey) {
      buildDial(latDeg, litHours, southernHemi);
      builtKey = newKey;

      // Update camera for hemisphere (slight X offset so gnomon blade is visible)
      if (southernHemi) {
        camera.position.set(-5, 23, -22);
      } else {
        camera.position.set(5, 23, 22);
      }
      camera.lookAt(0, 0, 0);
      controls.target.set(0, 0, 0);
      const newDist = camera.position.length();
      controls.minDistance = newDist * 0.9;
      controls.maxDistance = newDist * 1.1;
      const newPolar = Math.acos(camera.position.y / newDist);
      controls.minPolarAngle = newPolar - POLAR_MARGIN;
      controls.maxPolarAngle = newPolar + POLAR_MARGIN;
      const newAz = Math.atan2(camera.position.x, camera.position.z);
      controls.minAzimuthAngle = newAz - AZ_MARGIN;
      controls.maxAzimuthAngle = newAz + AZ_MARGIN;
      controls.update();
    }

    // ── Sun light position from elevation/azimuth ──
    // Light is always on; shadow fades via ambient/directional ratio rather
    // than toggling visibility. t=0 at horizon (faint shadow), t=1 at 60° (crisp).
    const t = Math.max(0, Math.min(1, elevationDeg / 60));
    sunLight.intensity = 0.3 + t * 1.9;      // 0.3 (low) → 2.2 (high sun)
    ambientLight.intensity = 5.8 - t * 1.6;  // 1.8 (low) → 0.2 (high sun)
    ambientLight.color.setHex(0x404060);

    const elRad = elevationDeg * (Math.PI / 180);
    const azRad = azimuthDeg * (Math.PI / 180);
    const dist = 50;
    const lx = dist * Math.cos(elRad) * Math.sin(azRad);
    const ly = dist * Math.sin(elRad);
    const lz = -dist * Math.cos(elRad) * Math.cos(azRad);
    sunLight.position.set(lx, ly, lz);
    sunLight.target.position.set(0, 0, 0);
    sunLight.target.updateMatrixWorld();

    // Clear color
    renderer.setClearColor(clearColor);

    controls.update();
  }

  function resize(width: number, height: number) {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  function dispose() {
    clearDynamic();
    dialGeo.dispose();
    dialMat.dispose();
    dialTexture.dispose();
    controls.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  }

  return {
    scene,
    camera,
    renderer,
    update,
    resize,
    dispose,
  };
}
