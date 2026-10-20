// Values the card build (vite.card.config.ts) supplies

/** The land outline as SVG path data, made by the landPath plugin */
declare module 'virtual:ephemeris-land' {
  const d: string;
  export default d;
}

/** `cardVersion` from package.json, with "-dev" unless built by release-card.sh */
declare const __CARD_VERSION__: string;
