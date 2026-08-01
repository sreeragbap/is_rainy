import { z } from "zod";

/**
 * The complete answer to "is it raining?" — conditions plus the one sentence of
 * advice derived from them.
 *
 * This is the contract between the server and the browser. The schema lives
 * beside the type so both sides validate against one definition: the client
 * parses API responses with it, and also parses whatever it finds in
 * localStorage, which may have been written by an older version of the app.
 */

export const nowcastSchema = z.object({
  minutesUntilRain: z.number().nullable(),
  minutesUntilDry: z.number().nullable(),
  horizonMinutes: z.number(),
  available: z.boolean(),
});

export const weatherSnapshotSchema = z.object({
  status: z.enum(["dry", "drizzle", "rain", "heavy-rain", "storm", "snow"]),
  tone: z.enum(["clear", "drizzle", "rain", "storm", "snow"]),
  isRaining: z.boolean(),
  temperature: z.number(),
  feelsLike: z.number(),
  precipitation: z.number(),
  windSpeed: z.number(),
  humidity: z.number(),
  isDay: z.boolean(),
  observedAt: z.string(),
  timezone: z.string(),
  nowcast: nowcastSchema,
  coordinates: z.object({ latitude: z.number(), longitude: z.number() }),
});

export const insightSchema = z.object({
  message: z.string(),
  urgency: z.enum(["calm", "caution", "warning"]),
  rule: z.string(),
});

export const weatherAnswerSchema = z.object({
  snapshot: weatherSnapshotSchema,
  insight: insightSchema,
  /** When the server produced this answer, ISO 8601 — drives "last updated". */
  fetchedAt: z.string(),
});

export type WeatherAnswer = z.infer<typeof weatherAnswerSchema>;
