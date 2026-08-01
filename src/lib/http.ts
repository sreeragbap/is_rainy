import type { ZodType } from "zod";
import { UPSTREAM_TIMEOUT_MS } from "@/config/app";

/**
 * A failure talking to an upstream provider. Carries enough detail for the
 * route handler to choose a status code, and nothing that would leak an
 * internal URL to the browser.
 */
export class UpstreamError extends Error {
  constructor(
    message: string,
    readonly kind: "timeout" | "network" | "status" | "malformed",
    readonly status?: number,
  ) {
    super(message);
    this.name = "UpstreamError";
  }
}

interface FetchJsonOptions<T> {
  /** Seconds Next.js should serve this response from the Data Cache; 0 bypasses it. */
  revalidateSeconds: number;
  /** Upstream payloads are validated, never trusted by shape assertion. */
  schema: ZodType<T>;
  timeoutMs?: number;
  /** Extra request headers, e.g. the identifying User-Agent Nominatim requires. */
  headers?: Record<string, string>;
}

/**
 * Fetch and validate JSON from an upstream provider.
 *
 * Every provider response passes through a schema so a silent contract change
 * upstream surfaces here as one clear error, rather than as `undefined`
 * rendering somewhere in the UI.
 */
export async function fetchJson<T>(url: string, options: FetchJsonOptions<T>): Promise<T> {
  const { revalidateSeconds, schema, timeoutMs = UPSTREAM_TIMEOUT_MS, headers } = options;

  let response: Response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: "application/json", ...headers },
      ...(revalidateSeconds > 0
        ? { next: { revalidate: revalidateSeconds } }
        : { cache: "no-store" as const }),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new UpstreamError(`Upstream timed out after ${timeoutMs}ms`, "timeout");
    }
    throw new UpstreamError("Could not reach the weather service", "network");
  }

  if (!response.ok) {
    throw new UpstreamError(`Upstream responded ${response.status}`, "status", response.status);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new UpstreamError("Upstream returned a malformed body", "malformed");
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new UpstreamError(
      `Upstream payload did not match the expected shape: ${parsed.error.issues
        .map((i) => i.path.join("."))
        .join(", ")}`,
      "malformed",
    );
  }

  return parsed.data;
}
