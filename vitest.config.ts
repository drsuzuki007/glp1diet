import path from "node:path";
import { defineConfig } from "vitest/config";

const projectRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: projectRoot,
  resolve: {
    alias: {
      "@": path.resolve(projectRoot, "client", "src"),
      "@shared": path.resolve(projectRoot, "shared"),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "server/**/*.test.ts",
      "server/**/*.test.tsx",
      "shared/**/*.test.ts",
      "client/**/*.test.ts",
      "client/**/*.test.tsx",
    ],
    environmentMatchGlobs: [["**/*.test.tsx", "jsdom"]],
  },
});
