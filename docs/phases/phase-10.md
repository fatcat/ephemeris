# Phase 10: Sky Dome Card

## Goal

Replace the sky card's placeholder with the 2D sun-path chart from the mockup: the sky
flattened onto a disk, with the solstice and equinox paths, the selected day's path, hour
markers, the sun, and optional solar panel markers. Add the "Sun on panels" info box.

## Context

Phase 9 built the card element, shared header, info boxes, time controls and config. The
app's sky dome (Phase 8) already had the path math (`sunPath.ts`) and the seasonal color
rule, but the color rule lived inside the Three.js scene.

## Decisions

- **North up by default** (the standard sun-path chart). "Facing the sun" turns it 180° in
  the northern hemisphere and leaves it alone in the southern. A rotation, never a mirror.
  The in-card toggle (with `controls: full`) overrides the config until the config changes.
- **Hour markers default to clock hours** in HA's time zone, so they line up with the time
  slider. `solar` gives the app's solar hours (12 = sun highest). A dot every hour, a label
  every third.
- **Seasonal colors shared with the app:** the color rule moved from `skydomeScene.ts` to
  `seasonalPathInfo()` in `sunPath.ts`, and the colors to `src/lib/pathColors.ts`, which
  adds darker versions for light themes. The legend text is shared too (`seasonalPathLabel`).
- **Panels are configured by hand:** name, tilt and azimuth (the direction the panel faces),
  up to 4. Each shows as a square where its face points in the sky.
- **"Sun on panels"** is one box with a row per panel: the cosine of the angle between the
  sun and the panel's face, as a percent. Direct sunlight only; it ignores clouds, haze,
  shading and diffuse light, so it isn't a power estimate. On narrow cards the box takes a
  full row so names stay readable.
- **Card options reach the shared parts through `parseCard`**, and editor fields through
  `extraSchema`. Info boxes can return rows as well as text.

## Config

```yaml
type: custom:ephemeris-sky-card
orientation: north_up          # north_up | facing_sun
paths: [solstices, equinox, today]
hour_markers: clock            # clock | solar | none
panels:                        # optional, up to 4
  - name: South roof
    tilt: 35                   # 0 flat, 90 vertical
    azimuth: 180               # facing: 90 E, 180 S, 270 W
info: [elevation, azimuth, noon_height, sunrise, sunset, panel_alignment]
```

## Files Created/Modified

| File | Change |
|---|---|
| `src/lib/astronomy/polarChart.ts` | New. Chart frame, projection, path data, compass labels, direct-beam fraction |
| `src/lib/astronomy/sunPath.ts` | `seasonalPathInfo`, `SEASONAL_PATH_NAMES`, `seasonalPathLabel` (moved from the scene and `Skydome.svelte`) |
| `src/lib/pathColors.ts` | New. Path colors for dark and light backgrounds, `cssHex` |
| `src/lib/three/skydomeScene.ts`, `src/lib/components/Skydome.svelte` | Use the shared roles, colors and labels |
| `src/ha-card/cards/SkyChart.svelte` | New. The chart and its legend |
| `src/ha-card/cards/SkyCard.svelte` | Chart plus orientation toggle |
| `src/ha-card/cards/skyConfig.ts` | New. Sky options, validation, editor fields, `panel_alignment` |
| `src/ha-card/components/Chip.svelte`, `ChipGroup.svelte` | New. Shared chip buttons (day chips, orientation, Now) |
| `src/ha-card/components/CardShell.svelte` | Card controls snippet; path colors as CSS variables |
| `src/ha-card/components/InfoBoxes.svelte` | Row values with bars |
| `src/ha-card/defineCard.ts`, `config.ts`, `info.ts`, `cardState.svelte.ts` | Card options and editor fields; rows in info values; prop renamed `cardState` (a prop named `state` clashes with the `$state` rune) |
| `src/lib/astronomy/polarChart.test.ts`, `src/ha-card/cards/skyConfig.test.ts` | New tests |

## Acceptance Criteria

- [x] Oslo, June 21: day path peaks at 53.5° (noon height box), clock-hour noon sits east of south (solar noon 13:17 CEST)
- [x] North up: N top, E right. Facing the sun in Oslo: S top, E left. In Sydney: N top either way
- [x] Sydney: December (summer) path is the warm one, high and to the north
- [x] Tromsø: midnight-sun loop with 12a at north; legend says the December sun never rises
- [x] Panels: south roof leads at noon, west roof in the evening, both 0 at night (tests)
- [x] Light and dark themes readable; phone width has no horizontal scroll
- [x] The app's sky dome looks the same after the shared-color refactor
- [x] Bundle: 109.1 KB, 32.6 KB gzipped (Phase 9: 26.0 KB)
- [x] `npm test` (62), `npm run check` pass; lint unchanged (7 pre-existing errors)
- [x] In HA: chart, toggle and panels in a real dashboard; panel list in the visual editor

## Phase Completion Checklist

- [x] Acceptance criteria met in the harness
- [x] Acceptance criteria met in a real HA instance
