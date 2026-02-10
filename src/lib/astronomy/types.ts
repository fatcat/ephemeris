export interface SolarPosition {
  /** Solar declination in radians */
  declination: number;
  /** Solar right ascension in radians */
  rightAscension: number;
  /** Apparent ecliptic longitude in radians */
  apparentLongitude: number;
  /** Obliquity of the ecliptic in radians */
  obliquity: number;
}
