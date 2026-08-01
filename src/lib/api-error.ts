import { NextResponse } from "next/server";
import { UpstreamError } from "@/lib/http";

/**
 * One place that turns a thrown error into a response.
 *
 * Route handlers stay thin: they never decide status codes or invent user-facing
 * copy, so every endpoint fails the same way and no internal detail leaks.
 */

export interface ApiErrorBody {
  error: string;
}

/** A failure the client should show verbatim to the user. */
export class PublicError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "PublicError";
  }
}

export function errorResponse(error: unknown): NextResponse<ApiErrorBody> {
  if (error instanceof PublicError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof UpstreamError) {
    const status = error.kind === "timeout" ? 504 : 502;
    const message =
      error.kind === "timeout"
        ? "The weather service is taking too long to respond."
        : "The weather service is unavailable right now.";

    console.error(`[israiny] upstream ${error.kind}:`, error.message);
    return NextResponse.json({ error: message }, { status });
  }

  console.error("[israiny] unhandled route error:", error);
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}
