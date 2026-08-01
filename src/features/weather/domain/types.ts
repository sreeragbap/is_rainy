/**
 * The weather domain. Pure types, no framework and no provider.
 *
 * Deliberately narrow: this app answers one question, so the domain models the
 * answer, not the weather. Anything a user cannot act on while deciding whether
 * to step outside does not belong here.
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * The answer. Ordered by how much it should change someone's mind:
 * `dry` needs nothing, `storm` means stay in.
 */
export type RainStatus = "dry" | "drizzle" | "rain" | "heavy-rain" | "storm" | "snow";

/** Which colour family the whole screen adopts. Maps to the status tokens. */
export type StatusTone = "clear" | "drizzle" | "rain" | "storm" | "snow";

/** What the next half hour looks like, in the only terms that matter. */
export interface Nowcast {
  /** Minutes until rain starts, when currently dry. */
  minutesUntilRain: number | null;
  /** Minutes until rain stops, when currently wet. */
  minutesUntilDry: number | null;
  /** How far ahead we looked, so the UI never implies more certainty. */
  horizonMinutes: number;
  /** False when the provider gave us no usable nowcast for this location. */
  available: boolean;
}

export interface WeatherSnapshot {
  status: RainStatus;
  tone: StatusTone;
  /** Convenience for the many places that only care about wet vs dry. */
  isRaining: boolean;

  /** Celsius. */
  temperature: number;
  /** Celsius, apparent temperature. */
  feelsLike: number;
  /** Millimetres per hour of liquid precipitation. */
  precipitation: number;
  /** Kilometres per hour. */
  windSpeed: number;
  /** Percent. */
  humidity: number;

  isDay: boolean;
  /** ISO 8601, UTC — when the provider observed these conditions. */
  observedAt: string;
  /** IANA zone of the location, for rendering local times. */
  timezone: string;

  nowcast: Nowcast;
  coordinates: Coordinates;
}
