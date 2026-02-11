/**
 * Small barber-pole pins at the north and south poles.
 *
 * Each pole is a thin cylinder with a spiral red-and-white stripe
 * pattern rendered via a custom shader. They stick slightly out of
 * the globe surface.
 */

import {
  CylinderGeometry,
  Group,
  Mesh,
  ShaderMaterial,
} from 'three';

const POLE_RADIUS = 0.012;
const POLE_LENGTH = 0.18;
const RADIAL_SEGMENTS = 12;
const HEIGHT_SEGMENTS = 1;

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  #define PI 3.141592653589793

  varying vec2 vUv;

  void main() {
    // Spiral stripe pattern: rotate UV.x by UV.y to create helix
    float stripes = 6.0;  // number of stripe pairs along the length
    float twist = 2.0;    // how many full twists along the pole
    float angle = vUv.x * 2.0 * PI + vUv.y * twist * 2.0 * PI;
    float pattern = smoothstep(0.45, 0.5, fract(vUv.y * stripes + vUv.x * twist));

    vec3 red = vec3(0.85, 0.15, 0.15);
    vec3 white = vec3(0.95, 0.95, 0.95);
    vec3 color = mix(red, white, pattern);

    gl_FragColor = vec4(color, 1.0);
  }
`;

function createBarberPoleMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
  });
}

/** Create barber-pole pins at both poles. Returns a Group to add to the spinGroup. */
export function createPolePins(): Group {
  const group = new Group();

  const geometry = new CylinderGeometry(
    POLE_RADIUS, POLE_RADIUS, POLE_LENGTH,
    RADIAL_SEGMENTS, HEIGHT_SEGMENTS, false,
  );

  // North pole — cylinder sticks up from the surface
  const northMat = createBarberPoleMaterial();
  const northPole = new Mesh(geometry, northMat);
  // Position so the bottom of the cylinder sits at the globe surface (y = 1.0)
  northPole.position.set(0, 1.0 + POLE_LENGTH / 2, 0);
  group.add(northPole);

  // South pole — cylinder sticks down from the surface
  const southMat = createBarberPoleMaterial();
  const southPole = new Mesh(geometry, southMat);
  southPole.position.set(0, -(1.0 + POLE_LENGTH / 2), 0);
  group.add(southPole);

  return group;
}
