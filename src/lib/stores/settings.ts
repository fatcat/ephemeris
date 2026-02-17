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
  location: UserLocation;
  recentLocations: UserLocation[];
}

const defaults: Settings = {
  themeId: 'charcoal',
  axialTilt: REAL_AXIAL_TILT,
  hardTerminator: false,
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
export const userLocation = writable<UserLocation>(initial.location);
export const recentLocations = writable<UserLocation[]>(initial.recentLocations);

axialTilt.subscribe((v) => {
  const s = loadSettings();
  s.axialTilt = v;
  saveSettings(s);
});

hardTerminator.subscribe((v) => {
  const s = loadSettings();
  s.hardTerminator = v;
  saveSettings(s);
});

showMinorGrid.subscribe((v) => {
  const s = loadSettings();
  s.showMinorGrid = v;
  saveSettings(s);
});

showMajorGrid.subscribe((v) => {
  const s = loadSettings();
  s.showMajorGrid = v;
  saveSettings(s);
});

showEquatorTropics.subscribe((v) => {
  const s = loadSettings();
  s.showEquatorTropics = v;
  saveSettings(s);
  // Labels can't show without lines
  if (!v) showEquatorTropicsLabels.set(false);
});

showEquatorTropicsLabels.subscribe((v) => {
  const s = loadSettings();
  s.showEquatorTropicsLabels = v;
  saveSettings(s);
});

showArcticCircles.subscribe((v) => {
  const s = loadSettings();
  s.showArcticCircles = v;
  saveSettings(s);
  // Labels can't show without lines
  if (!v) showArcticCirclesLabels.set(false);
});

showArcticCirclesLabels.subscribe((v) => {
  const s = loadSettings();
  s.showArcticCirclesLabels = v;
  saveSettings(s);
});

showContinentLabels.subscribe((v) => {
  const s = loadSettings();
  s.showContinentLabels = v;
  saveSettings(s);
});

showOceanLabels.subscribe((v) => {
  const s = loadSettings();
  s.showOceanLabels = v;
  saveSettings(s);
});

showSubsolarPoint.subscribe((v) => {
  const s = loadSettings();
  s.showSubsolarPoint = v;
  saveSettings(s);
});

showNightLights.subscribe((v) => {
  const s = loadSettings();
  s.showNightLights = v;
  saveSettings(s);
});

showSunInfo.subscribe((v) => {
  const s = loadSettings();
  s.showSunInfo = v;
  saveSettings(s);
});

useLocalTime.subscribe((v) => {
  const s = loadSettings();
  s.useLocalTime = v;
  saveSettings(s);
});

showGlobe.subscribe((v) => {
  const s = loadSettings();
  s.showGlobe = v;
  saveSettings(s);
});

showProjection.subscribe((v) => {
  const s = loadSettings();
  s.showProjection = v;
  saveSettings(s);
});

showOrrery.subscribe((v) => {
  const s = loadSettings();
  s.showOrrery = v;
  saveSettings(s);
});

currentThemeId.subscribe((v) => {
  const s = loadSettings();
  s.themeId = v;
  saveSettings(s);
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
  const s = loadSettings();
  s.location = v;
  // Add to recent locations (dedup by lat/lon, keep most recent first)
  const filtered = s.recentLocations.filter(
    (r) => !(r.lat === v.lat && r.lon === v.lon),
  );
  filtered.unshift(v);
  s.recentLocations = filtered.slice(0, MAX_RECENT_LOCATIONS);
  recentLocations.set(s.recentLocations);
  saveSettings(s);
  // Move camera to view from this latitude
  cameraLatitude.set(v.lat);
});
