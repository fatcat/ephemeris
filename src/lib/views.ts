/**
 * View registry: the single list of views the layout and the view toggles read from.
 * Order here is the canonical order views appear in when first switched on.
 */

import { derived, type Writable } from 'svelte/store';
import { showGlobe, showProjection, showOrrery, showSundial, showSkydome } from './stores/settings.js';

export type ViewId = 'globe' | 'projection' | 'orrery' | 'sundial' | 'skydome';

export interface ViewDef {
  id: ViewId;
  /** Short toggle button text */
  label: string;
  /** Full name for screen readers and messages */
  name: string;
  /** Visibility store, persisted in settings */
  store: Writable<boolean>;
}

export const VIEWS: readonly ViewDef[] = [
  { id: 'globe', label: 'Globe', name: 'globe', store: showGlobe },
  { id: 'projection', label: 'Proj', name: 'projection', store: showProjection },
  { id: 'orrery', label: 'Orrery', name: 'orrery', store: showOrrery },
  { id: 'sundial', label: 'Dial', name: 'sundial', store: showSundial },
  { id: 'skydome', label: 'Sky', name: 'sky dome', store: showSkydome },
];

/** The layout has arrangements for 1 to 4 views. */
export const MAX_ACTIVE_VIEWS = 4;

/** Ids of the views currently switched on, in canonical order. */
export const activeViewIds = derived(
  VIEWS.map((v) => v.store),
  (visible) => VIEWS.filter((_, i) => visible[i]).map((v) => v.id),
);
