import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.ts"],
    testTimeout: 120_000,
    hookTimeout: 60_000,
  },
});
