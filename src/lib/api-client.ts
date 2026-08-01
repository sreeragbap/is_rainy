import type { ZodType } from "zod";

/**
 * Browser-side access to this app's own API.
 *
 * Every response is schema-validated, and every failure is turned into an
 * `ApiError` carrying the server's own message — so the UI can show what
 * actually went wrong instead of a generic apology.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const FALLBACK_MESSAGE = "Something went wrong. Please try again.";

async function request<T>(
  path: string,
  schema: ZodType<T>,
  init?: RequestInit & { signal?: AbortSignal },
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, init);
  } catch (error) {
    // A user-cancelled request is not a failure to report.
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError("You appear to be offline.", 0);
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error: unknown }).error)
        : FALLBACK_MESSAGE;
    throw new ApiError(message, response.status);
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) throw new ApiError(FALLBACK_MESSAGE, response.status);

  return parsed.data;
}

export function apiGet<T>(path: string, schema: ZodType<T>, signal?: AbortSignal): Promise<T> {
  return request(path, schema, { signal });
}

export function apiPost<T>(path: string, body: unknown, schema: ZodType<T>): Promise<T> {
  return request(path, schema, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
