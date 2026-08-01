import { PrismaClient } from "@prisma/client";
import { databaseEnv } from "@/lib/env";

/**
 * Prisma client singleton, created on first use.
 *
 * Lazy because the database is optional: recents and favourites need it, the
 * core weather answer does not. Nothing should pay a connection or a missing
 * environment variable for a feature it never calls.
 *
 * The instance is cached on `globalThis` so development hot-reloads reuse one
 * connection pool instead of exhausting Supabase's pooler.
 */

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  // Validate first so a misconfigured URL reports itself clearly rather than
  // surfacing as an opaque connection failure later.
  databaseEnv();

  globalForPrisma.prisma = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  return globalForPrisma.prisma;
}
