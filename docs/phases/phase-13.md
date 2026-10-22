# Phase 13: Globe View on the Day and Night Card

## Goal

Let the day and night card switch between the world map and a globe facing home.

## Decisions

- **Canvas, not Three.js.** Each pixel of the globe disk is turned back into a latitude and
  longitude (inverse orthographic projection) and colored from an off-screen raster of the
  same land outline the map uses (`Path2D` takes SVG path data). No textures, no new chunk.
- **Night from the sun's altitude per pixel:** the dot product of the spot's direction and
  the subsolar direction, against the same layer limits and opacities as the map, so the two
  views agree. Per-pixel directions and base colors are worked out once per size, center and
  theme; each time step only re-shades. Playing the day holds 60 fps in the harness.
- **Centered on home, no dragging.** Dragging fights page scrolling on phones, and the time
  controls already turn the Earth. Markers and the sun dot on the far side are hidden; the
  equator and tropics are drawn only on the near side.
- **Switch:** `view: map | globe` sets which view the card opens with; a Map | Globe chip
  group in the card switches it (not saved), like the sky card's orientation.
- **Globe box is 4:3,** the map stays 2:1. A 2:1 box made the globe about 200 px across on a
  narrow card, so the card grows a little in globe view.
- **Shared, pulled out of the map:** night layers, key and description (`dayNightLayers.ts`),
  pins and sun dot (`MapPins.svelte`), a land loader that fetches the chunk once
  (`geo/land.ts`), and the map colors and grid styles, now on the card's figure.
- **Single-file bundle (1.1.1).** The land outline is now built into `ephemeris-cards.js`,
  so an install is one file, and the release script refuses a build with more. The map with
  no land in HA that prompted this was not HACS: HACS downloads every asset of a release. An
  old `/local/ephemeris/` 1.0.0 resource was still in `.storage/lovelace_resources`, loaded
  first and claimed the cards, and its land file was gone. Removing it fixed the card.
- **Play button shows pause while live.** Live time is moving, so the first press freezes the
  clock and the next plays through the day. "Now" goes back to live.

## Files Created/Modified

| File | Change |
|---|---|
| `src/ha-card/geo/orthographic.ts` (+ test) | New. Forward and inverse projection, near-side parallels |
| `src/ha-card/cards/DayNightGlobe.svelte` | New. The globe |
| `src/ha-card/cards/dayNightLayers.ts`, `MapPins.svelte`, `src/ha-card/geo/land.ts` | New. Shared by map and globe |
| `src/ha-card/cards/DayNightMap.svelte` | Uses the shared pieces |
| `src/ha-card/cards/DayNightCard.svelte` | View switch; colors, key and grid styles |
| `src/ha-card/cards/dayNightConfig.ts` (+ test) | `view` option and editor field |
| `src/ha-card/timeSelection.svelte.ts` (+ test), `components/TimeControls.svelte` | `moving`; pause while live |
| `src/ha-card/dev/harness.ts` | A globe card |
| `package.json` | `cardVersion` 1.1.0, then 1.1.1 |
| `vite.card.config.ts`, `scripts/release-card.sh` | 1.1.1: one-file bundle, and a check for it |

## Acceptance Criteria

- [x] Globe and map show the same day, twilight and night (same layer math)
- [x] Northern and southern homes: Oslo afternoon, Sydney night in late October (Antarctica lit)
- [x] Far-side people and sun dot hidden; Map | Globe switch works both ways
- [x] Light and dark themes; 340 px card fits (the harness page itself scrolls 15 px with no cards)
- [x] Play button shows pause while live; pressing it freezes, pressing again plays the day
- [x] Bundle 163.0 KB, 49.3 KB gzipped, one file with the land outline inside (1.1.0: 38.7 KB plus a 9.8 KB chunk)
- [x] `npm test` (122), `npm run check` pass; card lint clean
- [ ] In HA: both views on a real dashboard, `view: globe` in the visual editor
- [x] Released as cards v1.1.0
- [x] Released as cards v1.1.1 (land outline in the main file)
