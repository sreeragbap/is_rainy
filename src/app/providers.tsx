"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { WEATHER_CACHE_TTL_SECONDS } from "@/config/app";

/**
 * Client-side providers.
 *
 * The query client is created in state rather than at module scope so each
 * request on the server gets its own, and one visitor's data can never be
 * served to another.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: WEATHER_CACHE_TTL_SECONDS * 1000,
            // Conditions change while the app sits in a background tab, so a
            // returning user should see the current answer, not the old one.
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
            retry: 1,
          },
        },
      }),
  );

  return (
    // Follows the OS until the user chooses otherwise; the choice persists in
    // localStorage. Transitions are suspended during the swap so every surface
    // changes in the same frame instead of fading at its own pace.
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
