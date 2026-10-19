# Phase 8: Sky Dome View

## Goal

Add a fifth view showing the sky from the user's location: an observer standing on a horizon
disk under a see-through hemisphere, with the sun's path traced across it for the June
solstice, the equinoxes, the December solstice and today. Students can see directly why
summer sun is high and long and winter sun is low and short.

The scene and path math are kept free of Svelte so a future Home Assistant card can reuse
them from a second build target in this repo.

## Context

Phases 1–7 are complete, plus the Orrery and Sundial views. The layout arranges 1 to 4
views. Solar math in `src/lib/astronomy/solar.ts` already provides elevation/azimuth,
sunrise/sunset/solar noon and solstice/equinox dates.

## Decisions

- **Five views:** the layout stays at 4. Turning on a fifth is refused with a short message
  ("Up to 4 views at once. Turn one off first.") rather than silently closing another view.
- **3D dome, not a 2D polar chart.** The 2D sun-path chart is the solar-industry standard
  and needs no WebGL; it's the candidate renderer if the HA card is built.
- **Hour markers in solar time** (solar noon = 12), matching the sundial.
- **No analemmas** for now. Possibly useful later.
- **Path colors follow the observer's seasons:** the solstice with the higher sun is warm,
  the lower one cool. At axial tilt ≈ 0 both solstice paths turn neutral gray (no seasons).
- Paths follow the axial tilt setting.

## Files Created/Modified

| File | Change |
|---|---|
| `src/lib/views.ts` | New. Single view registry (`VIEWS`, `MAX_ACTIVE_VIEWS`, `activeViewIds`) |
| `src/lib/astronomy/sunPath.ts` | New. `sunPathForDay`, `seasonalPaths`, `solarHourMarkers` |
| `src/lib/three/skydomeScene.ts` | New. Dome, grid, compass, observer, paths, sun marker |
| `src/lib/three/sceneHelpers.ts` | New. `createTextTexture`, `createConstrainedOrbit` (shared with sundial) |
| `src/lib/components/Skydome.svelte` | New. View component with legend and below-horizon note |
| `src/lib/utils/geo.ts` | `horizonToScenePosition` (shared with sundial) |
| `src/lib/three/sundialScene.ts` | Uses the shared helpers; no visual change |
| `src/lib/stores/settings.ts` | `showSkydome` setting |
| `src/App.svelte` | Reads `activeViewIds`; renders `Skydome` |
| `src/lib/components/SettingsPanel.svelte` | Toggles generated from `VIEWS`; 4-view limit notice; row wraps |
| `src/app.css` | Shared `.scene-host` and `.view-note` (were copied per view) |
| Globe, Projection, Orrery, Sundial components | Use `.scene-host` |

## Acceptance Criteria

- [x] "Sky" toggle shows and hides the view; setting persists
- [x] A fifth view is refused with a message; turning one off first then works
- [x] Last remaining view still can't be turned off
- [x] 1-, 2-, 3- and 4-view layouts render the sky dome correctly
- [x] Oslo, June solstice: path peaks at 53.5°
- [x] Equator, equinox: path peaks at 90°
- [x] Tromsø: June path is a full loop (midnight sun); December path absent, legend says the sun never rises
- [x] Southern hemisphere: camera faces north, December path is the warm (summer) one; noon peaks due north. Checked Sydney, Buenos Aires (sun position matches the sun info bar), Ushuaia, McMurdo (December midnight-sun loop, June never rises)
- [x] Key hides when the view is under 480px wide or 320px tall, so it never covers the dome
- [x] Axial tilt 0°: all seasonal paths coincide and turn gray
- [x] Hour markers are solar time; current sun sits between the right markers
- [x] "The sun is below the horizon" note at night
- [x] Dark and light themes both readable
- [x] Sundial looks identical after the helper refactor
- [x] `npm run check` passes; `npm run lint` adds no new errors; `npm run build` passes

## Phase Completion Checklist

- [x] All acceptance criteria met
- [x] Tested complete user flow in browser
- [ ] Tested on a mobile device (narrow viewport checked in desktop browser only)
- [ ] Performance profiled on target-floor hardware
