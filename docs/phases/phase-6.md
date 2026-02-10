# Phase 6 — Location, Sun Data & Night Lights

## Goal

Add user-configurable default location with marker, a sun data information panel showing solar elevation and related data, and a muted night-lights texture for nightside orientation.

## Context

Phase 5 is complete. The globe and projection have textbook-style terrain, geographic overlays, labels, and configurable settings. Time controls are fully functional.

## Implementation Prompt

> You are implementing Phase 6 of the Ephemeris project. Read `CLAUDE.md` for project context and `docs/DECISIONS.md` (D012, D013) for decisions on night lights and reset animation.
>
> **Your task:** Add location management, solar information display, and night-lights texture.
>
> ### Step-by-step:
>
> 1. **Location input and management (`src/lib/components/LocationInput.svelte`):**
>
>    Create a location input that lets the user set their default viewing location:
>    - Input fields for:
>      - **Location name** (free text, e.g., "New York")
>      - **Latitude** (number input, range -90 to 90, step 0.01, suffix °N/°S)
>      - **Longitude** (number input, range -180 to 180, step 0.01, suffix °E/°W)
>    - Alternatively, provide a dropdown of major world cities with pre-filled coordinates:
>      - New York (40.71, -74.01)
>      - London (51.51, -0.13)
>      - Tokyo (35.68, 139.69)
>      - Sydney (-33.87, 151.21)
>      - Cairo (30.04, 31.24)
>      - São Paulo (-23.55, -46.63)
>      - Mumbai (19.08, 72.88)
>      - And 10-15 other globally distributed cities
>    - Store the selected location in the settings store (persisted to localStorage)
>    - Default location if nothing is set: 0.00° lat, 0.00° lon (Gulf of Guinea)
>
> 2. **Location marker:**
>
>    Show the saved location on both the globe and projection:
>    - **Globe:** A small dot or pin at the lat/lon position on the sphere surface. Should be visible on both day and night sides. Use a bright but not garish color (e.g., warm orange or gold).
>    - **Projection:** Same marker at the corresponding UV position on the flat map
>    - The marker should be small but clearly visible
>
> 3. **Reset view button:**
>
>    Add a button (e.g., a compass/home icon) that resets the globe orientation:
>    - Smoothly animates the camera to center on the saved default location
>    - Animation duration: 1-2 seconds
>    - Use a SLERP (spherical linear interpolation) or similar smooth rotation
>    - The button should be near the globe (floating overlay or in the control bar)
>    - Animate OrbitControls' target and camera position together
>
> 4. **Sun data panel (`src/lib/components/SunInfo.svelte`):**
>
>    Display solar information for the saved location at the current simulation time:
>
>    Implement these calculations in `src/lib/astronomy/solar.ts` (extend existing module):
>
>    - **Sun elevation** (altitude angle above/below horizon at the location):
>      ```
>      sin(elevation) = sin(lat) × sin(declination) + cos(lat) × cos(declination) × cos(hourAngle)
>      hourAngle = localSiderealTime - rightAscension
>      localSiderealTime = greenwichSiderealTime + longitude
>      ```
>    - **Sun azimuth** (compass direction of the sun):
>      ```
>      sin(azimuth) = -cos(declination) × sin(hourAngle) / cos(elevation)
>      ```
>    - **Sunrise and sunset times** for the location on the current date:
>      ```
>      cos(hourAngle_sunrise) = (sin(-0.833°) - sin(lat) × sin(dec)) / (cos(lat) × cos(dec))
>      ```
>      (The -0.833° accounts for atmospheric refraction and solar disc radius)
>    - **Day length** (hours of daylight)
>    - **Solar noon** (time when sun is highest)
>    - Handle edge cases: polar day (sun never sets), polar night (sun never rises)
>
>    Display format:
>    ```
>    ┌─ Sun Data: New York (40.71°N, 74.01°W) ───────┐
>    │ Elevation:  42.3°           Azimuth: 185.2° S │
>    │ Sunrise:    06:42 UTC       Sunset:  20:15 UTC│
>    │ Day length: 13h 33m         Solar noon: 13:28 │
>    │ Status:     ☀ Day (afternoon)               1 │
>    └───────────────────────────────────────────────┘
>    ```
>    - Update in real time (or as fast as the simulation runs)
>    - Position: alongside the controls, or as a collapsible panel
>    - Keep compact but readable
>
> 5. **Night lights texture:**
>
>    Add a muted city lights texture to the night side:
>    - Source: NASA Black Marble or similar (public domain)
>    - Resolution: 2048x1024 (same as day texture)
>    - **Mute/desaturate** the texture — reduce brightness and saturation so it's subtle
>    - Modify the earth shader to blend in the night lights on the dark side:
>      ```glsl
>      uniform sampler2D uNightTexture;
>
>      // On the night side:
>      vec3 nightLights = texture2D(uNightTexture, vUv).rgb * 0.3; // muted
>      vec3 nightColor = baseNightColor + nightLights;
>      ```
>    - The night lights should fade in during twilight and be fully visible on the deep night side
>    - Apply the same night lights to the projection shader
>    - The effect should be subtle — just enough to see "that bright spot is a major city" for orientation
>
> 6. **Integrate into settings:**
>    - Add a toggle: "Show night lights" (default: on)
>    - Add to the existing settings panel from Phase 5
>
> ### Important constraints:
> - Do NOT add country boundaries or country names as part of this phase
> - Night lights texture MUST be public domain (NASA imagery qualifies)
> - Sun data calculations must handle edge cases (polar regions)
> - The reset animation should not be jarring — smooth and predictable
> - Keep the info panel compact — it should not dominate the UI
> - This info panel's visibility should be toggleable from the settings panel
>
> ### Verifying sun data:
> - At solar noon at the equator on an equinox, sun elevation should be ~90°
> - In the Arctic on June solstice, sunrise/sunset should not exist (24hr day)
> - Compare a few sunrise/sunset times against timeanddate.com for spot checks

