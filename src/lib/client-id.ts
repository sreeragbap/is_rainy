import { cookies } from "next/headers";
import { z } from "zod";
import { CLIENT_ID_COOKIE, CLIENT_ID_MAX_AGE_SECONDS } from "@/config/app";

/**
 * Anonymous client identity.
 *
 * IsRainy has no accounts — asking someone to sign up before telling them
 * whether it is raining would defeat the product. A UUID in a first-party
 * cookie is enough to scope one person's recent searches and favourites, and
 * it is the only identifier the database ever sees.
 */

const uuidSchema = z.string().uuid();

/** Reads the existing client id, or null when this is a first visit. */
export async function readClientId(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(CLIENT_ID_COOKIE)?.value;
  if (!raw) return null;

  // The column is a Postgres uuid; a hand-edited cookie must not reach it.
  const parsed = uuidSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/**
 * Reads the client id, minting and persisting one if absent.
 * Only callable from a Route Handler or Server Action — Server Components
 * cannot write cookies.
 */
export async function ensureClientId(): Promise<string> {
  const existing = await readClientId();
  if (existing) return existing;

  const clientId = crypto.randomUUID();
  const store = await cookies();
  store.set(CLIENT_ID_COOKIE, clientId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CLIENT_ID_MAX_AGE_SECONDS,
  });

  return clientId;
}
