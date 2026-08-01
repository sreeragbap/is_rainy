"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

/**
 * Light/dark switch.
 *
 * One button, no menu: it flips whatever is currently showing. The app starts
 * on the system theme, so the first tap simply overrides it from then on.
 * Which icon shows is decided by CSS (the `dark` class), not by React state —
 * the server does not know the theme, and this keeps hydration honest without
 * a mounted-state dance.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Switch between light and dark theme"
    >
      <SunIcon className="size-4 dark:hidden" aria-hidden />
      <MoonIcon className="hidden size-4 dark:block" aria-hidden />
    </Button>
  );
}
