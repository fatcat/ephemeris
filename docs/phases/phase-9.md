# Phase 9: Home Assistant Card Foundation

## Goal

A second build target that turns Ephemeris into Home Assistant dashboard cards. This phase
builds the parts every card shares: the card element, header, info boxes, time controls,
config validation and the editor form. Both card types install and run; their chart areas
are placeholders until Phases 10 (Sky Dome card) and 11 (Day/Night map card).

Plan: `~/.claude/plans/ha-cards.md`. Mockups: the "Ephemeris HA Cards" design canvas.

## Context

Phase 8 added the sky dome view and kept its path math (`sunPath.ts`) free of Svelte and
Three.js so a card could reuse it. HA custom cards are custom elements loaded as one
JavaScript module per dashboard resource.

## Decisions

- **Same repo, second Vite config** (`vite.card.config.ts`), library mode, one ES module:
  `dist-card/ephemeris-cards.js`. It registers both card types.
- **Location is always HA's home** (`hass.config.latitude/longitude`). No location picker,
  no place list, no time zone database in the bundle.
- **Time zone follows the user's HA profile:** "local" uses the browser's zone, otherwise the
  server's. 12/24 h follows the profile too, using the same test HA uses (`useAmPm`).
- **Theme follows HA** through its CSS variables. The card renders inside HA's `<ha-card>`.
- **Svelte inside a shadow root** with `css: 'injected'`: Svelte 5 appends component styles
  to the shadow root it mounts in (verified in the harness).
- **Visual editor through `getConfigForm()`.** HA's `select` selector supports
  `multiple` + `reorder` (the ordered info list) and its `object` selector supports `fields`
  + `multiple` (the sky card's panel list, Phase 10). Checked in the HA frontend source
  (`src/data/selector.ts`) on 2026-10-20. No custom editor element needed.
- **Snap-back:** after `reset_after` idle seconds the card returns to now. Never while
  playing. A "Now" chip returns at once.
- **Twilight and golden hour** reuse the sunrise math: `sunriseSunset` now calls
  `sunTimesForAltitude` with -0.833°.
- **UI text is English.** Numbers, dates and times use HA's language through Intl.
- **Deploy with tar over ssh**, so the HA side needs only a shell and tar. This sidesteps
  the open question of which SSH add-on supports scp or SFTP.

## Config

```yaml
type: custom:ephemeris-sky-card    # or custom:ephemeris-daynight-card
title: Sky Dome          # optional; empty uses the default; false hides the header
controls: full           # none | compact (play only) | full (days, slider, play)
reset_after: 60          # seconds idle before returning to now; 0 = never; max 3600
info: [elevation, azimuth, noon_height, sunrise, sunset, daylight]   # up to 6, in order
```

Info ids: `status`, `elevation`, `azimuth`, `sunrise`, `sunset`, `daylight`, `solar_noon`,
`noon_height`, `daylight_change`, `next_solstice`, `civil_dawn`, `civil_dusk`, `golden_hour`.

## Files Created/Modified

| File | Change |
|---|---|
| `vite.card.config.ts` | New. Card build (library mode, injected CSS) and harness dev server |
| `card-dev.html`, `src/ha-card/dev/` | New. Harness with a mock `hass` and theme switcher |
| `src/ha-card/index.ts` | New. Registers both cards |
| `src/ha-card/defineCard.ts` | New. Card element: HA card API, minute tick, editor schema |
| `src/ha-card/cardState.svelte.ts` | New. Reactive state the element hands to Svelte |
| `src/ha-card/config.ts` | New. Shared config validation |
| `src/ha-card/home.ts` | New. Home location, zone, language, 12/24 h, dark mode from `hass` |
| `src/ha-card/format.ts` | New. Zone math (`zonedToUtc`, `zonedParts`, `localNoon`) and formatting |
| `src/ha-card/info.ts` | New. Info box registry |
| `src/ha-card/timeSelection.svelte.ts` | New. Live vs picked moment, play, snap-back |
| `src/ha-card/components/` | New. `CardShell`, `CardHeader`, `InfoBoxes`, `TimeControls`, `ChartPlaceholder` |
| `src/ha-card/cards/` | New. `SkyCard`, `DayNightCard` (placeholder charts) |
| `src/ha-card/*.test.ts` | New. Vitest: zone math, formatting, hass parsing, config, info known answers, snap-back |
| `src/lib/astronomy/solar.ts` | `sunTimesForAltitude`; `sunriseSunset` calls it |
| `scripts/deploy-card.sh` | New. Build and copy to `HA_DEPLOY_TARGET` |
| `package.json` | `test`, `build:card`, `dev:card`, `deploy:card`; Vitest dev dependency |

## Acceptance Criteria

- [x] `npm run build:card` produces `dist-card/ephemeris-cards.js`: 86.6 KB, 26.0 KB gzipped
      (target 40 KB). Vite leaves whitespace in ES library builds, so there is a little more to gain.
- [x] Harness: both cards render header, info boxes and controls; styles apply inside the shadow root
- [x] Light and dark theme variables both readable
- [x] Times in HA's zone; profile "local" switches to the browser zone; 12/24 h and language follow the profile
- [x] Day chips, slider, play, Now, and snap-back after `reset_after` all work
- [x] Bad config shows a clear error (unknown info id, duplicates, more than 6, bad controls)
- [x] Polar cases: Tromsø June "Up all day", December "No sunrise"; McMurdo June "No sunrise"
- [x] Info known answers: Oslo June solstice noon 53.5°, sunrise 03:53, sunset 22:43
- [x] Phone width: no horizontal scroll; values don't wrap
- [x] `npm test`, `npm run check` pass; lint adds no new errors
- [x] In HA: both cards appear in the card picker with the stub config
- [x] In HA: the editor form shows all four fields and reorders info boxes
- [x] In HA: theme, light and dark, looks right in a real dashboard
- [x] In HA: deploy script works against the HAOS VM

## Phase Completion Checklist

- [x] Acceptance criteria met in the harness
- [x] Acceptance criteria met in a real HA instance (HAOS VM, 2026-10-20)
