import type { WeatherSnapshot } from "@/features/weather/domain/types";
import type { Insight } from "../domain/types";

/**
 * The advice engine.
 *
 * One sentence, chosen by the first matching rule. Order is the whole design:
 * rules are sorted by how much they should change what a user does next, so the
 * most consequential fact always wins and the user is never asked to weigh two
 * pieces of advice against each other.
 *
 * Pure and synchronous — given a snapshot it always returns the same sentence,
 * which is what makes it worth trusting.
 */

/** Wind strong enough to make an umbrella useless rather than merely awkward. */
const UMBRELLA_DEFEATING_WIND_KMH = 40;
/** Wind a user notices on foot even when dry. */
const NOTABLE_WIND_KMH = 30;
const OPPRESSIVE_FEELS_LIKE_C = 35;
const FREEZING_FEELS_LIKE_C = 0;

type Rule = (snapshot: WeatherSnapshot) => Insight | null;

const insight = (rule: string, urgency: Insight["urgency"], message: string): Insight => ({
  rule,
  urgency,
  message,
});

const rules: Rule[] = [
  // ── Currently wet ────────────────────────────────────────────────────────
  (s) =>
    s.status === "storm"
      ? insight("storm", "warning", "Thunderstorm outside. Wait it out if you can.")
      : null,

  (s) =>
    s.status === "heavy-rain" && s.windSpeed >= UMBRELLA_DEFEATING_WIND_KMH
      ? insight(
          "heavy-rain-windy",
          "warning",
          "Heavy rain and strong wind. An umbrella won't hold up.",
        )
      : null,

  (s) =>
    s.status === "heavy-rain"
      ? insight("heavy-rain", "warning", "Heavy rain outside. You'll get soaked without cover.")
      : null,

  (s) => (s.status === "snow" ? insight("snow", "caution", "Snow falling. Dress warm.") : null),

  // Rain that is about to stop is the one case where waiting beats leaving.
  (s) =>
    s.status === "rain" && s.nowcast.minutesUntilDry !== null && s.nowcast.minutesUntilDry <= 15
      ? insight(
          "rain-easing",
          "caution",
          `Raining now, but it should ease in about ${s.nowcast.minutesUntilDry} minutes.`,
        )
      : null,

  (s) =>
    s.status === "rain" && s.windSpeed >= UMBRELLA_DEFEATING_WIND_KMH
      ? insight("rain-windy", "warning", "Raining hard sideways. A jacket beats an umbrella.")
      : null,

  (s) => (s.status === "rain" ? insight("rain", "caution", "Take an umbrella.") : null),

  (s) =>
    s.status === "drizzle"
      ? insight("drizzle", "caution", "Light drizzle. A jacket is enough.")
      : null,

  // ── Currently dry ────────────────────────────────────────────────────────
  (s) =>
    s.nowcast.minutesUntilRain !== null && s.nowcast.minutesUntilRain <= 20
      ? insight(
          "rain-imminent",
          "caution",
          `Rain expected in about ${s.nowcast.minutesUntilRain} minutes. Take an umbrella.`,
        )
      : null,

  (s) =>
    s.nowcast.minutesUntilRain !== null
      ? insight(
          "rain-later",
          "calm",
          `Dry now. Rain likely in about ${s.nowcast.minutesUntilRain} minutes.`,
        )
      : null,

  (s) =>
    s.feelsLike >= OPPRESSIVE_FEELS_LIKE_C
      ? insight("dry-hot", "caution", "No umbrella needed, but the heat is punishing.")
      : null,

  (s) =>
    s.feelsLike <= FREEZING_FEELS_LIKE_C
      ? insight("dry-freezing", "caution", "Dry, but freezing. Wrap up before you head out.")
      : null,

  (s) =>
    s.windSpeed >= NOTABLE_WIND_KMH
      ? insight("dry-windy", "calm", "No rain, but it's blustery out there.")
      : null,
];

/** The advice shown when nothing above applies: the good case. */
const DEFAULT_INSIGHT = insight("dry", "calm", "No umbrella needed. Safe to walk outside.");

export function buildInsight(snapshot: WeatherSnapshot): Insight {
  for (const rule of rules) {
    const result = rule(snapshot);
    if (result) return result;
  }
  return DEFAULT_INSIGHT;
}
