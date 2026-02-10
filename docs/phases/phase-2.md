# Phase 2 — Solar Position & Day/Night Shading

## Goal

Implement the solar position algorithm and replace the basic Three.js lighting with a custom shader that renders realistic day/night terminator with graduated twilight zones. The terminator should move in real time.

## Context

Phase 1 is complete. A spinning, textured Earth globe exists with orbit controls and responsive layout. The globe currently uses basic Three.js directional lighting.

## Implementation Prompt

> You are implementing Phase 2 of the Ephemeris project. Read `CLAUDE.md` for project context and `docs/ARCHITECTURE.md` for the shader design and solar algorithm specification.
>
> **Your task:** Implement solar position calculations and custom day/night shading on the globe.
>
> ### Step-by-step:
>
> 1. **Solar position module (`src/lib/astronomy/solar.ts`):**
>
>    Implement the Jean Meeus medium-precision solar position algorithm:
>
>    ```
>    Input:  Date (UTC)
>    Output: { declination: number, rightAscension: number, sunDirection: Vector3 }
>    ```
>
>    The algorithm steps:
>    a. Convert date to Julian Day Number (JDN)
>    b. Compute centuries from J2000.0: `T = (JDN - 2451545.0) / 36525.0`
>    c. Solar mean longitude: `L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T²` (mod 360)
>    d. Solar mean anomaly: `M = 357.52911 + 35999.05029 * T - 0.0001537 * T²` (mod 360)
>    e. Equation of center:
>       `C = (1.914602 - 0.004817 * T - 0.000014 * T²) * sin(M)`
>       `  + (0.019993 - 0.000101 * T) * sin(2M)`
>       `  + 0.000289 * sin(3M)`
>    f. Sun's true longitude: `θ = L0 + C`
>    g. Mean obliquity: `ε0 = 23.439291 - 0.013004 * T - 1.64e-7 * T² + 5.04e-7 * T³`
>    h. Nutation in longitude (simplified): `Ω = 125.04 - 1934.136 * T`
>       `Δψ = -0.00478 * sin(Ω)`
>    i. Corrected obliquity: `ε = ε0 + 0.00256 * cos(Ω)`
>    j. Apparent longitude: `λ = θ - 0.00569 - 0.00478 * sin(Ω)`
>    k. Declination: `δ = arcsin(sin(ε) * sin(λ))`
>    l. Right ascension: `α = arctan2(cos(ε) * sin(λ), cos(λ))`
>    m. Convert declination and right ascension to a sun direction vec3 in the scene's coordinate system
>
>    Also implement:
>    - `julianDay(date: Date): number`
>    - `solarPosition(date: Date): SolarPosition`
>    - `sunDirectionVector(date: Date): THREE.Vector3` — the normalized direction FROM Earth TO the Sun, accounting for Earth's axial tilt (23.44°) and current time of day (hour angle)
>
>    **Critical:** The sun direction must account for:
>    - Earth's axial tilt (obliquity)
>    - The time of day (Earth's rotation / hour angle)
>    - The time of year (Earth's orbital position / declination)
>
>    The Earth mesh does NOT rotate. Instead, the sun direction rotates around the Earth based on the current time. This is simpler and keeps labels/geography stationary.
>
> 2. **Time store (`src/lib/stores/time.ts`):**
>    - Create a Svelte store holding the current simulation time
>    - In real-time mode, update via `requestAnimationFrame` using the system clock
>    - Expose the current `Date` and derived `sunDirection` (THREE.Vector3)
>    - For now, only real-time mode is needed (time controls come in Phase 4)
>
> 3. **Custom shader (`src/lib/three/earthShader.ts`):**
>
>    Replace the basic Three.js material with a `ShaderMaterial`:
>
>    **Vertex shader:**
>    - Pass world-space normal and UV to fragment shader
>    - Standard MVP transform
>
>    **Fragment shader:**
>    - Receive `uniform vec3 uSunDirection` (normalized, world space)
>    - Compute `sunAngle = dot(worldNormal, uSunDirection)`
>    - Sample day texture at UV
>    - **Day side** (`sunAngle > 0`): full day texture color
>    - **Night side** (`sunAngle < -0.309`): darkened texture (multiply by ~0.05-0.1)
>    - **Twilight zone** (`-0.309 < sunAngle < 0`): smooth gradient between day and night
>      - Use `smoothstep(-0.309, 0.0, sunAngle)` for the blend
>      - Optionally, use a stepped gradient for civil/nautical/astronomical zones
>    - Apply subtle ambient light to the night side so geography is barely visible
>
> 4. **Wire it together:**
>    - The animation loop reads `sunDirection` from the time store
>    - Updates the shader uniform each frame
>    - The terminator should visibly move (very slowly — one full revolution per 24 hours)
>    - Stop the auto-rotation from Phase 1 (the sun moves, not the Earth)
>
> 5. **Date/time display:**
>    - Show the current UTC date and time in the status bar area
>    - Format: `YYYY-MM-DD HH:MM:SS UTC`
>    - Update every second (or every frame if cheap)
>
> ### Important constraints:
> - Do NOT implement the equirectangular projection view — that is Phase 3
> - Do NOT implement time controls (fast forward, rewind) — that is Phase 4
> - The Earth mesh must NOT rotate. The sun direction changes based on time instead.
> - Clamp date range to ±200 years from J2000.0 in the solar position function
>
> ### Testing the shader:
> You can verify correctness by checking:
> - At an equinox (March 20 or Sept 22), the terminator should run pole-to-pole (vertical on the globe from above)
> - At June solstice, the North Pole should be in 24hr daylight
> - At December solstice, the South Pole should be in 24hr daylight
> - The terminator should slowly move westward as real time passes

## Files to Create/Modify

```
src/lib/astronomy/
  solar.ts              (solar position algorithm)
  types.ts              (SolarPosition, etc.)
src/lib/stores/
  time.ts               (time state store)
src/lib/three/
  earthShader.ts        (custom ShaderMaterial with day/night)
  scene.ts              (modify: use custom shader, wire up sun uniform)
src/lib/components/
  Globe.svelte          (modify: connect to time store)
  TimeDisplay.svelte    (new: shows current date/time)
src/App.svelte          (modify: add TimeDisplay)
```

## Acceptance Criteria

- [ ] The globe shows a clear day/night division (terminator)
- [ ] The terminator has a graduated twilight zone (not a hard line)
- [ ] The night side is dark but geography is faintly visible
- [ ] The terminator moves slowly in real time (westward, one revolution per 24 hours)
- [ ] At a March equinox date, the terminator runs roughly pole-to-pole
- [ ] At a June solstice date, the Arctic is in full daylight
- [ ] At a December solstice date, the Antarctic is in full daylight
- [ ] The current UTC date/time is displayed and updates
- [ ] The Earth does NOT rotate — only the light direction changes
- [ ] The globe is still draggable (orbit controls still work)
- [ ] `npm run build` passes
- [ ] `npm run check` passes

## Phase Completion Checklist

- [ ] All acceptance criteria met
- [ ] Solar position verified against known dates (equinoxes, solstices)
- [ ] `npm run build` passes
- [ ] `npm run check` passes
- [ ] Tested in browser
- [ ] Phase status updated in `docs/phases/README.md`
- [ ] Current phase updated in `CLAUDE.md`
- [ ] Changes committed: `phase 2 complete: solar position and day/night shading`
