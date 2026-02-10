import {
  Scene,
  OrthographicCamera,
  WebGLRenderer,
  PlaneGeometry,
  Mesh,
  type ShaderMaterial,
  type Texture,
} from 'three';
import { createProjectionShaderMaterial } from './projectionShader.js';
import {
  createCoastlineOverlay,
  createRiverOverlay,
  createLakeOverlay,
  type OverlayGroup,
} from './geoOverlays.js';
import { createSunMarker } from './sunMarker.js';
import { createLocationMarker } from './locationMarker.js';

const PLANE_WIDTH = 2;
const PLANE_HEIGHT = 1; // 2:1 aspect ratio (equirectangular)

export interface CanvasRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ProjectionScene {
  scene: Scene;
  camera: OrthographicCamera;
  renderer: WebGLRenderer;
  material: ShaderMaterial;
  sunMarker: import('three').Sprite;
  locationMarker: import('three').Sprite;
  coastlineOverlay: OverlayGroup;
  riverOverlay: OverlayGroup;
  lakeOverlay: OverlayGroup;
  /** The canvas position/size within the container (updated on resize). */
  canvasRect: CanvasRect;
  resize: (width: number, height: number) => void;
  dispose: () => void;
}

export function createProjectionScene(
  container: HTMLElement,
  dayTexture: Texture,
  nightTexture: Texture,
): ProjectionScene {
  const scene = new Scene();

  const camera = new OrthographicCamera(
    -PLANE_WIDTH / 2,
    PLANE_WIDTH / 2,
    PLANE_HEIGHT / 2,
    -PLANE_HEIGHT / 2,
    0.1,
    10,
  );
  camera.position.set(0, 0, 1);
  camera.lookAt(0, 0, 0);

  const renderer = new WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x1a1a2e);
  container.appendChild(renderer.domElement);

  // Flat projection plane
  const geometry = new PlaneGeometry(PLANE_WIDTH, PLANE_HEIGHT);
  const material = createProjectionShaderMaterial(dayTexture, nightTexture);
  const plane = new Mesh(geometry, material);
  scene.add(plane);

  // Subsolar point marker
  const sunMarker = createSunMarker(0.06);
  scene.add(sunMarker);

  // User location marker
  const locationMarker = createLocationMarker(0.05);
  scene.add(locationMarker);

  // Geographic overlays
  const coastlineOverlay = createCoastlineOverlay('projection');
  const riverOverlay = createRiverOverlay('projection');
  const lakeOverlay = createLakeOverlay('projection');
  scene.add(coastlineOverlay.group);
  scene.add(riverOverlay.group);
  scene.add(lakeOverlay.group);

  const canvasRect: CanvasRect = { left: 0, top: 0, width: 0, height: 0 };

  function resize(width: number, height: number) {
    const containerAspect = width / height;
    const planeAspect = PLANE_WIDTH / PLANE_HEIGHT;

    let renderWidth: number;
    let renderHeight: number;

    if (containerAspect > planeAspect) {
      renderHeight = height;
      renderWidth = height * planeAspect;
    } else {
      renderWidth = width;
      renderHeight = width / planeAspect;
    }

    renderer.setSize(renderWidth, renderHeight);

    const left = (width - renderWidth) / 2;
    const top = (height - renderHeight) / 2;
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.left = `${left}px`;
    renderer.domElement.style.top = `${top}px`;

    // Expose canvas rect for label overlays
    canvasRect.left = left;
    canvasRect.top = top;
    canvasRect.width = renderWidth;
    canvasRect.height = renderHeight;
  }

  function dispose() {
    renderer.dispose();
    geometry.dispose();
    material.dispose();
    renderer.domElement.remove();
  }

  return {
    scene, camera, renderer, material, sunMarker, locationMarker,
    coastlineOverlay, riverOverlay, lakeOverlay,
    canvasRect, resize, dispose,
  };
}
