import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // every test hits devnet: run files one at a time, tests in order, generous timeouts
    fileParallelism: false,
    sequence: { concurrent: false },
    retry: 1, // devnet flake insurance: re-run a failed test once before reporting red
    testTimeout: 120_000,
    hookTimeout: 120_000,
    include: ["tests/**/*.test.ts"],
  },
});
