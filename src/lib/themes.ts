/**
 * Theme definitions and application logic.
 *
 * Each theme provides CSS custom property values, a Three.js clear color,
 * and a neutral map brightness multiplier (for subtle texture dimming on
 * dark themes).
 */

export interface Theme {
  id: string;
  name: string;
  group: 'dark' | 'light';
  colors: {
    bg: string;
    surface: string;
    text: string;
    textMuted: string;
    accent: string;
    border: string;
    overlayBg: string;
  };
  clearColor: number;
  mapBrightness: number;
}

export const THEMES: Theme[] = [
  // ── Dark themes ──────────────────────────────────────────
  {
    id: 'midnight',
    name: 'Midnight',
    group: 'dark',
    colors: {
      bg: '#1a1a2e',
      surface: '#16213e',
      text: '#e0e0e0',
      textMuted: '#8a8a9a',
      accent: '#d4a44c',
      border: '#2a2a4e',
      overlayBg: 'rgba(26, 26, 46, 0.85)',
    },
    clearColor: 0x1a1a2e,
    mapBrightness: 0.92,
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    group: 'dark',
    colors: {
      bg: '#121215',
      surface: '#1a1a1d',
      text: '#d8d8d8',
      textMuted: '#808088',
      accent: '#d4a44c',
      border: '#2a2a2e',
      overlayBg: 'rgba(18, 18, 21, 0.88)',
    },
    clearColor: 0x121215,
    mapBrightness: 0.90,
  },
  {
    id: 'charcoal',
    name: 'Charcoal',
    group: 'dark',
    colors: {
      bg: '#1e1e1e',
      surface: '#2a2a2a',
      text: '#dcdcdc',
      textMuted: '#8c8c8c',
      accent: '#d4a44c',
      border: '#3a3a3a',
      overlayBg: 'rgba(30, 30, 30, 0.88)',
    },
    clearColor: 0x1e1e1e,
    mapBrightness: 0.92,
  },
  {
    id: 'slate',
    name: 'Slate',
    group: 'dark',
    colors: {
      bg: '#1c2028',
      surface: '#252b35',
      text: '#d8dce4',
      textMuted: '#8890a0',
      accent: '#d4a44c',
      border: '#343c4c',
      overlayBg: 'rgba(28, 32, 40, 0.88)',
    },
    clearColor: 0x1c2028,
    mapBrightness: 0.92,
  },
  {
    id: 'forest',
    name: 'Forest',
    group: 'dark',
    colors: {
      bg: '#141e18',
      surface: '#1a2820',
      text: '#d0dcd4',
      textMuted: '#7a8e80',
      accent: '#d4a44c',
      border: '#2a3e30',
      overlayBg: 'rgba(20, 30, 24, 0.88)',
    },
    clearColor: 0x141e18,
    mapBrightness: 0.92,
  },
  {
    id: 'cocoa',
    name: 'Cocoa',
    group: 'dark',
    colors: {
      bg: '#1e1612',
      surface: '#28201a',
      text: '#dcd4cc',
      textMuted: '#908070',
      accent: '#d4a44c',
      border: '#3a302a',
      overlayBg: 'rgba(30, 22, 18, 0.88)',
    },
    clearColor: 0x1e1612,
    mapBrightness: 0.92,
  },

  // ── Light themes ─────────────────────────────────────────
  {
    id: 'parchment',
    name: 'Parchment',
    group: 'light',
    colors: {
      bg: '#f5f0e8',
      surface: '#ebe5d8',
      text: '#2c2416',
      textMuted: '#7a7060',
      accent: '#9a7030',
      border: '#d0c8b8',
      overlayBg: 'rgba(245, 240, 232, 0.90)',
    },
    clearColor: 0xf5f0e8,
    mapBrightness: 1.0,
  },
  {
    id: 'cloud',
    name: 'Cloud',
    group: 'light',
    colors: {
      bg: '#eef0f4',
      surface: '#e2e5ea',
      text: '#1c2028',
      textMuted: '#6a7080',
      accent: '#9a7030',
      border: '#c8ccd4',
      overlayBg: 'rgba(238, 240, 244, 0.90)',
    },
    clearColor: 0xeef0f4,
    mapBrightness: 1.0,
  },
  {
    id: 'sand',
    name: 'Sand',
    group: 'light',
    colors: {
      bg: '#f2ece0',
      surface: '#e8e0d0',
      text: '#2a2418',
      textMuted: '#7c7468',
      accent: '#9a7030',
      border: '#cec4b0',
      overlayBg: 'rgba(242, 236, 224, 0.90)',
    },
    clearColor: 0xf2ece0,
    mapBrightness: 1.0,
  },
  {
    id: 'ivory',
    name: 'Ivory',
    group: 'light',
    colors: {
      bg: '#faf8f5',
      surface: '#f0ede8',
      text: '#28261e',
      textMuted: '#787568',
      accent: '#9a7030',
      border: '#d8d4cc',
      overlayBg: 'rgba(250, 248, 245, 0.90)',
    },
    clearColor: 0xfaf8f5,
    mapBrightness: 1.0,
  },
  {
    id: 'frost',
    name: 'Frost',
    group: 'light',
    colors: {
      bg: '#eef3f8',
      surface: '#e0e8f0',
      text: '#1a2230',
      textMuted: '#687888',
      accent: '#9a7030',
      border: '#c4d0dc',
      overlayBg: 'rgba(238, 243, 248, 0.90)',
    },
    clearColor: 0xeef3f8,
    mapBrightness: 1.0,
  },
  {
    id: 'chalk',
    name: 'Chalk',
    group: 'light',
    colors: {
      bg: '#f5f5f5',
      surface: '#eaeaea',
      text: '#222222',
      textMuted: '#707070',
      accent: '#9a7030',
      border: '#cccccc',
      overlayBg: 'rgba(245, 245, 245, 0.90)',
    },
    clearColor: 0xf5f5f5,
    mapBrightness: 1.0,
  },
];

export function getThemeById(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

/** Apply a theme by setting CSS custom properties on the document root. */
export function applyTheme(theme: Theme): void {
  const s = document.documentElement.style;
  s.setProperty('--color-bg', theme.colors.bg);
  s.setProperty('--color-surface', theme.colors.surface);
  s.setProperty('--color-text', theme.colors.text);
  s.setProperty('--color-text-muted', theme.colors.textMuted);
  s.setProperty('--color-accent', theme.colors.accent);
  s.setProperty('--color-border', theme.colors.border);
  s.setProperty('--color-overlay-bg', theme.colors.overlayBg);
}
