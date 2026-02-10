# Architecture

## System Overview

Ephemeris consists of three main subsystems:

```
┌─────────────────────────────────────────────────┐
│                   Browser                        │
│                                                  │
│  ┌─────────────┐    ┌──────────────────────┐    │
│  │  UI Controls │    │   Settings Panel     │    │
│  │  (Svelte)    │    │   (Svelte)           │    │
│  └──────┬───────┘    └──────────┬───────────┘    │
│         │                       │                │
│         ▼                       ▼                │
│  ┌──────────────────────────────────────────┐    │
│  │         Centralized State (Stores)        │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐  │    │
│  │  │ Time     │ │ Solar    │ │ Settings │  │    │
│  │  │ Store    │ │ Store    │ │ Store    │  │    │
│  │  └──────────┘ └──────────┘ └──────────┘  │    │
│  └──────────────────┬───────────────────────┘    │
│                     │                            │
│         ┌───────────┴───────────┐                │
│         ▼                       ▼                │
│  ┌─────────────┐    ┌──────────────────────┐    │
│  │  3D Globe   │    │  Equirectangular     │    │
│  │  (Three.js) │    │  Projection          │    │
│  │  Scene      │    │  (Three.js Scene)    │    │
│  └─────────────┘    └──────────────────────┘    │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │         Service Worker (PWA)              │    │
│  └──────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

## Rendering Architecture

### Two-Scene Approach

Both the 3D globe and the 2D equirectangular projection are rendered using Three.js. This is intentional:

- **Shared shader logic:** The terminator/twilight calculations live in GLSL shaders that both scenes use. Writing this once avoids divergence between the two views.
- **Shared uniforms:** Both scenes receive the same `sunDirection` vec3 uniform, computed from the solar position store. Synchronization is automatic.
- **Consistent rendering pipeline:** Same texture loading, same material system, same animation loop.

### Globe Scene

- `SphereGeometry` with Earth texture mapped via equirectangular UV
- Custom `ShaderMaterial` for day/night + twilight gradient
- `OrbitControls` with zoom clamped (min/max distance set so full globe is always visible)
- Labels rendered as HTML overlays (CSS2DRenderer) or sprite geometry

### Projection Scene

- `PlaneGeometry` with equirectangular Earth texture
- Same custom shader as globe (adapted for flat UV coordinates)
- No camera controls (static orthographic camera)
- Labels as HTML overlays

### Shader Design

The core shader computes illumination from a single `sunDirection` uniform:

```glsl
// Pseudocode
uniform vec3 sunDirection;  // normalized, in world space

// For each fragment:
float sunAngle = dot(normalize(surfaceNormal), sunDirection);

// Hard terminator at sunAngle = 0
// Civil twilight:       sunAngle in [-0.105, 0]  (~6°)
// Nautical twilight:    sunAngle in [-0.208, -0.105] (~12°)
// Astronomical twilight: sunAngle in [-0.309, -0.208] (~18°)

float daylight = smoothstep(-0.309, 0.0, sunAngle);
vec3 color = mix(nightColor, dayColor, daylight);
```

## Solar Position Calculation

Based on Jean Meeus, "Astronomical Algorithms" (medium precision):

```
Input:  Date/Time (UTC)
  → Julian Day Number
  → Centuries from J2000.0
  → Solar mean longitude, mean anomaly
  → Equation of center (3 terms)
  → Ecliptic longitude
  → Obliquity of ecliptic (time-varying + nutation)
  → Solar declination and right ascension
Output: Sun direction vector (vec3) for shader uniform
```

All pure math. No network calls. No lookup tables. ~50 lines of TypeScript.

Accuracy: < 0.01° within ±100 years of J2000.0. Time range clamped to ±200 years.

## State Management

### Time Store
- `currentTime`: Date object (or Julian Day for calculations)
- `playbackMode`: `'realtime' | 'smooth' | 'snap'`
- `playbackSpeed`: multiplier for smooth mode (1x, 2x, 5x, 10x, 20x, 50x, 100x)
- `snapInterval`: days per tick for snap mode (1, 2, 4, 7)
- `isPlaying`: boolean

### Solar Store (derived from Time Store)
- `sunDirection`: vec3 — passed to shaders as uniform
- `sunDeclination`: degrees — displayed in info panel
- `sunRightAscension`: degrees — displayed in info panel

### Settings Store (persisted to localStorage)
- `hardTerminator`: boolean — sharp vs soft terminator edge
- `showMinorGrid`: boolean — 5° lat/lon grid lines
- `showMajorGrid`: boolean — 15° lat/lon grid lines
- `showEquatorTropics`: boolean — equator + tropics of Cancer/Capricorn
- `showArcticCircles`: boolean — arctic + antarctic circles
- `showSubsolarPoint`: boolean — subsolar point marker
- `viewMode`: 'globe' | 'projection' | 'both'

## PWA Strategy

- **Cache-first** for all static assets (JS, CSS, textures, geographic data)
- **Network-first** for the HTML shell (to receive updates)
- Vite's `vite-plugin-pwa` with `workbox-webpack-plugin` generates the service worker
- Total cacheable payload target: < 10MB (JS ~200KB, textures ~5MB, geo data ~1MB)
- Install prompt offered after first successful load

## Performance Budget

| Metric | Target |
|--------|--------|
| Initial load (cached) | < 2 seconds |
| Texture memory (GPU) | < 64MB |
| JS bundle (gzipped) | < 300KB |
| 60fps on target devices | Required for globe rotation |
| 30fps acceptable | During time acceleration |
| RAM usage | < 150MB total |

## Geographic Data Pipeline

Source: Natural Earth (public domain)

| Dataset | Scale | Use |
|---------|-------|-----|
| Coastlines | 1:110m | Continental outlines |
| Land | 1:110m | Land mass fill |
| Rivers + lakes | 1:110m | Top 20 rivers |
| Geographic labels | 1:110m | Continent, ocean names |
| Graticules | 1:110m | Optional lat/lon grid |

Data is converted from Shapefile/GeoJSON to a compact format at build time and baked into the JS bundle or loaded as small static assets.

## Texture Strategy

- **Day texture:** Stylized/textbook Earth (2048x1024), showing terrain types (desert=sandy, forest=muted green, mountains=ridge shading), continental outlines
- **Night texture:** Muted city lights (2048x1024), low contrast
- **Bump map:** Subtle topography for mountain ranges (2048x1024)
- All textures are equirectangular projection
- Compressed as WebP with PNG fallback
- Total texture payload: ~5MB
