/**
 * Settings store — user preferences persisted to localStorage.
 */

import { writable, derived } from 'svelte/store';
import { lookupTimezone } from '../utils/timezone.js';

const STORAGE_KEY = 'ephemeris-settings';

export type ViewMode = 'globe' | 'projection' | 'both';

export interface UserLocation {
  name: string;
  lat: number;
  lon: number;
}

const MAX_RECENT_LOCATIONS = 3;

/** Earth's real axial tilt in degrees */
export const REAL_AXIAL_TILT = 23.44;

interface Settings {
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
  viewMode: ViewMode;
  location: UserLocation;
  recentLocations: UserLocation[];
}

const defaults: Settings = {
  axialTilt: REAL_AXIAL_TILT,
  hardTerminator: false,
  showMinorGrid: true,
  showMajorGrid: true,
  showEquatorTropics: true,
  showEquatorTropicsLabels: true,
  showArcticCircles: true,
  showArcticCirclesLabels: true,
  showContinentLabels: true,
  showOceanLabels: true,
  showSubsolarPoint: true,
  showNightLights: true,
  showSunInfo: true,
  useLocalTime: false,
  viewMode: 'both',
  location: { name: '', lat: 0, lon: 0 },
  recentLocations: [],
};

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
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
export const viewMode = writable<ViewMode>(initial.viewMode);
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

viewMode.subscribe((v) => {
  const s = loadSettings();
  s.viewMode = v;
  saveSettings(s);
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
