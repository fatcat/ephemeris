# Phase 7 — Polish, Performance & PWA

## Goal

Final quality pass: UI styling, touch optimization, performance profiling on target devices, full PWA hardening, accessibility, and overall polish. The app should feel finished, professional, and work reliably offline.

## Context

Phase 6 is complete. All core features are implemented: globe, projection, day/night shading, time controls, geography, labels, location, sun data, and night lights. The app is functionally complete but may have rough edges in styling, performance, and offline behavior.

## Implementation Prompt

> You are implementing Phase 7 (final phase) of the Ephemeris project. Read `CLAUDE.md` for project context and `docs/ARCHITECTURE.md` for performance budgets.
>
> **Your task:** Polish the UI, optimize performance, harden the PWA, and ensure accessibility. This is the quality pass that makes the app feel finished.
>
> ### Step-by-step:
>
> 1. **UI styling pass:**
>
>    Review and refine all visual elements:
>    - **Consistent spacing and alignment** across all components
>    - **Typography:** Choose a clean, readable font. Consider:
>      - System font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', ...`) for zero download cost
>      - Or a single web font (e.g., Inter, Nunito — both have permissive licenses) for more polish
>    - **Color palette:** Ensure consistent dark theme throughout
>      - Background: dark navy (#1a1a2e or similar)
>      - Surface/card: slightly lighter (#16213e)
>      - Text: light gray (#e0e0e0)
>      - Accent: warm gold/amber for interactive elements
>      - Ensure sufficient contrast ratios (WCAG AA minimum: 4.5:1 for text)
>    - **Controls:** Buttons should have clear hover/active states, focus rings
>    - **Labels:** Ensure geographic labels don't overlap or clutter at any viewport size
>    - **Transitions:** Smooth transitions on panel open/close, mode switches
>    - Overall aesthetic: "polished educational tool" — not a toy, not a scientific instrument
>
> 2. **Touch and mobile optimization:**
>
>    - Test globe interaction on touch devices:
>      - Single-finger drag to rotate
>      - Pinch should be blocked or heavily clamped (no zoom past full-globe)
>      - No accidental page scroll when interacting with the globe
>    - Control bar buttons should be touch-friendly (min 44x44px tap targets)
>    - On narrow viewports (< 600px):
>      - Stack controls vertically if needed
>      - Consider collapsing the sun data panel behind a toggle
>      - Labels may need to be smaller or sparser
>    - On very wide viewports (> 1400px):
>      - Consider side-by-side layout (globe left, projection right) instead of stacked
>      - Or keep stacked but cap maximum width
>    - Test on actual mobile browsers if possible (iOS Safari, Chrome Android)
>
> 3. **Performance optimization:**
>
>    Profile against the performance budget in `docs/ARCHITECTURE.md`:
>
>    | Metric | Target |
>    |--------|--------|
>    | Initial load (cached) | < 2 seconds |
>    | JS bundle (gzipped) | < 300KB |
>    | Texture memory | < 64MB |
>    | Globe interaction | 60fps |
>    | During time acceleration | 30fps minimum |
>    | Total RAM | < 150MB |
>
>    Optimization areas:
>    - **Texture compression:** Ensure textures are WebP with PNG fallback. Consider generating multiple resolutions (1K for mobile, 2K for desktop) and loading based on device capability using `window.devicePixelRatio` or GPU detection.
>    - **Bundle splitting:** Lazy-load the settings panel and date picker (not needed at first paint)
>    - **Shader optimization:** Minimize texture lookups per fragment. Pre-compute what you can on the CPU.
>    - **Geographic overlays:** Ensure line geometry is created once and reused, not recreated each frame
>    - **Label rendering:** If using CSS2DRenderer, limit the number of visible labels. Cull labels on the far side of the globe.
>    - **Animation loop:** Only render when something changes (dirty flag). If the app is idle and in real-time mode, render at most once per second (the terminator barely moves).
>    - **Tree shaking:** Ensure Three.js is tree-shaken (import only what's used, NOT `import * as THREE`)
>
> 4. **PWA hardening:**
>
>    - **Service worker:** Ensure `vite-plugin-pwa` generates a proper service worker with:
>      - Cache-first strategy for all static assets (JS, CSS, textures, geo data)
>      - Network-first for the HTML shell (to receive updates)
>      - Proper cache versioning (updates invalidate old caches)
>    - **Offline verification:** Disconnect from network (DevTools → Network → Offline) and verify:
>      - App loads fully from cache
>      - All textures display
>      - All features work (time controls, labels, sun data)
>      - The only thing that can't work offline is... nothing. Everything should work.
>    - **Install prompt:** The app should be installable as a PWA. Verify the install prompt appears in supported browsers.
>    - **App icons:** Create proper PWA icons (at minimum: 192x192, 512x512). Can be simple — the app name "Ephemeris" with a sun/earth motif, or just a stylized globe.
>    - **Manifest:** Ensure `manifest.json` has:
>      - `name`: "Ephemeris"
>      - `short_name`: "Ephemeris"
>      - `description`: appropriate description
>      - `theme_color` and `background_color` matching the app's dark theme
>      - `display`: "standalone"
>      - `orientation`: "any"
>
> 5. **Accessibility:**
>
>    - **Keyboard navigation:** All controls (play/pause, speed, presets, settings) should be reachable via Tab and activatable via Enter/Space
>    - **Focus indicators:** Clear, visible focus rings on all interactive elements
>    - **ARIA labels:** All buttons and controls should have descriptive `aria-label` attributes
>    - **Screen reader:** The time display and sun data should be in live regions (`aria-live="polite"`) so changes are announced
>    - **Reduced motion:** Respect `prefers-reduced-motion`:
>      - Disable auto-rotation
>      - Make reset-view animation instant instead of smooth
>      - Reduce or eliminate UI transitions
>    - **Color:** Ensure the day/night distinction doesn't rely solely on color (it doesn't — the terminator gradient provides spatial context)
>
> 6. **Error handling and edge cases:**
>
>    - WebGL not available: Show a clear error message ("This app requires WebGL. Please use a modern browser.")
>    - Texture load failure: Show the globe with a solid color and a warning
>    - localStorage not available: Fall back to in-memory settings (no persistence)
>    - Invalid location input: Validate and show inline errors
>    - Window resize during animation: Handle gracefully
>
> 7. **Final review:**
>
>    - Remove any TODO comments, console.log statements, or debug code
>    - Ensure all TypeScript types are correct (no `any` escapes)
>    - Run `npm run check` and `npm run build` — both must pass cleanly
>    - Test complete user flow: load → rotate globe → change time → jump to solstice → enter location → reset view → toggle settings → check sun data → go offline → reload
>
> ### Important constraints:
> - Do NOT add new features — this phase is about polish and quality
> - Do NOT change the core architecture or shader logic (unless fixing bugs)
> - Performance optimizations should not change behavior
> - Accessibility should not change visual appearance for sighted users

## Files to Modify

```
(No new files expected — this phase modifies existing files across the project)

Likely modifications:
  src/app.css                   (styling pass)
  src/App.svelte                (layout refinements, error handling)
  src/lib/components/*.svelte   (all: styling, accessibility, touch, responsive)
  src/lib/three/scene.ts        (performance: dirty rendering, texture resolution)
  src/lib/three/earthShader.ts  (performance: shader optimization)
  vite.config.ts                (PWA configuration, build optimization)
  static/                       (PWA icons, manifest refinement)
```

## Acceptance Criteria

- [ ] UI looks polished and consistent (no rough edges, alignment issues, or jarring elements)
- [ ] All controls are usable via touch on mobile devices
- [ ] Tap targets are at least 44x44px
- [ ] Layout adapts well to mobile (< 600px), tablet (600-1024px), and desktop (> 1024px)
- [ ] Globe renders at 60fps during interaction on target devices
- [ ] JS bundle (gzipped) is under 300KB
- [ ] App loads in under 2 seconds from cache
- [ ] App works fully offline after initial load
- [ ] App is installable as a PWA
- [ ] PWA icons are present and display correctly
- [ ] All controls are keyboard-navigable
- [ ] ARIA labels are present on all interactive elements
- [ ] `prefers-reduced-motion` is respected
- [ ] WebGL unavailability shows a clear error message
- [ ] No console errors or warnings in production build
- [ ] No `any` types in TypeScript
- [ ] No TODO comments or debug code remaining
- [ ] `npm run build` passes
- [ ] `npm run check` passes

## Phase Completion Checklist

- [ ] All acceptance criteria met
- [ ] Tested on mobile device or emulator
- [ ] Tested offline mode
- [ ] Tested keyboard-only navigation
- [ ] Performance profiled (Chrome DevTools → Performance tab)
- [ ] `npm run build` passes
- [ ] `npm run check` passes
- [ ] Tested complete user flow in browser
- [ ] Phase status updated in `docs/phases/README.md`
- [ ] Current phase updated in `CLAUDE.md`
- [ ] Changes committed: `phase 7 complete: polish, performance, and PWA hardening`
- [ ] 🎉 Project complete!
