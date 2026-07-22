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

const JSON_PRESETS = [
  "biome.base.json",
  "tsconfig.base.json",
  "tsconfig.node.base.json",
];

function copyJsonPresets(): Plugin {
  return {
    name: "pureui:copy-json-presets",
    apply: "build",
    closeBundle() {
      const outDir = resolve(__dirname, "dist/config");
      mkdirSync(outDir, { recursive: true });
      JSON_PRESETS.forEach((file) => {
        copyFileSync(resolve(__dirname, "config", file), resolve(outDir, file));
      });
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
      include: ["src", "config"],
      exclude: [
        "src/**/*.stories.tsx",
        "src/**/*.test.{ts,tsx}",
        "src/test",
        "config/__tests__",
      ],
      tsconfigPath: "./tsconfig.json",
    }),
    copyThemeCss(),
    copyJsonPresets(),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        "config/vite.base": resolve(__dirname, "config/vite.base.ts"),
        "config/vitest.base": resolve(__dirname, "config/vitest.base.ts"),
      },
      formats: ["es"],
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "vite",
        "vitest/config",
        "@vitejs/plugin-react",
        "@tailwindcss/vite",
        /^node:/,
        /^@radix-ui\//,
        "radix-ui",
        "cmdk",
        "react-resizable-panels",
        "class-variance-authority",
        "clsx",
        "tailwind-merge",
        "lucide-react",
      ],
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
