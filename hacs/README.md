# Ephemeris Cards

Two Home Assistant dashboard cards that show what the sun is doing where you live:

- `custom:ephemeris-sky-card`: the sun's path across your sky today, at the solstices and at
  the equinox, with optional solar panels.
- `custom:ephemeris-daynight-card`: a world map or a globe facing your home, showing day,
  twilight and night right now, with your home and the people in your house.

<p align="center">
  <img src="https://raw.githubusercontent.com/fatcat/ephemeris/main/docs/ephemeris%20cards%201.png" alt="Day and Night card: world map with twilight bands, home and the point where the sun is overhead" width="49%">
  <img src="https://raw.githubusercontent.com/fatcat/ephemeris/main/docs/ephemeris%20cards%202.png" alt="Sky Dome card: the sun's path today and at the solstices and equinoxes, north up" width="49%">
</p>

Both use your Home Assistant home location, time zone and theme. The solar math runs in
the browser, so the cards need no integration, sensor or internet service.

The cards come from [Ephemeris](https://github.com/fatcat/ephemeris), an app that teaches
kids why Earth has seasons. Source, issues and development live there; this repository
only holds releases for HACS.

## Install with HACS

1. HACS, three-dot menu, Custom repositories.
2. Repository `https://github.com/fatcat/ephemeris-cards`, type "Dashboard". Add.
3. Find "Ephemeris Cards" in HACS and download it.
4. Reload the browser. Edit a dashboard, add a card, search for "Ephemeris".

HACS adds the dashboard resource itself on dashboards managed in the UI. On a YAML
dashboard, add `/hacsfiles/ephemeris-cards/ephemeris-cards.js` as a JavaScript module
resource.

## Install by hand

1. Download every `.js` file from the [latest release](https://github.com/fatcat/ephemeris-cards/releases/latest).
   The map's land outline is a second file the main one loads, so keep them together.
2. Copy them to `/config/www/ephemeris-cards/` on Home Assistant.
3. Settings, Dashboards, three-dot menu, Resources, Add resource. URL
   `/local/ephemeris-cards/ephemeris-cards.js?v=1.0.0` (the release number), type
   "JavaScript module".

After an update, change the `?v=` on the resource, or the browser keeps the old file.

The browser console shows which version loaded: `Ephemeris cards 1.0.0`.

## Card options

Every option can be set in the visual editor. In YAML:

```yaml
type: custom:ephemeris-sky-card
title: Sky Dome          # optional; false hides the header
controls: full           # none | compact | full
reset_after: 60          # seconds idle before returning to now; 0 = never
info: [elevation, azimuth, noon_height, sunrise, sunset, daylight]
```

Info boxes (up to 6): `status`, `elevation`, `azimuth`, `sunrise`, `sunset`, `daylight`,
`solar_noon`, `noon_height`, `daylight_change`, `next_solstice`, `civil_dawn`, `civil_dusk`,
`golden_hour`. The sky card adds `panel_alignment`, the day and night card `sun_overhead`.

### Sky card

```yaml
orientation: north_up          # north_up | facing_sun
paths: [solstices, equinox, today]
hour_markers: clock            # clock | solar | none
panels:                        # up to 4
  - name: South roof
    tilt: 35                   # 0 flat, 90 vertical
    azimuth: 180               # the way it faces: 90 E, 180 S, 270 W
```

"Sun on panels" (`panel_alignment`) shows how squarely the sun hits each panel right now,
as a percent of full direct sunlight. It ignores clouds and shading, so it isn't a power
estimate.

### Day and night card

```yaml
view: map                      # map | globe; the card has a Map and Globe switch too
layers: [twilight, tropics, sun]
center_longitude: 0            # map only: -180 to 180; 150 centers on Australia
markers: [person.alex]         # up to 8 person entities with a GPS position
```

People show where their phone last reported a GPS position; people without one are left
off. Home is always shown. The globe always faces home, so people on the far side of the
Earth are hidden until you switch to the map.

## License

MIT. Land outlines from [Natural Earth](https://www.naturalearthdata.com/) (public domain).
