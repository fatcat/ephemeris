/**
 * Dev harness for the HA cards: loads the real card bundle entry, fakes the
 * parts of `hass` the cards read, and lets you flip home, theme and locale.
 * Not part of the card build.
 */

import '../index.js';
import { HOMES, THEMES, mockHass, type MockOptions } from './mockHass.js';

/** Stand-in for HA's own <ha-card> element */
class StubHaCard extends HTMLElement {
  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML =
      '<style>:host{display:block;background:var(--ha-card-background);border-radius:12px;' +
      'box-shadow:0 2px 6px rgba(0,0,0,.25);color:var(--primary-text-color)}</style><slot></slot>';
  }
}
customElements.define('ha-card', StubHaCard);

interface CardSetup {
  type: string;
  config: Record<string, unknown>;
}

const CARDS: CardSetup[] = [
  {
    type: 'ephemeris-sky-card',
    config: {
      controls: 'full',
      reset_after: 20,
      info: ['elevation', 'azimuth', 'noon_height', 'sunrise', 'sunset', 'panel_alignment'],
      panels: [
        { name: 'South roof', tilt: 35, azimuth: 180 },
        { name: 'Garage', tilt: 10, azimuth: 270 },
      ],
    },
  },
  {
    type: 'ephemeris-daynight-card',
    config: {
      controls: 'full',
      markers: ['person.alex', 'person.sam', 'person.kim'],
      info: ['status', 'sunrise', 'sunset', 'daylight', 'daylight_change', 'sun_overhead'],
    },
  },
  {
    type: 'ephemeris-daynight-card',
    config: {
      controls: 'compact',
      layers: ['tropics'],
      center_longitude: 150,
      info: ['status', 'civil_dawn', 'civil_dusk', 'golden_hour', 'solar_noon', 'daylight_change'],
    },
  },
  { type: 'ephemeris-sky-card', config: { title: false, controls: 'none', orientation: 'facing_sun', hour_markers: 'solar', paths: ['today'], info: ['elevation', 'azimuth', 'next_solstice'] } },
  { type: 'ephemeris-sky-card', config: { info: ['bogus'] } },
];

const options: MockOptions = { home: 'oslo', theme: 'dark', timeFormat: 'language', zonePref: 'server', language: 'en' };

const form = document.getElementById('harness-controls') as HTMLFormElement;
const main = document.getElementById('cards') as HTMLElement;

function select(name: keyof MockOptions, values: readonly string[]): string {
  const opts = values.map((v) => `<option value="${v}">${v}</option>`).join('');
  return `<label>${name} <select name="${name}">${opts}</select></label>`;
}

form.innerHTML = [
  select('home', Object.keys(HOMES)),
  select('theme', Object.keys(THEMES)),
  select('timeFormat', ['language', 'system', '12', '24']),
  select('zonePref', ['server', 'local']),
  select('language', ['en', 'en-GB', 'de', 'fr', 'nb']),
].join(' ');
for (const [k, v] of Object.entries(options)) (form.elements.namedItem(k) as HTMLSelectElement).value = v;

type CardElement = HTMLElement & { setConfig(c: unknown): void; hass: unknown };
const cards: CardElement[] = [];

for (const setup of CARDS) {
  const wrap = document.createElement('section');
  wrap.className = 'cell';
  const el = document.createElement(setup.type) as CardElement;
  try {
    el.setConfig({ type: `custom:${setup.type}`, ...setup.config });
    wrap.append(el);
    cards.push(el);
  } catch (err) {
    // HA shows setConfig errors in place of the card; mimic that
    const p = document.createElement('p');
    p.className = 'error';
    p.textContent = `${setup.type}: ${(err as Error).message}`;
    wrap.append(p);
  }
  main.append(wrap);
}

function apply(): void {
  const hass = mockHass(options);
  const theme = THEMES[options.theme];
  for (const [k, v] of Object.entries(theme)) document.body.style.setProperty(k, v);
  for (const el of cards) el.hass = hass;
}

form.addEventListener('change', (e) => {
  const t = e.target as HTMLSelectElement;
  (options as unknown as Record<string, string>)[t.name] = t.value;
  apply();
});

const style = document.createElement('style');
style.textContent = `
  body { margin: 0; padding: 16px; font-family: system-ui, sans-serif; background: var(--primary-background-color); color: var(--primary-text-color); }
  #harness-controls { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; font-size: 13px; }
  #cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 440px)); gap: 16px; align-items: start; }
  .error { color: #e57373; font-size: 14px; }
`;
document.head.append(style);

apply();
