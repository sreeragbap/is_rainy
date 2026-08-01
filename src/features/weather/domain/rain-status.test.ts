import { describe, expect, it } from "vitest";
import { classifyConditions, isWet, RAIN_RATE_MM_PER_HOUR, toneFor } from "./rain-status";

/**
 * The classifier decides what the hero card says, so these cases are the
 * product's contract with the user rather than incidental coverage.
 */

const dry = { precipitationMm: 0, snowfallCm: 0, weatherCode: 0 };

describe("classifyConditions", () => {
  it("reports dry under a clear sky", () => {
    expect(classifyConditions(dry)).toBe("dry");
  });

  it("escalates a thunderstorm above any rain rate", () => {
    // A storm outranks the rate thresholds: it changes the advice completely.
    expect(classifyConditions({ ...dry, precipitationMm: 0.2, weatherCode: 95 })).toBe("storm");
    expect(classifyConditions({ ...dry, precipitationMm: 20, weatherCode: 99 })).toBe("storm");
  });

  it("calls snow snow, even though melted snow registers as precipitation", () => {
    expect(classifyConditions({ precipitationMm: 3, snowfallCm: 1.2, weatherCode: 73 })).toBe(
      "snow",
    );
  });

  describe("rate thresholds", () => {
    const cases: [number, string][] = [
      [0.05, "dry"],
      [RAIN_RATE_MM_PER_HOUR.trace, "drizzle"],
      [2.4, "drizzle"],
      [RAIN_RATE_MM_PER_HOUR.moderate, "rain"],
      [7.5, "rain"],
      [RAIN_RATE_MM_PER_HOUR.heavy, "heavy-rain"],
      [40, "heavy-rain"],
    ];

    for (const [rate, expected] of cases) {
      it(`treats ${rate} mm/h as ${expected}`, () => {
        expect(classifyConditions({ ...dry, precipitationMm: rate })).toBe(expected);
      });
    }
  });

  it("trusts a light rate but lets the code separate rain from drizzle", () => {
    expect(classifyConditions({ ...dry, precipitationMm: 1, weatherCode: 61 })).toBe("rain");
    expect(classifyConditions({ ...dry, precipitationMm: 1, weatherCode: 51 })).toBe("drizzle");
    expect(classifyConditions({ ...dry, precipitationMm: 1, weatherCode: 80 })).toBe("rain");
  });

  it("still reports rain the gauge is too coarse to measure", () => {
    // The whole point of the product: a user at a door cares that something is
    // falling, even when the hourly total rounds to zero.
    expect(classifyConditions({ ...dry, precipitationMm: 0, weatherCode: 51 })).toBe("drizzle");
    expect(classifyConditions({ ...dry, precipitationMm: 0, weatherCode: 65 })).toBe("rain");
  });

  it("ignores a negative rate rather than propagating it", () => {
    expect(classifyConditions({ ...dry, precipitationMm: -5 })).toBe("dry");
  });
});

describe("tone and wetness", () => {
  it("gives heavy rain the same colour family as rain", () => {
    expect(toneFor("heavy-rain")).toBe("rain");
    expect(toneFor("rain")).toBe("rain");
  });

  it("treats every status except dry as wet", () => {
    expect(isWet("dry")).toBe(false);
    for (const status of ["drizzle", "rain", "heavy-rain", "storm", "snow"] as const) {
      expect(isWet(status)).toBe(true);
    }
  });
});
