# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

**Ephemeris** is an educational web app that renders a 3D globe and synchronized equirectangular projection showing Earth's day/night terminator as determined by the sun's position for a given date and time. The primary goal is helping children (ages 8+) understand why Earth has seasons. It is instructor-led.

The app runs as a Progressive Web App — connection to a server is required only once; it runs locally thereafter.

## Current Phase

> **All phases complete.** The project is finished.
>
> See `docs/phases/README.md` for overall phase status.

## Tech Stack

- **Language:** TypeScript (strict mode)
- **Framework:** Svelte 5 (runes mode)
- **3D Rendering:** Three.js (WebGL)
- **Bundler:** Vite 6+ with `vite-plugin-pwa`
- **Styling:** CSS (no CSS framework; clean, custom styles)
- **Data:** Natural Earth public domain vector/raster data
- **Solar math:** Jean Meeus algorithms (medium precision, ±200 year range)

## Build & Run Commands

```bash
npm install          # install dependencies
npm run dev          # start dev server with HMR
npm run build        # production build
npm run preview      # preview production build locally
npm run lint         # run linter
npm run check        # svelte-check (type checking)
```

## Architecture

See `docs/ARCHITECTURE.md` for full details. Key points:

- **Two Three.js scenes** share solar position state: one for the 3D globe, one for the flat equirectangular projection
- **Solar position** is computed via pure math (Meeus algorithms) — no API calls, no server dependency
- **Time state** is centralized in a Svelte store; both views and all controls read from it
- **Settings** (location, preferences) persist in `localStorage`
- Textures are 2K resolution (textbook/stylized aesthetic, not photorealistic)
- All geographic data is public domain (Natural Earth)

## Key Conventions

- **No commercial or restrictively-licensed assets.** All textures, data, and code must be public domain or permissively licensed (MIT, Apache-2.0, CC0, or equivalent).
- **Minimal dependencies.** Don't add libraries for things that can be done in a few lines of code.
- **Mobile-first responsive design.** Target floor: 2-year-old mobile/Chromebook, 5-year-old desktop, 2GB RAM.
- **Textbook aesthetic.** Muted, clean, educational — not photorealistic, not childish.
- **Phase discipline.** Each phase should produce a working, visually verifiable artifact. Do not implement features from later phases.
- **Accessibility.** Keyboard navigation for all controls, ARIA labels, sufficient contrast.

## File Structure (Target)

```
src/
  lib/
    components/     # Svelte components (Globe, Projection, Controls, etc.)
    three/          # Three.js scene setup, materials, shaders
    astronomy/      # Solar position, terminator, ephemeris calculations
    stores/         # Svelte stores (time, settings, solar state)
    types/          # TypeScript type definitions
    utils/          # General utilities
  assets/           # Textures, geographic data files
  app.html          # HTML template
  App.svelte        # Root component
  main.ts           # Entry point
static/             # PWA icons, manifest assets
docs/               # Planning and architecture documentation
```

## Important Constraints

- Time range is clamped to ±200 years from present
- Globe zoom is limited — the full globe must always be visible with margin
- No country or sub-country political boundaries (continents only)
- Island and country labels are user-configurable (off by default)
- No cloud cover
- Night-side city lights are muted/subtle (orientation aid only)
