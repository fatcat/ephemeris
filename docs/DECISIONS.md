# Decision Log

Decisions made during planning. Reference this when context is needed for why something is the way it is.

## D001 — Rendering: Three.js

**Decision:** Use Three.js for all rendering (both globe and projection).

**Alternatives considered:**
- CesiumJS: purpose-built for globes but heavy (~4MB), opinionated, overkill for non-GIS use
- Babylon.js: comparable to Three.js, slightly smaller community for globe-specific examples
- Raw WebGL: maximum control but enormous effort for no benefit
- D3.js for projection: would require reimplementing terminator shader logic in Canvas 2D

**Rationale:** Three.js is mature, lightweight, well-documented for globe rendering. Using it for both views keeps shader logic unified. One terminator calculation, two renderings.

## D002 — Projection: Equirectangular (not Mercator)

**Decision:** Use equirectangular projection instead of Mercator.

**Rationale:** Mercator distorts polar regions severely. Since the terminator's behavior at high latitudes is most interesting during solstices (the core educational content), Mercator distortion would be misleading. Equirectangular preserves latitude proportions and shows the terminator's seasonal tilt more honestly.

## D003 — Framework: Svelte 5 + TypeScript

**Decision:** Use Svelte 5 (runes mode) with TypeScript.

**Alternatives considered:**
- React: larger runtime, unnecessary for this app's UI complexity
- Vue: middle ground, but Svelte compiles away entirely
- Vanilla JS: possible but harder to maintain component structure and reactivity

**Rationale:** Svelte compiles to vanilla JS (tiny runtime), has clean reactive stores, and produces small bundles. TypeScript gives type safety on astronomical math where bugs are subtle.

## D004 — Solar Algorithm: Meeus Medium Precision

**Decision:** Implement Jean Meeus's medium-precision solar position algorithm.

**Rationale:** Accurate to <0.01° within ±100 years. No server dependency. ~50 lines of math. Time range clamped to ±200 years to stay well within accuracy bounds. Full VSOP87 is overkill for this application.

## D005 — Time Controls: Two Speed Modes

**Decision:** Implement two distinct time acceleration modes.

- **Smooth sweep:** Continuous animation with multipliers (2x, 5x, 10x, 20x, 50x, 100x). Shows Earth's rotation.
- **Day snap:** Discrete 24-hour jumps (1, 2, 4, 7 days per tick at ~1 tick/second). Shows seasonal terminator drift.

**Rationale:** These modes teach fundamentally different things. Smooth sweep shows daily rotation of sunlight. Day snap shows seasonal axial tilt effects — the core pedagogical goal.

## D006 — No Commercial Licenses

**Decision:** All assets (textures, data, code, fonts) must be public domain or permissively licensed (MIT, Apache-2.0, CC0, Unlicense, or equivalent).

**Key sources:**
- Natural Earth: public domain
- NASA imagery: US government work, public domain
- Any textures: must be CC0 or self-created

## D007 — Textbook Aesthetic

**Decision:** Stylized, muted, educational visual style rather than photorealistic.

**Rationale:** Matches educational context. Reduces texture complexity and file size. Avoids the "Google Earth clone" perception. Provides clearer visual distinction between terrain types (desert, forest, mountain, ocean).

## D008 — Limited Zoom

**Decision:** Globe zoom is constrained so the entire sphere is always visible with margin.

**Rationale:** The app is only functional when you can see the full terminator across the globe. Zooming into a region defeats the educational purpose. The projection below provides "flat map" context.

## D009 — PWA: Full Offline

**Decision:** Implement as a full PWA with cache-first strategy. The app works entirely offline after first load.

**Rationale:** Classroom environments may have unreliable connectivity. All computation is client-side (Meeus math). All assets are static. There is no reason to require a server after initial delivery.

## D010 — Target Devices

**Decision:** Support mobile/Chromebook devices ≤2 years old, desktop ≤5 years old, 2GB RAM minimum.

**Rationale:** Matches typical classroom and home device fleet. WebGL is universally available on these devices. 2K textures fit comfortably in GPU memory on 2GB shared-memory systems.

## D011 — Geographic Labels: Minimal by Default

**Decision:** Show continents, oceans, and top 20 rivers by default. Island and country labels are configurable (off by default).

**Rationale:** Geography is for orientation, not the app's focus. Students should be able to tell "that's Africa" but shouldn't be distracted by political boundaries. Configurability allows the instructor to add context if needed.

## D012 — Night Lights: Muted

**Decision:** City lights on the night side are displayed but muted/low-contrast.

**Rationale:** Night lights serve as orientation aids ("that bright area is Europe"). The educational focus is on the terminator and daylight side. Bright night lights would draw attention away from the core content.

## D013 — Reset Animation

**Decision:** "Reset view" animates a smooth 1-2 second rotation back to the default location.

**Rationale:** Instant snapping is disorienting. A brief animation maintains spatial context and is more polished.
