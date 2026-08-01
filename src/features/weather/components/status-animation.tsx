import { cn } from "@/lib/utils";
import type { RainStatus } from "../domain/types";

/**
 * The weather itself, drifting behind the headline.
 *
 * Ambience, not information: the words already carry the answer, so this layer
 * stays faint, colours itself from the card's tone accent (`bg-current`), and
 * never draws over the text. Lanes are a fixed table rather than random so the
 * server and client render identical markup, and every delay is negative so
 * the scene is already mid-fall when it appears — weather in progress, not
 * weather starting up.
 */

interface Lane {
  /** Horizontal position within the card. */
  left: string;
  /** Seconds already elapsed when the scene mounts (applied as a negative delay). */
  delay: number;
  /** Base duration multiplied by the status speed, so lanes never sync up. */
  duration: number;
}

const LANES: Lane[] = [
  { left: "6%", delay: 0.0, duration: 1.6 },
  { left: "14%", delay: 0.9, duration: 1.3 },
  { left: "23%", delay: 0.4, duration: 1.8 },
  { left: "31%", delay: 1.4, duration: 1.4 },
  { left: "40%", delay: 0.2, duration: 1.7 },
  { left: "48%", delay: 1.1, duration: 1.3 },
  { left: "57%", delay: 0.6, duration: 1.9 },
  { left: "65%", delay: 1.6, duration: 1.5 },
  { left: "74%", delay: 0.3, duration: 1.4 },
  { left: "82%", delay: 1.2, duration: 1.7 },
  { left: "90%", delay: 0.8, duration: 1.5 },
  { left: "96%", delay: 1.9, duration: 1.3 },
];

/** How hard it rains per status: how many lanes, how fast, and how heavy a drop. */
const RAINFALL: Partial<Record<RainStatus, { drops: number; speed: number; drop: string }>> = {
  drizzle: { drops: 6, speed: 1.9, drop: "h-3.5 w-px opacity-25" },
  rain: { drops: 9, speed: 1.2, drop: "h-5 w-0.5 opacity-35" },
  "heavy-rain": { drops: 12, speed: 0.85, drop: "h-6 w-0.5 opacity-45" },
  storm: { drops: 10, speed: 0.8, drop: "h-5 w-0.5 opacity-40" },
};

export function StatusAnimation({ status }: { status: RainStatus }) {
  if (status === "snow") {
    return (
      <>
        {LANES.slice(0, 9).map((lane) => (
          <span
            key={lane.left}
            className="absolute -top-4 size-1.5 animate-snow-drift rounded-full bg-current opacity-40"
            style={{
              left: lane.left,
              animationDelay: `-${lane.delay * 2.5}s`,
              animationDuration: `${lane.duration * 3.6}s`,
            }}
          />
        ))}
      </>
    );
  }

  const rain = RAINFALL[status];
  // Dry: the floating sun glyph is the whole show — an empty sky is the point.
  if (!rain) return null;

  return (
    <>
      {status === "storm" && <span className="absolute inset-0 animate-storm-flash bg-current" />}
      {LANES.slice(0, rain.drops).map((lane) => (
        <span
          key={lane.left}
          className={cn("absolute -top-8 animate-fall rounded-full bg-current", rain.drop)}
          style={{
            left: lane.left,
            animationDelay: `-${lane.delay}s`,
            animationDuration: `${lane.duration * rain.speed}s`,
          }}
        />
      ))}
    </>
  );
}
