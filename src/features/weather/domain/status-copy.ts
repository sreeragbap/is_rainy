import type { RainStatus } from "./types";

/**
 * The words and glyph for each answer.
 *
 * Kept in the domain rather than in a component because this vocabulary *is*
 * the product. One sentence, present tense, no hedging — a user reading the
 * headline alone should already know what to do.
 */

export interface StatusCopy {
  /** Carries the answer before any text is read. */
  glyph: string;
  /** The hero line. Complete sentence, because the app is answering a question. */
  headline: string;
  /** Screen-reader and document-title text, without the glyph. */
  label: string;
}

const COPY: Record<RainStatus, StatusCopy> = {
  dry: {
    glyph: "☀️",
    headline: "No, it isn't raining.",
    label: "Not raining",
  },
  drizzle: {
    glyph: "🌦️",
    headline: "Light drizzle.",
    label: "Light drizzle",
  },
  rain: {
    glyph: "🌧️",
    headline: "Yes, it's raining.",
    label: "Raining",
  },
  "heavy-rain": {
    glyph: "🌧️",
    headline: "Heavy rain.",
    label: "Heavy rain",
  },
  storm: {
    glyph: "⛈️",
    headline: "Thunderstorm.",
    label: "Thunderstorm",
  },
  snow: {
    glyph: "🌨️",
    headline: "It's snowing.",
    label: "Snowing",
  },
};

export function statusCopy(status: RainStatus): StatusCopy {
  return COPY[status];
}
