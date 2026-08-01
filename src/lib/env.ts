import { z } from "zod";

/**
 * Environment validation — fails with a readable message naming the offending
 * variable, instead of failing deep inside a request or as a cryptic driver
 * error.
 *
 * Both accessors are lazy on purpose. The core answer ("is it raining?") needs
 * no credentials at all, so importing this module must never force variables
 * the current request does not actually use.
 */

const databaseSchema = z.object({
  DATABASE_URL: z
    .string()
    .url()
    .refine((v) => v.startsWith("postgres"), "DATABASE_URL must be a Postgres connection string"),
  DIRECT_URL: z
    .string()
    .url()
    .refine((v) => v.startsWith("postgres"), "DIRECT_URL must be a Postgres connection string"),
});

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

type DatabaseEnv = z.infer<typeof databaseSchema>;
type PublicEnv = z.infer<typeof publicSchema>;

function formatErrors(error: z.ZodError): string {
  return error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`).join("\n");
}

let cachedDatabaseEnv: DatabaseEnv | null = null;

/** Server-only. Validated the first time the database is actually touched. */
export function databaseEnv(): DatabaseEnv {
  if (typeof window !== "undefined") {
    throw new Error(
      "databaseEnv() was called in the browser. Connection strings never leave the server.",
    );
  }
  if (cachedDatabaseEnv) return cachedDatabaseEnv;

  const parsed = databaseSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Invalid database environment variables:\n${formatErrors(parsed.error)}\n\nSee .env.example.`,
    );
  }
  cachedDatabaseEnv = parsed.data;
  return cachedDatabaseEnv;
}

let cachedPublicEnv: PublicEnv | null = null;

/**
 * Safe in the browser — these values are public by definition. NEXT_PUBLIC_*
 * variables are inlined at build time, so they must be referenced explicitly
 * rather than read dynamically from process.env.
 */
export function publicEnv(): PublicEnv {
  if (cachedPublicEnv) return cachedPublicEnv;

  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  if (!parsed.success) {
    throw new Error(
      `Invalid public environment variables:\n${formatErrors(parsed.error)}\n\nSee .env.example.`,
    );
  }
  cachedPublicEnv = parsed.data;
  return cachedPublicEnv;
}
