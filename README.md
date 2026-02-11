# Ephemeris

Interactive 3D visualization of Earth's day/night cycle and seasons. Built as a Progressive Web App for classroom use with kids ages 8+.

Features a 3D globe and synchronized equirectangular projection showing the day/night terminator, computed from the sun's position using [Jean Meeus](https://en.wikipedia.org/wiki/Jean_Meeus) algorithms. Includes time controls (smooth sweep and day-snap modes), geographic overlays (coastlines, rivers, lakes), latitude reference lines (equator, tropics, arctic circles), and per-location sun data (sunrise, sunset, elevation, azimuth).

## Tech Stack

- Svelte 5 (runes mode) + TypeScript
- Three.js (WebGL)
- Vite + vite-plugin-pwa

## Development

```bash
npm install
npm run dev          # dev server with HMR
npm run build        # production build
npm run check        # type checking (svelte-check)
npm run lint         # eslint
```

## Docker

### Build and run

```bash
docker build -t ephemeris .
docker run -p 8080:80 ephemeris
```

Or with Docker Compose:

```bash
docker compose up -d          # build and start
docker compose down            # stop
docker compose up -d --build   # rebuild after changes
```

The app will be available at `http://localhost:8181`.

### How the image works

The Dockerfile uses a two-stage build:

1. **Build stage** (`node:22-alpine`) — installs npm dependencies from `package-lock.json` and runs `npm run build` to produce static files in `dist/`
2. **Serve stage** (`nginx:alpine`) — serves the static output with gzip compression, SPA fallback routing, and aggressive caching for Vite-hashed assets

Final image size is ~63 MB.

### Updating dependencies

Some bundled data ages over time:

- **Timezone boundaries** (`@photostructure/tz-lookup`) — IANA timezone data updates a few times per year as countries adjust timezone rules
- **npm packages** — periodic security patches

To update:

```bash
npm update              # update packages within semver ranges
npm run build           # verify the build still passes
npm run check           # verify types
docker build -t ephemeris .   # rebuild the image
```

No external data is fetched at runtime. All textures, timezone data, and solar algorithms are bundled at build time. Rebuilding the image a couple of times per year is sufficient to stay current.

## License

All textures and geographic data are public domain (Natural Earth, NASA). Code is MIT.
