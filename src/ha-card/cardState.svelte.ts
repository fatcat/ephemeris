/**
 * Reactive state the card element hands to its Svelte tree.
 * The element writes it; components only read.
 */

import type { CardConfig } from './config.js';
import type { HomeContext } from './home.js';
import type { InfoDef } from './info.js';

export class CardState {
  config = $state.raw<CardConfig | null>(null);
  home = $state.raw<HomeContext | null>(null);
  // Replaced every minute, never mutated, so a plain Date is enough
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  now = $state.raw(new Date());
  /** Shared and card-specific info boxes this card can show */
  infoDefs: Record<string, InfoDef>;
  defaultTitle: string;

  constructor(defaultTitle: string, infoDefs: Record<string, InfoDef>) {
    this.defaultTitle = defaultTitle;
    this.infoDefs = infoDefs;
  }
}
