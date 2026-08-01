import type { ZodType } from "zod";

/**
 * Typed, fail-safe localStorage access.
 *
 * Used for two things only: the last selected place, and the last successful
 * weather answer so the app still shows something useful offline. Everything
 * read back is schema-validated, because storage may hold data written by an
 * older version of the app.
 *
 * Every operation is a no-op rather than a throw when storage is unavailable
 * (server rendering, Safari private mode, quota exceeded).
 */

export function readLocal<T>(key: string, schema: ZodType<T>): T | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;

    const parsed = schema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      window.localStorage.removeItem(key);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

export function writeLocal<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked. Losing a cache entry is not worth an error.
  }
}

export function removeLocal(key: string): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore.
  }
}

export const STORAGE_KEYS = {
  selectedPlace: "israiny:selected-place",
  lastAnswer: "israiny:last-answer",
} as const;
