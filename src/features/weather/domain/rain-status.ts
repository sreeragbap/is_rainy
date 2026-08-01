import type { RainStatus, StatusTone } from "./types";

/**
 * Turning raw numbers into the answer.
 *
 * Two signals disagree in practice: measured precipitation and the provider's
 * weather code. Precipitation wins, because a user standing at a door cares
 * whether water is falling, not how a model labelled the hour. The code is used
 * to catch the case precipitation misses — rain too light to register a
 * measurable rate — and to escalate thunderstorms and snow.
 */

/**
 * Millimetres per hour. The moderate/heavy boundaries are the conventional
 * meteorological ones; 0.1 is the smallest rate a user would describe as
 * "it's spitting".
 *
 * `moderate` is also where this app draws the line between "drizzle" and
 * "rain". These statuses are decisions, not meteorology: below 2.5 mm/h a
 * person outside describes what they feel as drizzle, and saying "yes, it's
 * raining" there overstates the answer.
 */
export const RAIN_RATE_MM_PER_HOUR = {
  trace: 0.1,
  moderate: 2.5,
  heavy: 7.6,
} as const;

/**
 * Millimetres within one 15-minute nowcast step that count as rain starting.
 * Higher than a bare trace on purpose: predicting rain that never materialises
 * costs more trust than missing a few drops.
 */
export const NOWCAST_TRIGGER_MM_PER_STEP = 0.1;

/** WMO 4677 weather codes, grouped by what they mean for the answer. */
const WMO = {
  drizzle: new Set([51, 53, 55, 56, 57]),
  rain: new Set([61, 63, 65, 66, 67]),
  showers: new Set([80, 81, 82]),
  snow: new Set([71, 73, 75, 77, 85, 86]),
  thunderstorm: new Set([95, 96, 99]),
} as const;

const HEAVY_CODES = new Set([65, 67, 82]);

export interface Conditions {
  /** Total liquid precipitation rate, mm/h. */
  precipitationMm: number;
  /** Snowfall rate in centimetres, as Open-Meteo reports it. */
  snowfallCm: number;
  weatherCode: number;
}

const TONE_BY_STATUS: Record<RainStatus, StatusTone> = {
  dry: "clear",
  drizzle: "drizzle",
  rain: "rain",
  "heavy-rain": "rain",
  storm: "storm",
  snow: "snow",
};

export function toneFor(status: RainStatus): StatusTone {
  return TONE_BY_STATUS[status];
}

export function isWet(status: RainStatus): boolean {
  return status !== "dry";
}

/**
 * Classify current conditions into the single status the hero card shows.
 *
 * Order matters: a thunderstorm is the most decision-changing outcome, so it is
 * checked before rate thresholds that would otherwise report plain "rain".
 */
export function classifyConditions({
  precipitationMm,
  snowfallCm,
  weatherCode,
}: Conditions): RainStatus {
  if (WMO.thunderstorm.has(weatherCode)) return "storm";

  // Snow is checked before rain: `precipitation` includes melted snow, so a
  // snowy day would otherwise be reported as rain and get umbrella advice.
  if (snowfallCm > 0 || WMO.snow.has(weatherCode)) return "snow";

  const rate = Math.max(0, precipitationMm);

  if (rate >= RAIN_RATE_MM_PER_HOUR.heavy) return "heavy-rain";
  if (rate >= RAIN_RATE_MM_PER_HOUR.moderate) return "rain";

  const codeSaysRaining =
    WMO.rain.has(weatherCode) || WMO.showers.has(weatherCode) || WMO.drizzle.has(weatherCode);

  if (rate >= RAIN_RATE_MM_PER_HOUR.trace) {
    // Measurable but under the moderate boundary. The measured rate decides,
    // not the code: models routinely file a light hour under "slight rain"
    // (61) or "slight showers" (80) while the person standing in it would say
    // it is drizzling. Only a code for genuinely heavy conditions — which the
    // rate can miss when a burst is averaged across the interval — escalates.
    return HEAVY_CODES.has(weatherCode) ? "rain" : "drizzle";
  }

  // No measurable rate. Something can still be falling — codes describe
  // conditions an hourly total rounds away.
  if (codeSaysRaining) return HEAVY_CODES.has(weatherCode) ? "rain" : "drizzle";

  return "dry";
}
