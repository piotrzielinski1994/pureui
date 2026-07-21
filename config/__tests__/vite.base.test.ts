import type { UserConfig } from "vite";
import { createTauriViteConfig } from "../vite.base";

const appUrl = "file:///tmp/fakeapp/vite.config.ts";

const hasName = (plugin: unknown): plugin is { name: string } =>
  typeof plugin === "object" &&
  plugin !== null &&
  "name" in plugin &&
  typeof Reflect.get(plugin, "name") === "string";

const readAtAlias = (config: UserConfig): unknown => {
  const alias = config.resolve?.alias;
  if (!alias || Array.isArray(alias)) {
    return undefined;
  }
  return Reflect.get(alias, "@");
};

describe("createTauriViteConfig", () => {
  it("should set server.port to devPort when devPort is provided", () => {
    const config = createTauriViteConfig({
      appUrl,
      devPort: 1430,
      hmrPort: 1421,
    });

    expect(config.server?.port).toBe(1430);
  });

  it("should wire react+tailwind plugins, the @->src alias, tauri watch-ignores, and locked server flags when built", () => {
    const config = createTauriViteConfig({
      appUrl,
      devPort: 1430,
      hmrPort: 1421,
    });
    const plugins = (config.plugins ?? []).flat(4).filter(hasName);

    expect(plugins.some((plugin) => plugin.name.includes("react"))).toBe(true);
    expect(plugins.some((plugin) => plugin.name.includes("tailwind"))).toBe(
      true,
    );

    const atAlias = readAtAlias(config);
    expect(typeof atAlias).toBe("string");
    expect(String(atAlias).endsWith("/tmp/fakeapp/src")).toBe(true);

    const ignored = config.server?.watch?.ignored;
    expect(Array.isArray(ignored)).toBe(true);
    expect(ignored).toContain("**/src-tauri/**");
    expect(ignored).toContain("**/.pzielinski/**");

    expect(config.clearScreen).toBe(false);
    expect(config.server?.strictPort).toBe(true);
  });

  it("should disable hmr+host when TAURI_DEV_HOST is unset and wire hmr.port/host to it when set", () => {
    const original = process.env.TAURI_DEV_HOST;

    try {
      delete process.env.TAURI_DEV_HOST;
      const withoutHost = createTauriViteConfig({
        appUrl,
        devPort: 1430,
        hmrPort: 1421,
      });

      expect(withoutHost.server?.hmr).toBeUndefined();
      expect(withoutHost.server?.host).toBe(false);

      process.env.TAURI_DEV_HOST = "1.2.3.4";
      const withHost = createTauriViteConfig({
        appUrl,
        devPort: 1430,
        hmrPort: 1421,
      });
      const hmr = withHost.server?.hmr;
      const hmrObject = hmr && typeof hmr === "object" ? hmr : undefined;

      expect(hmrObject?.port).toBe(1421);
      expect(hmrObject?.host).toBe("1.2.3.4");
      expect(withHost.server?.host).toBe("1.2.3.4");
    } finally {
      if (original === undefined) {
        delete process.env.TAURI_DEV_HOST;
      } else {
        process.env.TAURI_DEV_HOST = original;
      }
    }
  });
});
