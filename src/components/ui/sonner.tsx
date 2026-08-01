"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

/**
 * Toasts are used for one thing only: telling the user that an action they took
 * did not stick. Weather failures are shown inline on the card instead, because
 * a toast that disappears is the wrong place for the answer.
 */
export function Toaster() {
  // Follow the app's resolved theme, which may be a manual override of the OS.
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      position="bottom-center"
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      toastOptions={{
        classNames: {
          toast:
            "!bg-popover !text-popover-foreground !border-border !rounded-2xl !shadow-lg !font-sans",
          description: "!text-muted-foreground",
        },
      }}
    />
  );
}
