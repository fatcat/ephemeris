/**
 * Settings store — user preferences persisted to localStorage.
 */

import { writable, derived } from 'svelte/store';
import { lookupTimezone } from '../utils/timezone.js';
import { applyTheme, getThemeById } from '../themes.js';

const STORAGE_KEY = 'ephemeris-settings';

export interface UserLocation {
  name: string;
  lat: number;
  lon: number;
}

const MAX_RECENT_LOCATIONS = 3;

/** Earth's real axial tilt in degrees */
export const REAL_AXIAL_TILT = 23.44;

interface Settings {
  themeId: string;
  axialTilt: number;
  hardTerminator: boolean;
  showMinorGrid: boolean;
  showMajorGrid: boolean;
  showEquatorTropics: boolean;
  showEquatorTropicsLabels: boolean;
  showArcticCircles: boolean;
  showArcticCirclesLabels: boolean;
  showContinentLabels: boolean;
  showOceanLabels: boolean;
  showSubsolarPoint: boolean;
  showNightLights: boolean;
  showSunInfo: boolean;
  useLocalTime: boolean;
  showGlobe: boolean;
  showProjection: boolean;
  showOrrery: boolean;
  showSundial: boolean;
  showSettingsPanel: boolean;
  location: UserLocation;
  recentLocations: UserLocation[];
}

const defaults: Settings = {
  themeId: 'charcoal',
  axialTilt: REAL_AXIAL_TILT,
  hardTerminator: true,
  showMinorGrid: false,
  showMajorGrid: true,
  showEquatorTropics: false,
  showEquatorTropicsLabels: false,
  showArcticCircles: false,
  showArcticCirclesLabels: false,
  showContinentLabels: true,
  showOceanLabels: false,
  showSubsolarPoint: true,
  showNightLights: true,
  showSunInfo: true,
  useLocalTime: true,
  showGlobe: true,
  showProjection: true,
  showOrrery: false,
  showSundial: false,
  showSettingsPanel: true,
  location: { name: '', lat: 0, lon: 0 },
  recentLocations: [],
};

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migrate old viewMode enum to independent booleans
      if ('viewMode' in parsed && !('showGlobe' in parsed)) {
        const vm = parsed.viewMode as string;
        parsed.showGlobe = vm === 'globe' || vm === 'both';
        parsed.showProjection = vm === 'projection' || vm === 'both';
        parsed.showOrrery = false;
        delete parsed.viewMode;
      }
      return { ...defaults, ...parsed };
    }
  } catch {
    // ignore
  }
  return { ...defaults };
}

function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

const initial = loadSettings();

/** In-memory settings cache — avoids stale reads from localStorage */
let cached = { ...initial };

function updateAndSave(updater: (s: Settings) => void): void {
  updater(cached);
  saveSettings(cached);
}

export const currentThemeId = writable<string>(initial.themeId);

// Apply the saved theme immediately so CSS vars are set before first paint
applyTheme(getThemeById(initial.themeId));

export const axialTilt = writable<number>(initial.axialTilt);
export const hardTerminator = writable<boolean>(initial.hardTerminator);
export const showMinorGrid = writable<boolean>(initial.showMinorGrid);
export const showMajorGrid = writable<boolean>(initial.showMajorGrid);
export const showEquatorTropics = writable<boolean>(initial.showEquatorTropics);
export const showEquatorTropicsLabels = writable<boolean>(initial.showEquatorTropicsLabels);
export const showArcticCircles = writable<boolean>(initial.showArcticCircles);
export const showArcticCirclesLabels = writable<boolean>(initial.showArcticCirclesLabels);
export const showContinentLabels = writable<boolean>(initial.showContinentLabels);
export const showOceanLabels = writable<boolean>(initial.showOceanLabels);
export const showSubsolarPoint = writable<boolean>(initial.showSubsolarPoint);
export const showNightLights = writable<boolean>(initial.showNightLights);
export const showSunInfo = writable<boolean>(initial.showSunInfo);
export const useLocalTime = writable<boolean>(initial.useLocalTime);
export const showGlobe = writable<boolean>(initial.showGlobe);
export const showProjection = writable<boolean>(initial.showProjection);
export const showOrrery = writable<boolean>(initial.showOrrery);
export const showSundial = writable<boolean>(initial.showSundial);
export const showSettingsPanel = writable<boolean>(initial.showSettingsPanel);
export const userLocation = writable<UserLocation>(initial.location);
export const recentLocations = writable<UserLocation[]>(initial.recentLocations);

/** Sync a writable store to the persisted settings cache. */
function syncSetting<K extends keyof Settings>(
  store: import('svelte/store').Writable<Settings[K]>, key: K,
) {
  store.subscribe((v) => updateAndSave((s) => { s[key] = v; }));
}

// Plain-persist settings — value changes are saved automatically
const syncedSettings: [import('svelte/store').Writable<unknown>, keyof Settings][] = [
  [axialTilt, 'axialTilt'],
  [hardTerminator, 'hardTerminator'],
  [showMinorGrid, 'showMinorGrid'],
  [showMajorGrid, 'showMajorGrid'],
  [showEquatorTropicsLabels, 'showEquatorTropicsLabels'],
  [showArcticCirclesLabels, 'showArcticCirclesLabels'],
  [showContinentLabels, 'showContinentLabels'],
  [showOceanLabels, 'showOceanLabels'],
  [showSubsolarPoint, 'showSubsolarPoint'],
  [showNightLights, 'showNightLights'],
  [showSunInfo, 'showSunInfo'],
  [useLocalTime, 'useLocalTime'],
  [showGlobe, 'showGlobe'],
  [showProjection, 'showProjection'],
  [showOrrery, 'showOrrery'],
  [showSundial, 'showSundial'],
  [showSettingsPanel, 'showSettingsPanel'],
];
for (const [store, key] of syncedSettings) syncSetting(store as import('svelte/store').Writable<Settings[typeof key]>, key);

// Settings with side effects — must remain explicit
showEquatorTropics.subscribe((v) => {
  updateAndSave((s) => { s.showEquatorTropics = v; });
  if (!v) showEquatorTropicsLabels.set(false);
});
showArcticCircles.subscribe((v) => {
  updateAndSave((s) => { s.showArcticCircles = v; });
  if (!v) showArcticCirclesLabels.set(false);
});

currentThemeId.subscribe((v) => {
  updateAndSave((s) => { s.themeId = v; });
  applyTheme(getThemeById(v));
});

/**
 * Camera latitude — the ecliptic-relative pitch of the globe camera.
 * Not persisted; follows userLocation by default, but can be overridden
 * by the camera presets (Equator, Cancer, Capricorn).
 */
export const cameraLatitude = writable<number>(initial.location.lat);

/**
 * Derived IANA timezone name for the current user location.
 * Automatically updates when the location changes.
 */
export const userTimezone = derived(userLocation, ($loc) => lookupTimezone($loc.lat, $loc.lon));

userLocation.subscribe((v) => {
  updateAndSave((s) => {
    s.location = v;
    // Add to recent locations (dedup by lat/lon, keep most recent first)
    const filtered = s.recentLocations.filter(
      (r) => !(r.lat === v.lat && r.lon === v.lon),
    );
    filtered.unshift(v);
    s.recentLocations = filtered.slice(0, MAX_RECENT_LOCATIONS);
  });
  recentLocations.set(cached.recentLocations);
  // Move camera to view from this latitude
  cameraLatitude.set(v.lat);
});
