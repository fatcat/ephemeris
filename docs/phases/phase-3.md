# Phase 3 — Equirectangular Projection (Synchronized)

## Goal

Add a flat equirectangular map projection below the globe, sharing the same Earth texture and day/night shader. Both views update from the same time state, so the terminator is always in sync between the globe and the projection.

## Context

Phase 2 is complete. The globe shows a day/night terminator with twilight that moves in real time. A time store drives the sun direction uniform. The current UTC time is displayed.

## Implementation Prompt

> You are implementing Phase 3 of the Ephemeris project. Read `CLAUDE.md` for project context and `docs/ARCHITECTURE.md` for the two-scene rendering architecture.
>
> **Your task:** Add a flat equirectangular projection below the globe, synchronized with the same day/night terminator.
>
> ### Step-by-step:
>
> 1. **Projection component (`src/lib/components/Projection.svelte`):**
>    - Create a new Svelte component that renders a second Three.js scene
>    - Use an `OrthographicCamera` looking straight down at a `PlaneGeometry`
>    - The plane has the same Earth texture mapped to it
>    - The plane uses aspect ratio 2:1 (equirectangular: 360° wide, 180° tall)
>    - No camera controls — this view is static (no rotation, no zoom, no pan)
>
> 2. **Projection shader (`src/lib/three/projectionShader.ts`):**
>
>    Adapt the globe's day/night shader for the flat projection:
>
>    - The globe shader uses world-space normals to compute sun angle
>    - The projection shader must **reconstruct** the surface normal from UV coordinates:
>      ```glsl
>      // UV (0,0) = bottom-left, (1,1) = top-right
>      // Map UV to longitude [-π, π] and latitude [-π/2, π/2]
>      float lon = (uv.x - 0.5) * 2.0 * PI;
>      float lat = (uv.y - 0.5) * PI;
>
>      // Reconstruct the 3D surface normal for this lat/lon
>      vec3 normal = vec3(
>        cos(lat) * cos(lon),
>        sin(lat),
>        cos(lat) * sin(lon)
>      );
>
>      // Then compute sunAngle = dot(normal, uSunDirection) as before
>      ```
>    - Use the same twilight smoothstep logic as the globe shader
>    - Share the same `uSunDirection` uniform (read from the same time store)
>
> 3. **Layout:**
>    - The app layout should be: header → globe (top) → projection (bottom) → status bar
>    - The globe occupies roughly the top 55-60% of the content area
>    - The projection occupies the remaining space below
>    - Both should scale responsively to the viewport
>    - The projection should maintain its 2:1 aspect ratio and be centered horizontally
>    - Add a thin visual separator between globe and projection (subtle line or gap)
>
> 4. **Synchronization:**
>    - Both the globe and projection read `sunDirection` from the same time store
>    - Both update their shader uniforms in the same animation frame
>    - They MUST always show the same terminator position
>    - Use a single `requestAnimationFrame` loop that updates both scenes
>
> 5. **Rendering optimization:**
>    - Both scenes can share the same texture (load once, use twice)
>    - Use a single animation loop function that renders both scenes
>    - Each scene has its own renderer and canvas element
>
> ### Important constraints:
> - Do NOT implement time controls — that is Phase 4
> - Do NOT add labels or geographic overlays — that is Phase 5
> - The projection view should NOT be interactive (no pan/zoom/drag)
> - Keep the same dark background and visual style from Phase 1
>
> ### Verifying synchronization:
> - The lit/dark areas on the projection should exactly correspond to the globe
> - Rotating the globe should NOT affect the projection (they are independent views of the same data)
> - As real time passes, both the globe and projection terminator should move together

## Files to Create/Modify

```
src/lib/components/
  Projection.svelte        (new: equirectangular projection view)
src/lib/three/
  projectionShader.ts      (new: flat projection day/night shader)
  projectionScene.ts       (new: Three.js scene for the projection)
src/App.svelte             (modify: add Projection below Globe, shared animation loop)
src/app.css                (modify: layout for globe + projection stacking)
```

## Acceptance Criteria

- [ ] A flat equirectangular map is visible below the globe
- [ ] The projection shows the same Earth texture as the globe
- [ ] The projection shows day/night shading with the same terminator as the globe
- [ ] The terminator on the projection matches the globe exactly (same position)
- [ ] The projection has graduated twilight (same as globe)
- [ ] The projection maintains a 2:1 aspect ratio
- [ ] The projection is NOT interactive (no drag/zoom)
- [ ] Both views update as real time passes
- [ ] Rotating the globe does NOT affect the projection
- [ ] The layout is responsive — both views scale with the viewport
- [ ] `npm run build` passes
- [ ] `npm run check` passes

## Phase Completion Checklist

- [ ] All acceptance criteria met
- [ ] Synchronization verified (terminator matches between views)
- [ ] Tested at various window sizes
- [ ] `npm run build` passes
- [ ] `npm run check` passes
- [ ] Tested in browser
- [ ] Phase status updated in `docs/phases/README.md`
- [ ] Current phase updated in `CLAUDE.md`
- [ ] Changes committed: `phase 3 complete: synchronized equirectangular projection`
