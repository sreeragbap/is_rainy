import { describe, expect, it } from "vitest";
import type { RainStatus, WeatherSnapshot } from "@/features/weather/domain/types";
import { buildInsight } from "./build-insight";

/**
 * The advice rules.
 *
 * Asserted by rule id rather than by wording, so the copy can be improved
 * without rewriting the suite — while the ordering, which is the actual design,
 * stays locked down.
 */

function snapshot(overrides: Partial<WeatherSnapshot> = {}): WeatherSnapshot {
  const status: RainStatus = overrides.status ?? "dry";
  return {
    status,
    tone: "clear",
    isRaining: status !== "dry",
    temperature: 22,
    feelsLike: 22,
    precipitation: 0,
    windSpeed: 8,
    humidity: 55,
    isDay: true,
    observedAt: "2026-07-30T12:00:00.000Z",
    timezone: "UTC",
    nowcast: {
      minutesUntilRain: null,
      minutesUntilDry: null,
      horizonMinutes: 30,
      available: true,
    },
    coordinates: { latitude: 0, longitude: 0 },
    ...overrides,
  };
}

describe("buildInsight", () => {
  it("recommends nothing when there is nothing to recommend", () => {
    expect(buildInsight(snapshot()).rule).toBe("dry");
  });

  it("tells the user to take an umbrella when it is raining", () => {
    const insight = buildInsight(snapshot({ status: "rain" }));
    expect(insight.rule).toBe("rain");
    expect(insight.message).toBe("Take an umbrella.");
  });

  it("puts a storm above everything else", () => {
    const insight = buildInsight(
      snapshot({ status: "storm", windSpeed: 90, feelsLike: 40, precipitation: 30 }),
    );
    expect(insight.rule).toBe("storm");
    expect(insight.urgency).toBe("warning");
  });

  it("warns that an umbrella is useless in heavy rain with strong wind", () => {
    expect(buildInsight(snapshot({ status: "heavy-rain", windSpeed: 55 })).rule).toBe(
      "heavy-rain-windy",
    );
    expect(buildInsight(snapshot({ status: "heavy-rain", windSpeed: 10 })).rule).toBe("heavy-rain");
  });

  it("suggests waiting when rain is about to ease", () => {
    const easing = snapshot({
      status: "rain",
      nowcast: { minutesUntilRain: null, minutesUntilDry: 10, horizonMinutes: 30, available: true },
    });
    const insight = buildInsight(easing);
    expect(insight.rule).toBe("rain-easing");
    expect(insight.message).toContain("10 minutes");
  });

  it("does not suggest waiting when the rain will not ease soon", () => {
    const persistent = snapshot({
      status: "rain",
      nowcast: { minutesUntilRain: null, minutesUntilDry: 30, horizonMinutes: 30, available: true },
    });
    expect(buildInsight(persistent).rule).toBe("rain");
  });

  it("warns about imminent rain while still dry", () => {
    const imminent = snapshot({
      nowcast: { minutesUntilRain: 20, minutesUntilDry: null, horizonMinutes: 30, available: true },
    });
    const insight = buildInsight(imminent);
    expect(insight.rule).toBe("rain-imminent");
    expect(insight.message).toContain("20 minutes");
  });

  it("softens the wording for rain that is further out", () => {
    const later = snapshot({
      nowcast: { minutesUntilRain: 30, minutesUntilDry: null, horizonMinutes: 30, available: true },
    });
    const insight = buildInsight(later);
    expect(insight.rule).toBe("rain-later");
    expect(insight.urgency).toBe("calm");
  });

  it("prefers rain advice over comfort advice", () => {
    // A user deciding on an umbrella is not helped by being told it is hot.
    const hotAndRaining = snapshot({ status: "drizzle", feelsLike: 39 });
    expect(buildInsight(hotAndRaining).rule).toBe("drizzle");
  });

  it("mentions heat and cold only when dry", () => {
    expect(buildInsight(snapshot({ feelsLike: 36 })).rule).toBe("dry-hot");
    expect(buildInsight(snapshot({ feelsLike: -3 })).rule).toBe("dry-freezing");
  });

  it("mentions wind when it is the only notable thing", () => {
    expect(buildInsight(snapshot({ windSpeed: 32 })).rule).toBe("dry-windy");
    expect(buildInsight(snapshot({ windSpeed: 20 })).rule).toBe("dry");
  });

  it("always produces exactly one sentence", () => {
    const statuses: RainStatus[] = ["dry", "drizzle", "rain", "heavy-rain", "storm", "snow"];
    for (const status of statuses) {
      const { message } = buildInsight(snapshot({ status }));
      expect(message.length).toBeGreaterThan(0);
      expect(message.trim()).toBe(message);
      expect(message.endsWith(".")).toBe(true);
    }
  });
});
