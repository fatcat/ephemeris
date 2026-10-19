/**
 * Three.js scene for the Sky Dome view.
 *
 * An observer stands at the center of a flat horizon disk under a
 * see-through hemisphere. The sun's path across the sky is traced for the
 * June solstice, the equinox, the December solstice and today, with today's
 * path marked at each hour of solar time. The camera sits behind the
 * observer, looking toward the equator, where the sun spends its day.
 *
 * Scene convention (shared with the sundial): +Y up, north = -Z, east = +X.
 */

import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Group,
  Mesh,
  Line,
  BufferGeometry,
  Float32BufferAttribute,
  CircleGeometry,
  SphereGeometry,
  CylinderGeometry,
  TubeGeometry,
  CatmullRomCurve3,
  Vector3,
  MeshBasicMaterial,
  LineBasicMaterial,
  Sprite,
  SpriteMaterial,
  DoubleSide,
  Color,
  type Material,
  type Texture,
} from 'three';
import { createConstrainedOrbit, createTextTexture } from './sceneHelpers.js';
import { createSunMarker } from './sunMarker.js';
import { horizonToScenePosition } from '../utils/geo.js';
import { sunElevationAzimuth } from '../astronomy/solar.js';
import {
  sunPathForDay,
  seasonalPaths,
  solarHourMarkers,
  type SkyPoint,
  type SeasonalPathId,
} from '../astronomy/sunPath.js';
import type { Theme } from '../themes.js';

// ── Constants ──

const R = 10; // dome radius
const GROUND_RADIUS = R * 1.04;
const COMPASS_LABEL_R = R * 1.25; // clear of the sunrise/sunset hour labels
const HOUR_LABEL_R = R * 1.07;

const PATH_TUBE = 0.06;
const TODAY_TUBE = 0.11;

/** Path colors, keyed by how the path relates to the observer's seasons. */
export const PATH_COLORS = {
  summer: 0xe08a3c, // warm orange: the solstice with the higher sun
  winter: 0x5b8fd6, // cool blue: the solstice with the lower sun
  equinox: 0x9aa3ad, // neutral gray
  today: 0xf2c94c, // sun yellow
} as const;

const GROUND_COLOR = 0x5f6b55; // muted olive, textbook map green
const DOME_COLOR = 0x9cc3e6;
const GRID_COLOR = 0xb8c8d8;

/** Camera pose behind the observer, facing the equator-ward horizon. */
const CAMERA_BACK = 29;
const CAMERA_UP = 10;
const CAMERA_TARGET_Y = 2.5;

export type PathRole = keyof typeof PATH_COLORS;

export interface SeasonalPathInfo {
  role: PathRole;
  /** False when the sun never rises that day (polar night) */
  rises: boolean;
}

/** Solstice peaks closer than this count as equal: no seasons (axial tilt near 0). */
const NO_SEASON_EPSILON_DEG = 0.5;

export interface SkydomeUpdate {
  time: Date;
  latDeg: number;
  lonDeg: number;
  tiltDeg: number;
  theme: Theme;
}

export interface SkydomeScene {
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  /** Update and return the sun's current elevation in degrees. */
  update: (u: SkydomeUpdate) => number;
  /** Color role and visibility of each seasonal path for the current inputs. */
  seasonalInfo: () => Record<SeasonalPathId, SeasonalPathInfo>;
  resize: (width: number, height: number) => void;
  dispose: () => void;
}

const MS_PER_DAY = 86_400_000;

/** Dispose every geometry, material and texture under a group, then empty it. */
function clearGroup(group: Group) {
  group.traverse((obj) => {
    if (obj instanceof Mesh || obj instanceof Line || obj instanceof Sprite) {
      obj.geometry.dispose();
      const mats: Material[] = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) {
        (m as Material & { map?: Texture | null }).map?.dispose();
        m.dispose();
      }
    }
  });
  group.clear();
}

function pointToVec(p: SkyPoint, r = R): Vector3 {
  return new Vector3(...horizonToScenePosition(p.azimuth, p.elevation, r));
}

function circlePoints(radius: number, y: number, segments = 96): number[] {
  const pts: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push(Math.cos(a) * radius, y, Math.sin(a) * radius);
  }
  return pts;
}

function makeLine(points: number[], material: LineBasicMaterial): Line {
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(points, 3));
  return new Line(geo, material.clone());
}

