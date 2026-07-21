/// <reference types="vitest/config" />
import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import type { UserConfig } from "vite";

export type VitestConfigOptions = {
  appUrl: string;
  setupFiles?: string[];
  include?: string[];
  inlineDeps?: string[];
};

export function createVitestConfig({
  appUrl,
  setupFiles = ["./src/test/setup.ts"],
  include = ["src/**/*.test.{ts,tsx}", "tests/**/*.spec.{ts,tsx}"],
  inlineDeps,
}: VitestConfigOptions): UserConfig {
  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", appUrl)),
      },
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles,
      include,
      ...(inlineDeps ? { server: { deps: { inline: inlineDeps } } } : {}),
    },
  };
}
