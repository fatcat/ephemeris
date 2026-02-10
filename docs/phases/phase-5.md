# Phase 5 — Geography & Labels

## Goal

Add continental outlines, ocean/continent/river geography, terrain type styling, and configurable labels. The globe and projection should look like a stylized textbook map with clear geographic context for orientation.

## Context

Phase 4 is complete. The globe and projection show synchronized day/night with twilight, full time controls (smooth/snap modes, presets, date picker). The Earth texture is either a basic NASA texture or a procedural placeholder.

## Implementation Prompt

> You are implementing Phase 5 of the Ephemeris project. Read `CLAUDE.md` for project context and `docs/DECISIONS.md` (D007, D011) for decisions on aesthetic style and label scope.
>
> **Your task:** Add geographic features, terrain styling, and labels to create a textbook-style map appearance.
>
> ### Step-by-step:
>
> 1. **Geographic data acquisition:**
>
>    Download and process Natural Earth datasets (all public domain):
>    - **Coastlines** (`ne_110m_coastline`): continental outlines
>    - **Land** (`ne_110m_land`): land mass polygons
>    - **Rivers + lake centerlines** (`ne_110m_rivers_lake_centerlines`): filter to top ~20 by `scalerank`
>    - **Lakes** (`ne_110m_lakes`): major lakes
>    - **Geographic labels** (`ne_110m_geography_regions_polys` or similar): continent names, ocean names
>
>    Convert to GeoJSON if not already. Store as static assets in `src/assets/geo/`. Keep file sizes small — the 1:110m scale datasets are typically < 100KB each.
>
>    Alternatively, find or create pre-processed GeoJSON files from Natural Earth. Many open-source projects publish these.
>
> 2. **Earth texture replacement:**
>
>    Create or source a stylized Earth texture (2048x1024 equirectangular):
>    - **Oceans:** muted blue (#4a7c9b or similar)
>    - **Land — forests/vegetation:** muted green (#6b8e5e or similar)
>    - **Land — deserts:** sandy/tan (#c4a86b or similar)
>    - **Land — ice/tundra:** light gray/white
>    - **Mountains:** subtle ridge shading or slightly darker tone
>    - The texture should look like a textbook map, NOT a satellite photo
>
>    Options for creating this:
>    a. Post-process a Natural Earth raster (they provide "cross-blended hypsometric tints" which are already textbook-style)
>    b. Use the Natural Earth I or II raster directly — these are already stylized
>    c. Create programmatically from land cover classification data
>
>    **Preferred:** Use Natural Earth I or II raster, which are public domain and already have the textbook aesthetic. Download the medium-resolution version and resize to 2048x1024.
>
>    If downloading at build time is impractical, create a build script or document the manual download step.
>
> 3. **Geographic overlays on the globe:**
>
>    Render geographic data as line geometry on top of the globe:
>    - **Continental outlines:** thin lines (1-2px) over the coastline data. Color: slightly darker than the land.
>    - **Rivers:** thinner lines, blue-tinted, only the top ~20 by importance
>    - Convert GeoJSON coordinates (lon/lat) to 3D positions on the sphere surface
>    - Lines should sit just above the sphere surface (small offset like 0.001) to avoid z-fighting
>    - Lines should be affected by the day/night shader (darker on the night side)
>
> 4. **Geographic overlays on the projection:**
>
>    Same data, but mapped to the flat equirectangular plane:
>    - Continental outlines and rivers as line geometry on the plane
>    - Same styling as the globe
>    - GeoJSON coordinates map directly to equirectangular UV coordinates:
>      `x = (lon + 180) / 360`, `y = (lat + 90) / 180`
>
> 5. **Labels:**
>
>    Render text labels for geographic features. Use HTML overlays (CSS2DRenderer) or canvas-based sprite textures.
>
>    **Always visible (not configurable):**
>    - 7 continents: Africa, Antarctica, Asia, Australia/Oceania, Europe, North America, South America
>    - Major oceans: Pacific, Atlantic, Indian, Southern, Arctic
>    - Major seas: Mediterranean, Caribbean, South China Sea, etc. (~10-12 major ones)
>
>    **Configurable (off by default):**
>    - Major islands: Greenland, Madagascar, Borneo, etc.
>    - Countries (labels only, no boundary lines)
>
>    Label styling:
>    - Semi-transparent background or text shadow for readability
>    - Oceans/seas in italic
>    - Continents in small caps or bold
>    - Font size scales with viewport
>    - Labels should be readable on both day and night sides
>
>    On the globe: labels should face the camera (billboarded) and hide when on the far side
>    On the projection: labels are positioned at fixed UV coordinates
>
> 6. **Settings store update (`src/lib/stores/settings.ts`):**
>    - Add a new settings store (persisted to localStorage)
>    - `showIslandLabels: boolean` (default: false)
>    - `showCountryLabels: boolean` (default: false)
>    - `showRivers: boolean` (default: true)
>    - Create a simple settings panel/menu to toggle these
>
> 7. **Bump map (optional but encouraged):**
>    - Add a subtle bump/normal map for topographic relief (mountains, ocean floor)
>    - Integrate into the existing custom shader
>    - Very subtle effect — just enough to suggest mountain ranges
>    - If this adds too much complexity, skip it and note it as a follow-up
>
> ### Important constraints:
> - Do NOT add country boundary lines — only country labels (when enabled)
> - Do NOT add city markers or city labels — that is Phase 6
> - All data and textures MUST be public domain or CC0
> - Keep the total payload increase reasonable (< 5MB for all new textures and data)
> - Labels must work on both globe and projection views
>
> ### Notes on texture sourcing:
> Natural Earth provides several pre-made raster maps:
> - **Natural Earth I** — vivid, textbook-style, includes terrain shading
> - **Natural Earth II** — satellite-like but stylized
> - **Cross-blended Hypsometric Tints** — topographic coloring
>
> Natural Earth I is probably the best fit. Available at: https://www.naturalearthdata.com/downloads/10m-raster-data/
>
> If the texture cannot be downloaded during the session, create a build script (`scripts/download-assets.sh`) that fetches it, and document the manual step.

## Files to Create/Modify

```
src/assets/geo/
  coastlines.json          (Natural Earth coastlines GeoJSON)
  rivers.json              (Natural Earth rivers GeoJSON, filtered)
  lakes.json               (Natural Earth lakes GeoJSON)
  labels.json              (continent, ocean, sea names + positions)
scripts/
  download-assets.sh       (optional: downloads Natural Earth textures)
src/lib/
  stores/
    settings.ts            (new: user preferences store)
  components/
    Labels.svelte          (new: geographic label rendering)
    SettingsPanel.svelte    (new: toggle panel for configurable layers)
    Globe.svelte            (modify: add geographic overlays)
    Projection.svelte       (modify: add geographic overlays)
  three/
    geoOverlays.ts         (new: GeoJSON → Three.js line geometry)
    earthShader.ts          (modify: optionally add bump mapping)
  utils/
    geo.ts                 (new: GeoJSON coordinate conversion utilities)
src/App.svelte             (modify: integrate settings panel)
```

## Acceptance Criteria

- [ ] The Earth texture has a stylized, textbook appearance (not photorealistic)
- [ ] Continental outlines are visible as thin lines on both globe and projection
- [ ] Terrain types are distinguishable (ocean, forest, desert, ice)
- [ ] Top ~20 rivers are visible (subtle blue lines)
- [ ] Continent labels are visible on both globe and projection
- [ ] Ocean and major sea labels are visible
- [ ] Island labels can be toggled on/off in settings (off by default)
- [ ] Country labels can be toggled on/off in settings (off by default)
- [ ] Settings persist across page reloads (localStorage)
- [ ] Labels are readable on both day and night sides
- [ ] Geographic overlays are affected by day/night shading
- [ ] All data and textures are public domain
- [ ] Total new asset size < 5MB
- [ ] `npm run build` passes
- [ ] `npm run check` passes

## Phase Completion Checklist

- [ ] All acceptance criteria met
- [ ] Verified labels on both globe and projection
- [ ] Verified settings toggle works and persists
- [ ] Verified geographic overlays work with time controls (day/night still works)
- [ ] `npm run build` passes
- [ ] `npm run check` passes
- [ ] Tested in browser
- [ ] Phase status updated in `docs/phases/README.md`
- [ ] Current phase updated in `CLAUDE.md`
- [ ] Changes committed: `phase 5 complete: geography, terrain styling, and labels`
