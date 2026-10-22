/** The land outline, parsed once however many cards or views use it */
let land: Promise<string> | null = null;

export function loadLand(): Promise<string> {
  land ??= import('virtual:ephemeris-land').then(
    (m) => m.default,
    (err: unknown) => {
      land = null; // try again next time
      throw err;
    },
  );
  return land;
}
