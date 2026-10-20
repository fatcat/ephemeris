/**
 * Turns a card description into a Home Assistant custom card element.
 *
 * Implements the HA card API (contributors.home-assistant.io/frontend/custom-ui):
 * setConfig, the hass setter, getCardSize, getGridOptions, getStubConfig and
 * getConfigForm, and registers the card in the card picker.
 */

import { mount, unmount, type Component } from 'svelte';
import { CardState } from './cardState.svelte.js';
import { CONTROLS, MAX_RESET_AFTER, parseSharedConfig } from './config.js';
import { homeFromHass, sameHome, type HassLike } from './home.js';
import { MAX_INFO, SHARED_INFO, type InfoDef } from './info.js';

const MINUTE_MS = 60_000;

export interface GridOptions {
  columns?: number | 'full';
  rows?: number | 'auto';
  min_columns?: number;
  max_columns?: number;
  min_rows?: number;
  max_rows?: number;
}

export interface CardDef {
  /** Element tag; YAML uses `custom:<type>` */
  type: string;
  name: string;
  description: string;
  defaultTitle: string;
  defaultInfo: readonly string[];
  /** Info boxes only this card offers */
  extraInfo?: Record<string, InfoDef>;
  component: Component<{ state: CardState }>;
  /** Masonry height in 50 px units */
  cardSize: number;
  gridOptions: GridOptions;
}

interface CustomCardEntry {
  type: string;
  name: string;
  description: string;
  preview: boolean;
  documentationURL?: string;
}

declare global {
  interface Window {
    customCards?: CustomCardEntry[];
  }
}

const DOCS_URL = 'https://github.com/fatcat/ephemeris#home-assistant-cards';

export function defineCard(def: CardDef): void {
  if (customElements.get(def.type)) return;

  const infoDefs: Record<string, InfoDef> = { ...SHARED_INFO, ...def.extraInfo };
  const infoIds = Object.keys(infoDefs);

  class EphemerisCard extends HTMLElement {
    #state = new CardState(def.defaultTitle, infoDefs);
    #app: Record<string, unknown> | null = null;
    #tick: ReturnType<typeof setTimeout> | undefined;

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }

    setConfig(raw: unknown): void {
      this.#state.config = parseSharedConfig(raw, infoIds, { info: def.defaultInfo });
    }

    set hass(hass: HassLike) {
      // HA sets this on every state change anywhere in the house: only react to our fields
      const home = homeFromHass(hass);
      if (!sameHome(home, this.#state.home)) this.#state.home = home;
    }

    connectedCallback(): void {
      if (!this.#app && this.shadowRoot) {
        this.#app = mount(def.component, { target: this.shadowRoot, props: { state: this.#state } });
      }
      document.addEventListener('visibilitychange', this.#onVisibility);
      this.#startTick();
    }

    disconnectedCallback(): void {
      document.removeEventListener('visibilitychange', this.#onVisibility);
      clearTimeout(this.#tick);
      if (this.#app) {
        void unmount(this.#app);
        this.#app = null;
      }
    }

    getCardSize(): number {
      return def.cardSize;
    }

    getGridOptions(): GridOptions {
      return def.gridOptions;
    }

    static getStubConfig() {
      return { controls: 'full', info: [...def.defaultInfo] };
    }

    static getConfigForm() {
      return {
        schema: [
          { name: 'title', selector: { text: {} } },
          {
            name: 'controls',
            selector: {
              select: {
                mode: 'dropdown',
                options: CONTROLS.map((value) => ({ value, label: CONTROL_LABELS[value] })),
              },
            },
          },
          {
            name: 'reset_after',
            selector: { number: { min: 0, max: MAX_RESET_AFTER, step: 5, mode: 'box', unit_of_measurement: 's' } },
          },
          {
            name: 'info',
            selector: {
              select: {
                multiple: true,
                reorder: true,
                options: infoIds.map((value) => ({ value, label: infoDefs[value].label })),
              },
            },
          },
        ],
        computeLabel: (field: { name: string }) => FORM_LABELS[field.name],
        computeHelper: (field: { name: string }) => FORM_HELPERS[field.name],
        assertConfig: (config: unknown) => {
          parseSharedConfig(config, infoIds, { info: def.defaultInfo });
        },
      };
    }

    /** Update `now` on each minute boundary while the page is visible */
    #startTick(): void {
      clearTimeout(this.#tick);
      this.#state.now = new Date();
      if (document.hidden) return;
      const wait = MINUTE_MS - (Date.now() % MINUTE_MS) + 50;
      this.#tick = setTimeout(() => this.#startTick(), wait);
    }

    #onVisibility = (): void => {
      if (document.hidden) clearTimeout(this.#tick);
      else this.#startTick();
    };
  }

  customElements.define(def.type, EphemerisCard);
  (window.customCards ??= []).push({
    type: def.type,
    name: def.name,
    description: def.description,
    preview: true,
    documentationURL: DOCS_URL,
  });
}

const CONTROL_LABELS: Record<(typeof CONTROLS)[number], string> = {
  none: 'None (always now)',
  compact: 'Play button only',
  full: 'Days, time slider and play',
};

const FORM_LABELS: Record<string, string> = {
  title: 'Title',
  controls: 'Controls',
  reset_after: 'Return to now after',
  info: `Info boxes (up to ${MAX_INFO})`,
};

const FORM_HELPERS: Record<string, string> = {
  title: 'Leave empty for the default. In YAML, title: false hides the header.',
  reset_after: 'Seconds without a touch before the card goes back to the current time. 0 keeps it where you left it.',
};
