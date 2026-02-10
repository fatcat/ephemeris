# Phase 1 — Scaffold & Spinning Globe

## Goal

Set up the project infrastructure and render a textured 3D Earth globe that the user can rotate by dragging. The globe should be responsive to window size and always fully visible. This phase establishes the foundation everything else builds on.

## Context

This is the first phase. The project directory contains only documentation (`CLAUDE.md`, `docs/`). No code exists yet.

## Implementation Prompt

> You are implementing Phase 1 of the Ephemeris project. Read `CLAUDE.md` for project context and `docs/ARCHITECTURE.md` for technical architecture.
>
> **Your task:** Set up the project from scratch and render a spinning 3D Earth globe in the browser.
>
> ### Step-by-step:
>
> 1. **Initialize the project:**
>    - Create a Vite + Svelte + TypeScript project in the current directory (do NOT create a subdirectory — scaffold into the existing root)
>    - Use Svelte 5 with runes mode
>    - Install dependencies: `three`, `@types/three`, `vite-plugin-pwa`
>    - Configure TypeScript in strict mode
>    - Set up the file structure as documented in CLAUDE.md
>
> 2. **Create the globe component:**
>    - Create a Svelte component (`Globe.svelte`) that initializes a Three.js scene
>    - Use a `SphereGeometry` (segments: 64x64) with a placeholder Earth texture
>    - For the placeholder texture: use a procedurally generated texture OR download a public domain equirectangular Earth texture from Natural Earth / NASA. If downloading, use a low-resolution version (~2K). The texture MUST be public domain or CC0.
>    - Add `OrbitControls` for mouse/touch rotation
>    - **Clamp zoom** so the globe is always fully visible with ~10% margin. Set `minDistance` and `maxDistance` on OrbitControls to enforce this. Disable zoom entirely if clamping is complex — we can refine later.
>    - Enable damping on OrbitControls for smooth feel
>    - The globe should slowly auto-rotate when not being interacted with (very slow, ~0.1 RPM)
>
> 3. **Responsive layout:**
>    - The globe should occupy the top ~60% of the viewport height
>    - Below it, leave empty space (placeholder for the projection in Phase 3)
>    - Use a `ResizeObserver` on the container to update the Three.js renderer and camera aspect ratio on resize
>    - The globe should be centered horizontally with margin
>
> 4. **App shell:**
>    - `App.svelte` should render the Globe component and a simple header with the app name "Ephemeris"
>    - Style with clean, minimal CSS — dark background (#1a1a2e or similar dark blue), light text
>    - Add a small footer or status bar area at the bottom (placeholder for time display)
>
> 5. **PWA skeleton:**
>    - Configure `vite-plugin-pwa` with basic settings (app name, icons can be placeholder)
>    - Generate a basic `manifest.json`
>    - The service worker should cache static assets
>    - This does NOT need to be fully functional yet — just the skeleton
>
> 6. **Dev tooling:**
>    - Add an npm `lint` script (use eslint with svelte and typescript plugins)
>    - Add `npm run check` for svelte-check
>    - Ensure `npm run build` produces a working production build
>
> ### Important constraints:
> - Do NOT implement day/night shading — that is Phase 2
> - Do NOT implement the projection view — that is Phase 3
> - Do NOT implement time controls — that is Phase 4
> - The globe should just show a lit, textured sphere. Basic Three.js directional light is fine for now.
> - All lighting/shading will be replaced by custom shaders in Phase 2
>
> ### Texture note:
> If you cannot download a texture at build time, create a procedural texture using Canvas 2D that shows:
> - Blue ocean
> - Green/brown land masses (approximate continental shapes)
> - This is a placeholder — it will be replaced with proper textures in Phase 5

## Files to Create

```
package.json
tsconfig.json
tsconfig.node.json (if needed by Vite)
vite.config.ts
svelte.config.js
eslint.config.js
src/
  main.ts
  app.html
  App.svelte
  app.css (global styles)
  lib/
    components/
      Globe.svelte
    three/
      scene.ts          (Three.js scene setup, renderer, camera)
      controls.ts       (OrbitControls configuration)
    types/
      index.ts          (shared type definitions)
static/
  favicon.svg (or .png — simple placeholder)
```

## Acceptance Criteria

- [ ] `npm install` completes without errors
- [ ] `npm run dev` starts a dev server and the app loads in the browser
- [ ] A textured sphere (Earth) is visible, centered in the upper portion of the viewport
- [ ] The globe can be rotated by clicking/touching and dragging
- [ ] The globe cannot be zoomed to a point where it's not fully visible
- [ ] The globe auto-rotates slowly when not being interacted with
- [ ] Resizing the browser window causes the globe to resize proportionally
- [ ] `npm run build` produces a production build without errors
- [ ] `npm run check` passes without errors
- [ ] The app name "Ephemeris" is visible in the header
- [ ] Background is dark (dark blue/navy)
- [ ] Works in Chrome, Firefox, and Safari

## Phase Completion Checklist

- [ ] All acceptance criteria met
- [ ] `npm run build` passes
- [ ] `npm run check` passes
- [ ] Tested in browser
- [ ] Phase status updated in `docs/phases/README.md`
- [ ] Current phase updated in `CLAUDE.md`
- [ ] Changes committed: `phase 1 complete: scaffold and spinning globe`
