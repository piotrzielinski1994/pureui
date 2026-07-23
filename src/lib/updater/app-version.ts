// The VERSION seam. pureui owns the non-Tauri fallback branch; the app injects
// the host detector (`isTauri`) and the Tauri version binding (`getVersion`,
// wrapping `@tauri-apps/api/app`'s getVersion). pureui imports no @tauri-apps
// API - the concrete bindings stay app-side, mirroring the native seam.

// The version shown when running outside a Tauri host (dev browser / jsdom),
// where the native getVersion() would throw.
export const FALLBACK_VERSION = "dev";

export type AppVersionDeps = {
  isTauri: () => boolean;
  getVersion: () => Promise<string>;
};

export function createAppVersionGetter(
  deps: AppVersionDeps,
): () => Promise<string> {
  return () => {
    if (!deps.isTauri()) {
      return Promise.resolve(FALLBACK_VERSION);
    }
    return deps.getVersion();
  };
}

export function fallbackAppVersion(): Promise<string> {
  return Promise.resolve(FALLBACK_VERSION);
}
