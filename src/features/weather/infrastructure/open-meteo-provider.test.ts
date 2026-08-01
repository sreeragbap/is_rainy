import { describe, expect, it } from "vitest";
import { NOWCAST_HORIZON_MINUTES } from "@/config/app";
import { buildNowcast } from "./open-meteo-provider";

/**
 * The nowcast window.
 *
 * Open-Meteo always prefixes the 15-minutely series with two past steps and the
 * in-progress one, so these tests are written around a realistic series rather
 * than an idealised one — that padding is exactly what broke this function
 * before.
 */

const NOW = 1_800_000_000;
const STEP = 900;

/** A series shaped like the real one: −30, −15, 0, +15, +30, +45 minutes. */
function series(precipitation: (number | null)[]) {
  return {
    minutely_15: {
      time: precipitation.map((_, index) => NOW + (index - 2) * STEP),
      precipitation,
    },
  };
}

describe("buildNowcast", () => {
  it("detects rain starting and rounds to a readable figure", () => {
    // Dry now; the step 30 minutes out is wet.
    const result = buildNowcast(series([0, 0, 0, 0, 0.4, 0]), false, NOW);

    expect(result.available).toBe(true);
    expect(result.minutesUntilRain).toBe(30);
    expect(result.minutesUntilDry).toBeNull();
  });

  it("detects rain stopping when currently wet", () => {
    const result = buildNowcast(series([0.5, 0.5, 0.5, 0.5, 0, 0]), true, NOW);

    expect(result.minutesUntilDry).toBe(30);
    expect(result.minutesUntilRain).toBeNull();
  });

  it("reports the first transition, not a later one", () => {
    const result = buildNowcast(series([0, 0, 0, 0.5, 0, 0.5]), false, NOW);
    expect(result.minutesUntilRain).toBe(15);
  });

  it("ignores the past and in-progress steps", () => {
    // Rain in the two past steps and the current one must not be read as a
    // forecast — that bug reported "rain in 0 minutes" and, worse, hid real
    // upcoming rain.
    const result = buildNowcast(series([9, 9, 9, 0, 0, 0]), false, NOW);
    expect(result.minutesUntilRain).toBeNull();
    expect(result.available).toBe(true);
  });

  it("never announces a transition closer than 5 minutes", () => {
    // The data is quarter-hourly; a smaller figure would imply precision the
    // forecast does not have.
    const almostNow = NOW + STEP - 60;
    const result = buildNowcast(series([0, 0, 0, 0.4, 0, 0]), false, almostNow);
    expect(result.minutesUntilRain).toBe(5);
  });

  it("looks no further ahead than the horizon", () => {
    // Wet only at +45 minutes, beyond the 30-minute horizon.
    const result = buildNowcast(series([0, 0, 0, 0, 0, 5]), false, NOW);
    expect(result.minutesUntilRain).toBeNull();
    expect(NOWCAST_HORIZON_MINUTES).toBeLessThan(45);
  });

  it("stays below the trigger for a negligible trace", () => {
    const result = buildNowcast(series([0, 0, 0, 0.05, 0.09, 0]), false, NOW);
    expect(result.minutesUntilRain).toBeNull();
  });

  it("marks itself unavailable when the provider omits the series", () => {
    const result = buildNowcast({ minutely_15: undefined }, false, NOW);
    expect(result.available).toBe(false);
    expect(result.minutesUntilRain).toBeNull();
  });

  it("skips null gaps instead of reading them as dry", () => {
    const result = buildNowcast(series([0, 0, 0, null, 0.4, 0]), false, NOW);
    expect(result.minutesUntilRain).toBe(30);
  });

  it("always reports the horizon it used", () => {
    expect(buildNowcast(series([0, 0, 0, 0, 0, 0]), false, NOW).horizonMinutes).toBe(
      NOWCAST_HORIZON_MINUTES,
    );
  });
});
