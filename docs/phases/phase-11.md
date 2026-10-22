# Phase 11: Day and Night Map Card

## Goal

Replace the day and night card's placeholder with the world map from the mockup: land and
ocean, night and twilight bands, the equator and tropics, the point where the sun is
overhead, home, and optional people from Home Assistant `person` entities.

## Context

Phase 9 built the card foundation and Phase 10 the sky card. The mockup traced the dark
regions column by column, but with rough sun geometry (declination from day of year, no
equation of time).

## Decisions

- **Sun position from the app's Meeus math.** `subsolarPoint` uses the same right ascension
  and sidereal time as the globe and projection views, so the terminator agrees with them.
- **Dark regions in closed form.** Along a meridian the sun's altitude is R·cos(lat − α), so
  each meridian's dark stretch is solved exactly instead of scanned. For thresholds at or
  below 0° that stretch is unbroken, so neighboring meridians join into polygons. One column
  per degree of longitude.
- **Twilight on:** layers at 0, -6, -12 and -18°, stacked. **Twilight off:** one edge at
  -0.833° (the sunrise altitude), drawn darker.
- **Land is an SVG path, not a CSS mask.** The mockup needed a mask only because its land
  came from an image URL. A path takes theme colors just as well and makes the wrap a
  translate: two copies, shifted by the center longitude.
- **Land outline built at build time and loaded lazily.** A Vite plugin turns Natural Earth
  110m land into one path rounded to 0.1°, with relative moves: 32 KB, 9.8 KB gzipped, in its
  own chunk (`ephemeris-land-<hash>.js`). The map imports it when it mounts.
- **Markers are HTML over the map,** so dots and labels keep their size at any card width.
  Labels past 80% of the width go on the left of their dot.
- **People:** up to 8 `person` entities, each shown where its GPS fix is. People without
  one are left off. Ids must match `person.<letters, digits, _>`. A new `fromHass` hook on the
  card description reads them; the result is compared as JSON, so other state changes in the
  house don't re-render the map.
- **Shared pieces pulled out on the way:** `Legend.svelte` (both charts), `oneOf`/`inRange`
  (config validation), `formatLatitude`/`formatLongitude`, and the sun colors as CSS
  variables. `ChartPlaceholder.svelte` is gone.
- **Info values hyphenate** on narrow cards ("after-noon") instead of breaking anywhere.

## Config

```yaml
type: custom:ephemeris-daynight-card
layers: [twilight, tropics, sun]
center_longitude: 0            # -180 to 180
markers: [person.alex]         # up to 8
info: [status, sunrise, sunset, daylight, daylight_change, sun_overhead]
```

## Files Created/Modified

| File | Change |
|---|---|
| `src/lib/astronomy/daylightRegions.ts` | New. Subsolar point, dark column per meridian, regions, SVG path data |
| `src/ha-card/geo/landPath.ts`, `virtual.d.ts` | New. GeoJSON to compact SVG path; types for the virtual module |
| `vite.card.config.ts` | Land path plugin; lazy chunk names |
| `src/ha-card/cards/DayNightMap.svelte` | New. The map, markers and key |
| `src/ha-card/cards/DayNightCard.svelte` | Map in place of the placeholder |
| `src/ha-card/cards/dayNightConfig.ts` | New. Options, validation, editor fields, `sun_overhead` |
| `src/ha-card/cards/people.ts` | New. Person markers from `hass.states` |
| `src/ha-card/defineCard.ts`, `cardState.svelte.ts`, `home.ts` | `fromHass` hook, `hassData`, entity states in `HassLike` |
| `src/ha-card/components/Legend.svelte` | New. Shared chart key |
| `src/ha-card/cards/SkyChart.svelte`, `skyConfig.ts`, `config.ts`, `format.ts`, `CardShell.svelte`, `InfoBoxes.svelte` | Use the shared pieces above |
| `src/ha-card/dev/mockHass.ts`, `harness.ts` | Mock people; a second map card centered on 150° E |
| `src/lib/astronomy/daylightRegions.test.ts`, `src/ha-card/geo/landPath.test.ts`, `src/ha-card/cards/dayNightConfig.test.ts` | New tests |

## Acceptance Criteria

- [x] Terminator uses the same sun model as the app's views; tests check every region edge against `sunElevationAzimuth` at 0, -0.833, -6, -12 and -18°
- [x] Solstice polar caps: June lights the Arctic and darkens the Antarctic, December the reverse
- [x] Twilight off gives one edge at -0.833°
- [x] Centering wraps: 150° E puts Oslo near the left edge and the night side in one piece
- [x] Person markers move when their entity's position changes and disappear without a fix
- [x] Land chunk is a separate file, fetched by the map card's lazy import only
- [x] Light and dark themes readable; 340 px card has no horizontal scroll
- [x] Bundle: 121.3 KB, 36.0 KB gzipped, plus the land chunk at 9.8 KB gzipped (Phase 10: 32.6 KB)
- [x] `npm test` (113), `npm run check` pass; lint unchanged (7 pre-existing errors)
- [x] In HA: map in a real dashboard, a real person marker, layers and people in the visual editor

## Phase Completion Checklist

- [x] Acceptance criteria met in the harness
- [x] Acceptance criteria met in a real HA instance
