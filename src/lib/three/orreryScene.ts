/**
 * Three.js scene for the Solar System (Orrery) view.
 *
 * Shows Earth orbiting the Sun on the ecliptic plane.
 * Earth's axial tilt direction is fixed in world space (Z-axis),
 * demonstrating how seasons arise from tilt + orbital position.
 *
 * The orrery Earth uses the same custom day/night shader as the
 * globe view so the terminator, night lights, and hard/soft setting
 * are consistent. Unlike the globe view (where the mesh is static and
 * sunDirection encodes time-of-day), the orrery Earth ROTATES via GMST
 * and the shader's sunDirection is computed geometrically: the vector
 * from Earth to Sun (at the scene origin), transformed into the mesh's
 * local (object) space.
 */

import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  SphereGeometry,
  Mesh,
  Group,
  MeshBasicMaterial,
  PointLight,
  AmbientLight,
  BufferGeometry,
  LineLoop,
  LineBasicMaterial,
  EllipseCurve,
  Vector3,
  Matrix4,
  type Texture,
  type ShaderMaterial,
} from 'three';
import { createEarthShaderMaterial } from './earthShader.js';
import { createGlobeGrid, type GlobeGrid } from './gridLines.js';
import { createSunMarkerGlobe } from './sunMarker.js';
import { createLocationMarkerGlobe } from './locationMarker.js';
import { createPolePins } from './polePins.js';

// Orbital parameters (not to scale — educational)
const ORBIT_A = 5.0; // semi-major axis (scene units)
const ORBIT_E = 0.0167; // Earth's orbital eccentricity
const ORBIT_B = ORBIT_A * Math.sqrt(1 - ORBIT_E * ORBIT_E);

const SUN_RADIUS = 0.3;
export const EARTH_RADIUS = 0.15;

/**
 * Season label positions on the orbital path.
 * These are the Earth's ecliptic longitude when each event occurs:
 *   Sun ecliptic lon 0° (Mar Eq)   → Earth at 180° (PI)
 *   Sun ecliptic lon 90° (Jun Sol) → Earth at 270° (3PI/2)
 *   Sun ecliptic lon 180° (Sep Eq) → Earth at 0° (0/2PI)
 *   Sun ecliptic lon 270° (Dec Sol)→ Earth at 90° (PI/2)
 */
export const SEASON_POSITIONS = [
  { label: 'Mar Equinox', angle: Math.PI },
  { label: 'Jun Solstice', angle: (3 * Math.PI) / 2 },
  { label: 'Sep Equinox', angle: 0 },
  { label: 'Dec Solstice', angle: Math.PI / 2 },
] as const;

export interface OrreryScene {
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  earthMesh: Mesh;
  earthMaterial: ShaderMaterial;
  earthTiltGroup: Group;
  earthOrbitGroup: Group;
  sunMarker: Mesh;
  locationMarker: Mesh;
  grid: GlobeGrid;
  getEarthPosition: () => Vector3;
  getSeasonPosition: (angle: number) => Vector3;
  resize: (width: number, height: number) => void;
  /**
   * Update Earth's orbital position and rotation.
   * @param earthAngle - Earth's ecliptic longitude (radians)
   * @param earthRotation - GMST in radians (daily rotation)
   * @param tiltRad - Axial tilt in radians
   * @returns sunDirection in Earth mesh's local/object space (for the shader uniform)
   */
  update: (earthAngle: number, earthRotation: number, tiltRad: number) => Vector3;
  dispose: () => void;
}

/** Compute (x, z) on the orbital ellipse for a given ecliptic longitude. */
function orbitPosition(angle: number): [number, number] {
  const x = ORBIT_A * Math.cos(angle);
  const z = -ORBIT_B * Math.sin(angle);
  return [x, z];
}

