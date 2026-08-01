import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Tests cover the pure decision logic only — classification, the nowcast
 * window, and the advice rules. That is where the product actually lives, and
 * all of it is synchronous and dependency-free, so the suite needs no network,
 * no database, and no DOM.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
