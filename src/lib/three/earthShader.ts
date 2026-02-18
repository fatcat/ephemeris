/**
 * Custom ShaderMaterial for day/night terminator with twilight zones.
 *
 * The shader takes a sun direction uniform and computes illumination
 * per fragment using the dot product of the surface normal with the
 * sun direction. Twilight zones (civil, nautical, astronomical) are
 * rendered as a smooth gradient.
 *
 * Uses object-space normals so lighting stays correct regardless of
 * the globe's visual tilt (23.44° axial tilt).
 */

import {
  ShaderMaterial,
  type Texture,
  Vector3,
} from 'three';

const vertexShader = /* glsl */ `
  varying vec3 vObjNormal;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    // Use object-space normal — sun direction is in geographic frame,
    // so we need the normal in the same frame regardless of parent tilt.
    vObjNormal = normalize(normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uDayTexture;
  uniform sampler2D uNightTexture;
  uniform vec3 uSunDirection;
  uniform float uHardTerminator;
  uniform float uShowNightLights;
  uniform float uMapBrightness;

  varying vec3 vObjNormal;
  varying vec2 vUv;

  void main() {
    vec3 n = normalize(vObjNormal);
    vec3 sunDir = normalize(uSunDirection);

    // Sun angle: 1.0 = directly facing sun, -1.0 = directly away
    float sunAngle = dot(n, sunDir);

    // Day factor: soft (narrow twilight band) or hard (anti-aliased sharp edge)
    float softDay = smoothstep(-0.15, 0.01, sunAngle);
    // Use fwidth() for a crisp but anti-aliased 1-pixel-wide transition
    float fw = fwidth(sunAngle);
    float hardDay = smoothstep(-fw, fw, sunAngle);
    float dayFactor = mix(softDay, hardDay, uHardTerminator);

    // Sample the day texture (neutral brightness adjustment for theme)
    vec4 dayColor = texture2D(uDayTexture, vUv);
    dayColor.rgb *= uMapBrightness;

    // Night side: geography visible + optional city lights
    vec3 nightBase = dayColor.rgb * 0.10;
    vec3 nightLights = texture2D(uNightTexture, vUv).rgb * 0.35 * uShowNightLights;
    vec3 nightColor = nightBase + nightLights;

    // Blend between night and day
    vec3 color = mix(nightColor, dayColor.rgb, dayFactor);

    // Warm tint in the twilight zone (only in soft mode).
    // Centered in the dim part of the transition where dayFactor is low,
    // blended (not added) so it never brightens beyond the day side.
    float twilightFactor = (1.0 - uHardTerminator)
      * smoothstep(-0.15, -0.07, sunAngle)
      * smoothstep(0.01, -0.07, sunAngle);
    vec3 warmTint = mix(color, color + vec3(0.08, 0.03, 0.0), twilightFactor);
    color = mix(color, warmTint, 1.0 - dayFactor);

    gl_FragColor = vec4(color, 1.0);
  }
`;

export function createEarthShaderMaterial(
  dayTexture: Texture,
  nightTexture: Texture,
): ShaderMaterial {
  const uniforms = {
    uDayTexture: { value: dayTexture },
    uNightTexture: { value: nightTexture },
    uSunDirection: { value: new Vector3(0, 0, 1) },
    uHardTerminator: { value: 0.0 },
    uShowNightLights: { value: 1.0 },
    uMapBrightness: { value: 1.0 },
  };

  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
  });
}
