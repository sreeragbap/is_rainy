import type { StatusTone } from "../domain/types";

/**
 * How each answer colours the screen.
 *
 * Written as complete class strings rather than composed at runtime, because
 * Tailwind only ships classes it can see in the source. A lookup table also
 * makes the palette reviewable in one place.
 */

export interface ToneStyle {
  /** Top-of-page wash, fading into the page background. */
  wash: string;
  /** Soft blob behind the hero, giving the card something to sit against. */
  blob: string;
  /** Used for the glyph halo and emphasis inside the insight line. */
  accent: string;
  /** Border tint on the hero card. */
  border: string;
}

export const TONE_STYLES: Record<StatusTone, ToneStyle> = {
  clear: {
    wash: "from-status-clear-soft",
    blob: "bg-status-clear-soft",
    accent: "text-status-clear",
    border: "border-status-clear/20",
  },
  drizzle: {
    wash: "from-status-drizzle-soft",
    blob: "bg-status-drizzle-soft",
    accent: "text-status-drizzle",
    border: "border-status-drizzle/20",
  },
  rain: {
    wash: "from-status-rain-soft",
    blob: "bg-status-rain-soft",
    accent: "text-status-rain",
    border: "border-status-rain/20",
  },
  storm: {
    wash: "from-status-storm-soft",
    blob: "bg-status-storm-soft",
    accent: "text-status-storm",
    border: "border-status-storm/25",
  },
  snow: {
    wash: "from-status-snow-soft",
    blob: "bg-status-snow-soft",
    accent: "text-status-snow",
    border: "border-status-snow/20",
  },
};

/** Neutral styling for the states that have no answer yet. */
export const NEUTRAL_TONE: ToneStyle = {
  wash: "from-muted",
  blob: "bg-muted",
  accent: "text-muted-foreground",
  border: "border-border",
};

export function toneStyle(tone: StatusTone | null): ToneStyle {
  return tone ? TONE_STYLES[tone] : NEUTRAL_TONE;
}
