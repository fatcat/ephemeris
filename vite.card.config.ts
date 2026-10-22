import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { landPathData } from './src/ha-card/geo/landPath.js';

const LAND_ID = 'virtual:ephemeris-land';
const LAND_SOURCE = new URL('./src/assets/geo/land.json', import.meta.url);

// Cards are versioned apart from the app. Only release builds carry the bare number,
// so a copied-in test build can't pass for a release in the browser console.
const { cardVersion } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const CARD_VERSION = process.env.EPHEMERIS_CARD_RELEASE === '1' ? cardVersion : `${cardVersion}-dev`;

/** The land outline as an SVG path string, made from Natural Earth data at build time */
function landPath(): Plugin {
  return {
    name: 'ephemeris-land',
    resolveId: (id) => (id === LAND_ID ? `\0${LAND_ID}` : undefined),
    load(id) {
      if (id !== `\0${LAND_ID}`) return undefined;
      this.addWatchFile(LAND_SOURCE.pathname);
      const d = landPathData(JSON.parse(readFileSync(LAND_SOURCE, 'utf8')));
      return `export default ${JSON.stringify(d)};`;
    },
  };
}

// Home Assistant card bundle: one ES module HA loads as a dashboard resource.
// Kept to a single file so a manual install is one file to copy and a release
// is one asset. HA only fetches the JS, so component CSS is injected by Svelte
// at runtime into each card's shadow root.
export default defineConfig({
  publicDir: false,
  plugins: [svelte({ compilerOptions: { css: 'injected' } }), landPath()],
  define: { __CARD_VERSION__: JSON.stringify(CARD_VERSION) },
  server: { open: '/card-dev.html' },
  build: {
    outDir: 'dist-card',
    emptyOutDir: true,
    target: 'es2022',
    lib: {
      entry: 'src/ha-card/index.ts',
      formats: ['es'],
      fileName: () => 'ephemeris-cards.js',
    },
    rollupOptions: {
      // The land outline's dynamic import stays in this file instead of a chunk
      output: { inlineDynamicImports: true },
    },
  },
});