/** White text sprite; tinted per theme through SpriteMaterial.color. */
function makeLabel(text: string, size: number, font: string): Sprite {
  const tex = createTextTexture(text, { color: '#ffffff', font });
  const sprite = new Sprite(new SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sprite.scale.set(size, size, 1);
  sprite.userData.label = true;
  return sprite;
}

export function createSkydomeScene(container: HTMLElement): SkydomeScene {
  const scene = new Scene();

  const camera = new PerspectiveCamera(42, 1, 0.1, 200);
  camera.position.set(0, CAMERA_UP, -CAMERA_BACK);

  const renderer = new WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const { controls, aim } = createConstrainedOrbit(camera, renderer.domElement, {
    zoomMargin: 0.15,
    polarMarginDeg: 18,
    azimuthMarginDeg: 40,
  });

  // ── Static parts: ground, dome, grid, observer ──
  const staticGroup = new Group();
  scene.add(staticGroup);

  const ground = new Mesh(
    new CircleGeometry(GROUND_RADIUS, 96),
    new MeshBasicMaterial({ color: GROUND_COLOR }),
  );
  ground.rotation.x = -Math.PI / 2;
  staticGroup.add(ground);

  const dome = new Mesh(
    new SphereGeometry(R, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2),
    new MeshBasicMaterial({
      color: DOME_COLOR,
      transparent: true,
      opacity: 0.07,
      side: DoubleSide,
      depthWrite: false,
    }),
  );
  staticGroup.add(dome);

  const gridMat = new LineBasicMaterial({ color: GRID_COLOR, transparent: true, opacity: 0.35 });
  // Horizon ring, plus altitude rings at 30° and 60°
  for (const alt of [0, 30, 60]) {
    const a = alt * (Math.PI / 180);
    staticGroup.add(makeLine(circlePoints(R * Math.cos(a), R * Math.sin(a) + 0.01), gridMat));
  }
  // Azimuth arcs every 45°, horizon to zenith
  for (let az = 0; az < 360; az += 45) {
    const pts: number[] = [];
    for (let el = 0; el <= 90; el += 3) pts.push(...horizonToScenePosition(az, el, R));
    staticGroup.add(makeLine(pts, gridMat));
  }
  gridMat.dispose();

  // Observer: a small figure at the center for scale
  const figureMat = new MeshBasicMaterial({ color: 0x2b2b2b });
  const body = new Mesh(new CylinderGeometry(0.18, 0.28, 1.1, 16), figureMat);
  body.position.y = 0.55;
  const head = new Mesh(new SphereGeometry(0.2, 16, 12), figureMat.clone());
  head.position.y = 1.32;
  staticGroup.add(body, head);

  // Compass labels, lying just outside the ground disk
  const compassGroup = new Group();
  scene.add(compassGroup);
  for (const [text, az] of [['N', 0], ['E', 90], ['S', 180], ['W', 270]] as const) {
    const label = makeLabel(text, 1.5, 'bold 64px sans-serif');
    label.position.set(...horizonToScenePosition(az, 0, COMPASS_LABEL_R));
    label.position.y = 0.6;
    compassGroup.add(label);
  }

  // ── Sun: marker sprite and a faint ray from the observer ──
  // Kept out of the cleared groups: its texture is shared by every sun marker.
  const sun = createSunMarker(1.6, true);
  // Transparent sprite corners must not hide the dome drawn after it
  sun.material.depthWrite = false;
  scene.add(sun);
  const rayGeo = new BufferGeometry();
  rayGeo.setAttribute('position', new Float32BufferAttribute([0, 1.3, 0, 0, 0, 0], 3));
  const ray = new Line(rayGeo, new LineBasicMaterial({ color: PATH_COLORS.today, transparent: true, opacity: 0.6 }));
  scene.add(ray);

  // ── Paths: rebuilt when the day, location or tilt changes ──
  const pathGroup = new Group();
  scene.add(pathGroup);

  let builtKey = '';
  let info: Record<SeasonalPathId, SeasonalPathInfo> = {
    juneSolstice: { role: 'summer', rises: true },
    marchEquinox: { role: 'equinox', rises: true },
    decemberSolstice: { role: 'winter', rises: true },
  };
  let southernAim: boolean | null = null;

  function addTube(points: SkyPoint[], radius: number, color: number) {
    if (points.length < 2) return;
    const curve = new CatmullRomCurve3(points.map((p) => pointToVec(p)));
    const geo = new TubeGeometry(curve, Math.max(16, points.length * 2), radius, 8, false);
    pathGroup.add(new Mesh(geo, new MeshBasicMaterial({ color })));
  }

  function buildPaths(time: Date, latDeg: number, lonDeg: number, tiltDeg: number) {
    clearGroup(pathGroup);

    const seasonal = seasonalPaths(time.getUTCFullYear(), latDeg, lonDeg, tiltDeg);
    const peak = (pts: SkyPoint[]) => pts.reduce((m, p) => Math.max(m, p.elevation), -90);
    const june = seasonal.find((s) => s.id === 'juneSolstice')!;
    const dec = seasonal.find((s) => s.id === 'decemberSolstice')!;
    const diff = peak(june.points) - peak(dec.points);
    const noSeasons = Math.abs(diff) < NO_SEASON_EPSILON_DEG;
    const juneRole: PathRole = noSeasons ? 'equinox' : diff > 0 ? 'summer' : 'winter';
    const decRole: PathRole = noSeasons ? 'equinox' : diff > 0 ? 'winter' : 'summer';
    const roleOf: Record<SeasonalPathId, PathRole> = {
      juneSolstice: juneRole,
      marchEquinox: 'equinox',
      decemberSolstice: decRole,
    };
    info = Object.fromEntries(
      seasonal.map((s) => [s.id, { role: roleOf[s.id], rises: s.points.length > 1 }]),
    ) as Record<SeasonalPathId, SeasonalPathInfo>;
    for (const s of seasonal) addTube(s.points, PATH_TUBE, PATH_COLORS[roleOf[s.id]]);

    addTube(sunPathForDay(time, latDeg, lonDeg, tiltDeg), TODAY_TUBE, PATH_COLORS.today);

    // Solar-time hour dots and labels on today's path
    const dotGeo = new SphereGeometry(0.17, 12, 8);
    const dotMat = new MeshBasicMaterial({ color: PATH_COLORS.today });
    for (const m of solarHourMarkers(time, latDeg, lonDeg, tiltDeg)) {
      const dot = new Mesh(dotGeo.clone(), dotMat.clone());
      dot.position.copy(pointToVec(m));
      pathGroup.add(dot);

      const hour = (((12 + m.hourOffset) % 24) + 24) % 24;
      const label = makeLabel(String(hour), 1.2, 'bold 48px sans-serif');
      label.position.copy(pointToVec(m, HOUR_LABEL_R));
      pathGroup.add(label);
    }
    dotGeo.dispose();
    dotMat.dispose();
  }

  function setLabelColor(group: Group, color: Color) {
    for (const obj of group.children) {
      if (obj instanceof Sprite && obj.userData.label) obj.material.color.copy(color);
    }
  }
  const labelColor = new Color();

  function update({ time, latDeg, lonDeg, tiltDeg, theme }: SkydomeUpdate): number {
    // Rebuild once per local solar day (offset UTC by longitude) or on input change
    const solarDay = Math.floor((time.getTime() + (lonDeg / 360) * MS_PER_DAY) / MS_PER_DAY);
    const key = `${solarDay}|${latDeg.toFixed(2)}|${lonDeg.toFixed(2)}|${tiltDeg}`;
    if (key !== builtKey) {
      buildPaths(time, latDeg, lonDeg, tiltDeg);
      builtKey = key;
    }

    // Face the equator: from the north side in the northern hemisphere
    const southern = latDeg < 0;
    if (southern !== southernAim) {
      aim([0, CAMERA_UP, southern ? CAMERA_BACK : -CAMERA_BACK], [0, CAMERA_TARGET_Y, 0]);
      southernAim = southern;
    }

    labelColor.set(theme.colors.text);
    setLabelColor(compassGroup, labelColor);
    setLabelColor(pathGroup, labelColor);
    renderer.setClearColor(theme.clearColor);

    const { elevation, azimuth } = sunElevationAzimuth(time, latDeg, lonDeg, tiltDeg);
    const up = elevation > 0;
    sun.visible = up;
    ray.visible = up;
    if (up) {
      const p = horizonToScenePosition(azimuth, elevation, R);
      sun.position.set(...p);
      const pos = rayGeo.getAttribute('position');
      pos.setXYZ(1, ...p);
      pos.needsUpdate = true;
    }

    controls.update();
    return elevation;
  }

  function resize(width: number, height: number) {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  function dispose() {
    clearGroup(pathGroup);
    clearGroup(compassGroup);
    clearGroup(staticGroup);
    sun.material.dispose();
    rayGeo.dispose();
    ray.material.dispose();
    scene.clear();
    controls.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  }

  return {
    scene,
    camera,
    renderer,
    update,
    seasonalInfo: () => info,
    resize,
    dispose,
  };
}
