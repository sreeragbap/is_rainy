"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Last line of defence. Route-level failures are handled inside the screen; if
 * something escapes that, this keeps the page usable instead of blank.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[israiny] unhandled render error:", error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight text-balance">Something went wrong.</h1>
      <p className="max-w-sm text-balance text-muted-foreground">
        We couldn&apos;t load the page. Trying again usually fixes it.
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
