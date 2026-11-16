import { defineConfig } from "vitest/config";
import { existsSync } from "node:fs";
import path from "node:path";

// RLS tests (tests/rls) talk to the staging database; secrets stay in the gitignored .env.local.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "tests/rls/**/*.test.ts"],
    environment: "node",
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "server-only": path.resolve(import.meta.dirname, "tests/server-only-stub.ts"),
    },
  },
});
