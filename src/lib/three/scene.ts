import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  SphereGeometry,
  Mesh,
  Group,
  TextureLoader,
  type Texture,
  type ShaderMaterial,
} from 'three';
import { createEarthShaderMaterial } from './earthShader.js';
import { createGlobeGrid, type GlobeGrid } from './gridLines.js';
import {
  createCoastlineOverlay,
  createRiverOverlay,
  createLakeOverlay,
  type OverlayGroup,
} from './geoOverlays.js';
import { createSunMarkerGlobe } from './sunMarker.js';
import { createLocationMarkerGlobe } from './locationMarker.js';
import { createPolePins } from './polePins.js';
import earthDayUrl from '../../assets/textures/earth-day.jpg';
import earthNightUrl from '../../assets/textures/earth-night.jpg';

const SPHERE_RADIUS = 1;
const SPHERE_SEGMENTS = 64;
const AXIAL_TILT_DEG = 23.44;
const AXIAL_TILT_RAD = (AXIAL_TILT_DEG * Math.PI) / 180;

export interface GlobeScene {
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  globe: Mesh;
  material: ShaderMaterial;
  tiltGroup: Group;
  spinGroup: Group;
  sunMarker: Mesh;
  locationMarker: Mesh;
  grid: GlobeGrid;
  coastlineOverlay: OverlayGroup;
  riverOverlay: OverlayGroup;
  lakeOverlay: OverlayGroup;
  resize: (width: number, height: number) => void;
  dispose: () => void;
}

/** Load the Natural Earth I raster as a Three.js texture. */
export function loadEarthTexture(): Promise<Texture> {
  return new TextureLoader().loadAsync(earthDayUrl);
}

/** Load the NASA night lights texture. */
export function loadNightTexture(): Promise<Texture> {
  return new TextureLoader().loadAsync(earthNightUrl);
}

export function createGlobeScene(
  container: HTMLElement,
  sharedTexture: Texture,
  nightTexture: Texture,
): GlobeScene {
  const scene = new Scene();

  const camera = new PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 3);

  const renderer = new WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x1a1a2e);
  container.appendChild(renderer.domElement);

  // Tilt group — displays the axial tilt visually.
  const tiltGroup = new Group();
  tiltGroup.rotation.z = -AXIAL_TILT_RAD;
  scene.add(tiltGroup);

  // Spin group — user drags to rotate around Y-axis.
  const spinGroup = new Group();
  tiltGroup.add(spinGroup);

  // Globe with custom day/night shader
  const geometry = new SphereGeometry(SPHERE_RADIUS, SPHERE_SEGMENTS, SPHERE_SEGMENTS);
  const material = createEarthShaderMaterial(sharedTexture, nightTexture);
  const globe = new Mesh(geometry, material);
  spinGroup.add(globe);

  // Lat/lon grid lines + special latitude lines
  const grid = createGlobeGrid();
  spinGroup.add(grid.group);

  // Subsolar point marker — flat mesh with depthTest so it's hidden on the far side
  const sunMarker = createSunMarkerGlobe(0.1);
  spinGroup.add(sunMarker);

  // User location marker — flat mesh with depthTest so it's hidden on the far side
  const locationMarker = createLocationMarkerGlobe(0.08);
  spinGroup.add(locationMarker);

  // Barber-pole pins at north and south poles
  const polePins = createPolePins();
  spinGroup.add(polePins);

  // Geographic overlays (coastlines, rivers, lakes)
  const coastlineOverlay = createCoastlineOverlay('globe');
  const riverOverlay = createRiverOverlay('globe');
  const lakeOverlay = createLakeOverlay('globe');
  spinGroup.add(coastlineOverlay.group);
  spinGroup.add(riverOverlay.group);
  spinGroup.add(lakeOverlay.group);

  function resize(width: number, height: number) {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  function dispose() {
    renderer.dispose();
    geometry.dispose();
    material.dispose();
    renderer.domElement.remove();
  }

  return {
    scene, camera, renderer, globe, material, tiltGroup, spinGroup, sunMarker, locationMarker, grid,
    coastlineOverlay, riverOverlay, lakeOverlay,
    resize, dispose,
  };
}