export function createOrreryScene(
  container: HTMLElement,
  dayTexture: Texture,
  nightTexture: Texture,
): OrreryScene {
  const scene = new Scene();

  const camera = new PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 8, 4);
  camera.lookAt(0, 0, 0);

  const renderer = new WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x0a0a1a);
  container.appendChild(renderer.domElement);

  // ── Lights ──
  // Point light for sun glow. The earth shader ignores scene lights
  // (ShaderMaterial) but the pole pins and markers benefit from it.
  const sunLight = new PointLight(0xffffff, 80, 50);
  sunLight.position.set(0, 0, 0);
  scene.add(sunLight);

  const ambient = new AmbientLight(0x404040);
  scene.add(ambient);

  // ── Sun ──
  const sunGeo = new SphereGeometry(SUN_RADIUS, 32, 32);
  const sunMat = new MeshBasicMaterial({ color: 0xffdd44 });
  const sunMesh = new Mesh(sunGeo, sunMat);
  scene.add(sunMesh);

  // ── Orbital path ──
  const curve = new EllipseCurve(0, 0, ORBIT_A, ORBIT_B, 0, 2 * Math.PI, false, 0);
  const orbitPoints = curve.getPoints(128);
  const orbitGeo = new BufferGeometry().setFromPoints(
    orbitPoints.map((p) => new Vector3(p.x, 0, -p.y)),
  );
  const orbitMat = new LineBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.5 });
  const orbitLine = new LineLoop(orbitGeo, orbitMat);
  scene.add(orbitLine);

  // ── Earth ──
  // earthOrbitGroup: positioned along the orbit (translation only, no rotation).
  // earthTiltGroup: child of orbitGroup, applies axial tilt in world-Z direction.
  // earthMesh: child of tiltGroup, rotates around Y by GMST for daily rotation.
  const earthOrbitGroup = new Group();
  scene.add(earthOrbitGroup);

  const earthTiltGroup = new Group();
  earthOrbitGroup.add(earthTiltGroup);

  // Same day/night shader as the globe view
  const earthGeo = new SphereGeometry(EARTH_RADIUS, 32, 32);
  const earthMaterial = createEarthShaderMaterial(dayTexture, nightTexture);
  const earthMesh = new Mesh(earthGeo, earthMaterial);
  earthTiltGroup.add(earthMesh);

  // Grid lines (equator, tropics, arctic circles, major/minor)
  // The grid is built for radius ~1.003; scale to match EARTH_RADIUS.
  const grid = createGlobeGrid();
  grid.group.scale.setScalar(EARTH_RADIUS);
  earthTiltGroup.add(grid.group);

  // Subsolar point marker (scaled down)
  const sunMarker = createSunMarkerGlobe(0.1);
  sunMarker.scale.setScalar(EARTH_RADIUS);
  earthTiltGroup.add(sunMarker);

  // Location marker (scaled down)
  const locationMarker = createLocationMarkerGlobe(0.08);
  locationMarker.scale.setScalar(EARTH_RADIUS);
  earthTiltGroup.add(locationMarker);

  // Barber pole pins at the poles (scaled down)
  const polePins = createPolePins();
  polePins.scale.setScalar(EARTH_RADIUS);
  earthTiltGroup.add(polePins);

  // Reusable vectors/matrices for per-frame calculations
  const _earthPos = new Vector3();
  const _sunDirWorld = new Vector3();
  const _sunDirLocal = new Vector3();
  const _invMatrix = new Matrix4();

  function getEarthPosition(): Vector3 {
    earthOrbitGroup.getWorldPosition(_earthPos);
    return _earthPos;
  }

  function getSeasonPosition(angle: number): Vector3 {
    const [x, z] = orbitPosition(angle);
    return new Vector3(x, 0, z);
  }

  function update(earthAngle: number, earthRotation: number, tiltRad: number): Vector3 {
    // Position Earth on its orbit
    const [x, z] = orbitPosition(earthAngle);
    earthOrbitGroup.position.set(x, 0, z);

    // Apply axial tilt (fixed direction in world space)
    earthTiltGroup.rotation.z = -tiltRad;

    // Daily rotation — GMST determines which longitude faces which direction
    earthMesh.rotation.y = earthRotation;

    // Compute sun direction in Earth mesh's local (object) space.
    // Sun is at the scene origin; Earth is at (x, 0, z).
    // World-space direction from Earth to Sun:
    _sunDirWorld.set(-x, 0, -z).normalize();

    // Transform into mesh-local space by applying the inverse of the
    // mesh's world rotation (position is irrelevant for directions).
    earthMesh.updateMatrixWorld();
    _invMatrix.copy(earthMesh.matrixWorld).invert();
    _sunDirLocal.copy(_sunDirWorld).transformDirection(_invMatrix);

    return _sunDirLocal;
  }

  function resize(width: number, height: number) {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  function dispose() {
    renderer.dispose();
    sunGeo.dispose();
    sunMat.dispose();
    earthGeo.dispose();
    earthMaterial.dispose();
    orbitGeo.dispose();
    orbitMat.dispose();
    renderer.domElement.remove();
  }

  return {
    scene,
    camera,
    renderer,
    earthMesh,
    earthMaterial,
    earthTiltGroup,
    earthOrbitGroup,
    sunMarker,
    locationMarker,
    grid,
    getEarthPosition,
    getSeasonPosition,
    resize,
    update,
    dispose,
  };
}
