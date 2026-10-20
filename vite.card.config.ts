import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Home Assistant card bundle: one ES module HA loads as a dashboard resource.
// HA only fetches the JS, so component CSS is injected by Svelte at runtime
// into each card's shadow root.
export default defineConfig({
  publicDir: false,
  plugins: [svelte({ compilerOptions: { css: 'injected' } })],
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
  },
});