## Files to Create/Modify

```
src/lib/astronomy/
  solar.ts                 (modify: add elevation, azimuth, sunrise/sunset, day length)
src/lib/components/
  LocationInput.svelte     (new: location entry with city presets)
  SunInfo.svelte           (new: solar data display panel)
  ResetView.svelte         (new: reset-to-default button)
  Globe.svelte             (modify: add location marker, reset animation)
  Projection.svelte        (modify: add location marker)
  SettingsPanel.svelte     (modify: add night lights toggle)
src/lib/stores/
  settings.ts              (modify: add location, nightLights settings)
src/lib/three/
  earthShader.ts           (modify: add night lights texture sampling)
  projectionShader.ts      (modify: add night lights texture sampling)
  locationMarker.ts        (new: marker geometry for globe and projection)
src/assets/textures/
  night_lights.webp        (NASA night lights, muted, 2048x1024)
```

## Acceptance Criteria

- [ ] User can enter a location by name + lat/lon coordinates (to 0.01° precision)
- [ ] User can select from a dropdown of ~20 major cities
- [ ] Location persists across page reloads
- [ ] Default location is 0.0° / 0.0° when nothing is saved
- [ ] Location marker is visible on both globe and projection
- [ ] "Reset view" button smoothly animates the globe to center on the saved location (1-2 seconds)
- [ ] Sun elevation and azimuth are displayed for the saved location
- [ ] Sunrise, sunset, and day length are displayed
- [ ] Sun data updates with simulation time (including during playback)
- [ ] Polar day/night edge cases are handled (display "No sunset" / "No sunrise")
- [ ] Night lights are visible on the dark side of both globe and projection
- [ ] Night lights are muted/subtle (not distractingly bright)
- [ ] Night lights can be toggled on/off in settings
- [ ] `npm run build` passes
- [ ] `npm run check` passes

## Phase Completion Checklist

- [ ] All acceptance criteria met
- [ ] Sun data spot-checked against known values
- [ ] Night lights verified on both views
- [ ] Reset animation tested
- [ ] Location persistence tested
- [ ] `npm run build` passes
- [ ] `npm run check` passes
- [ ] Tested in browser
- [ ] Phase status updated in `docs/phases/README.md`
- [ ] Current phase updated in `CLAUDE.md`
- [ ] Changes committed: `phase 6 complete: location, sun data, and night lights`
