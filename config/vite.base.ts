import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import type { UserConfig } from "vite";

export type TauriViteConfigOptions = {
  appUrl: string;
  devPort: number;
  hmrPort: number;
};

export function createTauriViteConfig({
  appUrl,
  devPort,
  hmrPort,
}: TauriViteConfigOptions): UserConfig {
  const host = process.env.TAURI_DEV_HOST;

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", appUrl)),
      },
    },
    clearScreen: false,
    server: {
      port: devPort,
      strictPort: true,
      host: host || false,
      hmr: host ? { protocol: "ws", host, port: hmrPort } : undefined,
      watch: {
        ignored: ["**/src-tauri/**", "**/.pzielinski/**"],
      },
    },
  };
}
