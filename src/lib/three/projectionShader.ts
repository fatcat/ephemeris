/**
 * Custom shader for the flat equirectangular projection.
 *
 * Unlike the globe shader which uses mesh normals, this shader
 * reconstructs the 3D surface normal from UV coordinates to compute
 * the sun angle for day/night shading. Also draws lat/lon grid lines
 * and special latitude lines (equator, tropics, arctic/antarctic circles).
 */

import { ShaderMaterial, type Texture, Vector3 } from 'three';

const vertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  #define PI 3.141592653589793

  uniform sampler2D uDayTexture;
  uniform sampler2D uNightTexture;
  uniform vec3 uSunDirection;
  uniform vec2 uResolution;
  uniform float uHardTerminator;
  uniform float uShowMajorGrid;
  uniform float uShowMinorGrid;
  uniform float uShowEquatorTropics;
  uniform float uShowArcticCircles;
  uniform float uShowNightLights;

  varying vec2 vUv;

  void main() {
    // Reconstruct the 3D surface normal from UV coordinates.
    // SphereGeometry uses UV.y = 1 - v (V=1 at north pole), so we invert:
    //   theta = (1 - UV.y) * pi -> north (UV.y=1) -> theta=0, south (UV.y=0) -> theta=pi
    float phi = vUv.x * 2.0 * PI;
    float theta = (1.0 - vUv.y) * PI;

    vec3 normal = vec3(
      -cos(phi) * sin(theta),
      cos(theta),
      sin(phi) * sin(theta)
    );

    vec3 sunDir = normalize(uSunDirection);
    float sunAngle = dot(normalize(normal), sunDir);

    // Day factor: soft (smooth twilight) or hard (sharp edge)
    float softDay = smoothstep(-0.309, 0.05, sunAngle);
    float hardDay = step(0.0, sunAngle);
    float dayFactor = mix(softDay, hardDay, uHardTerminator);

    vec4 dayColor = texture2D(uDayTexture, vUv);

    // Night side: geography visible + optional city lights
    vec3 nightBase = dayColor.rgb * 0.10;
    vec3 nightLights = texture2D(uNightTexture, vUv).rgb * 0.35 * uShowNightLights;
    vec3 nightColor = nightBase + nightLights;

    vec3 color = mix(nightColor, dayColor.rgb, dayFactor);

    // Dawn/dusk warmth (only in soft mode)
    float twilightFactor = (1.0 - uHardTerminator)
      * smoothstep(-0.309, 0.0, sunAngle)
      * smoothstep(0.15, 0.0, sunAngle);
    color += vec3(0.08, 0.03, 0.0) * twilightFactor;

    // --- Grid lines ---
    // Convert UV to geographic degrees
    // lon: -180 to 180, lat: -90 to 90
    float lon = (vUv.x - 0.5) * 360.0;
    float lat = (vUv.y - 0.5) * 180.0;

    // Pixel-width adaptive threshold (in degrees per pixel)
    float dLon = fwidth(lon);
    float dLat = fwidth(lat);

    // Major lines every 15 degrees
    float majorLon = 1.0 - smoothstep(0.0, dLon * 1.2, abs(mod(lon + 7.5, 15.0) - 7.5));
    float majorLat = 1.0 - smoothstep(0.0, dLat * 1.2, abs(mod(lat + 7.5, 15.0) - 7.5));
    float major = max(majorLon, majorLat);

    // Minor lines every 5 degrees
    float minorLon = 1.0 - smoothstep(0.0, dLon * 1.0, abs(mod(lon + 2.5, 5.0) - 2.5));
    float minorLat = 1.0 - smoothstep(0.0, dLat * 1.0, abs(mod(lat + 2.5, 5.0) - 2.5));
    float minor = max(minorLon, minorLat);

    // Apply grid: major lines brighter than minor
    vec3 majorColor = vec3(0.6, 0.6, 0.7);
    vec3 minorColor = vec3(0.35, 0.35, 0.45);
    float majorAlpha = major * 0.5 * uShowMajorGrid;
    float minorAlpha = minor * 0.25 * uShowMinorGrid;

    // Composite: major takes precedence over minor
    float gridAlpha = max(majorAlpha, minorAlpha);
    vec3 gridColor = majorAlpha > minorAlpha ? majorColor : minorColor;
    color = mix(color, gridColor, gridAlpha);

    // --- Special latitude lines ---

    // Equator + Tropics of Cancer/Capricorn (thicker, warm amber)
    float equatorLine = 1.0 - smoothstep(0.0, dLat * 2.5, abs(lat));
    float tropicCancer = 1.0 - smoothstep(0.0, dLat * 2.5, abs(lat - 23.44));
    float tropicCapricorn = 1.0 - smoothstep(0.0, dLat * 2.5, abs(lat + 23.44));
    float eqTropicAlpha = max(equatorLine, max(tropicCancer, tropicCapricorn)) * 0.8 * uShowEquatorTropics;
    vec3 eqTropicColor = vec3(0.83, 0.64, 0.30);
    color = mix(color, eqTropicColor, eqTropicAlpha);

    // Arctic/Antarctic circles (thicker, cool blue)
    float arcticLine = 1.0 - smoothstep(0.0, dLat * 2.5, abs(lat - 66.56));
    float antarcticLine = 1.0 - smoothstep(0.0, dLat * 2.5, abs(lat + 66.56));
    float arcticAlpha = max(arcticLine, antarcticLine) * 0.8 * uShowArcticCircles;
    vec3 arcticColor = vec3(0.42, 0.64, 0.78);
    color = mix(color, arcticColor, arcticAlpha);

    gl_FragColor = vec4(color, 1.0);
  }
`;

export function createProjectionShaderMaterial(
  dayTexture: Texture,
  nightTexture: Texture,
): ShaderMaterial {
  const uniforms = {
    uDayTexture: { value: dayTexture },
    uNightTexture: { value: nightTexture },
    uSunDirection: { value: new Vector3(0, 0, 1) },
    uResolution: { value: [1024, 512] },
    uHardTerminator: { value: 0.0 },
    uShowMajorGrid: { value: 1.0 },
    uShowMinorGrid: { value: 1.0 },
    uShowEquatorTropics: { value: 1.0 },
    uShowArcticCircles: { value: 1.0 },
    uShowNightLights: { value: 1.0 },
  };

  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
  });
}
