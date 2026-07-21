/// <reference types="vitest/config" />
import { copyFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import dts from "vite-plugin-dts";

function copyThemeCss(): Plugin {
  return {
    name: "pureui:copy-theme-css",
    apply: "build",
    closeBundle() {
      const outDir = resolve(__dirname, "dist/styles");
      mkdirSync(outDir, { recursive: true });
      copyFileSync(
        resolve(__dirname, "src/styles/theme.css"),
        resolve(outDir, "theme.css"),
      );
    },
  };
}

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    dts({
      include: ["src"],
      exclude: ["src/**/*.stories.tsx", "src/**/*.test.{ts,tsx}", "src/test"],
      tsconfigPath: "./tsconfig.json",
    }),
    copyThemeCss(),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: "index",
    },
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime"],
      output: {
        assetFileNames: "styles/[name][extname]",
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.stories.tsx", "src/index.ts", "src/test/**"],
    },
  },
});
