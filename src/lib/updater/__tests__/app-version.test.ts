import { describe, expect, it, vi } from "vitest";

import {
  createAppVersionGetter,
  FALLBACK_VERSION,
  fallbackAppVersion,
} from "@/lib/updater/app-version";

// The app-version getter is the VERSION seam. pureui owns the non-Tauri "dev"
// fallback branch; the app injects the Tauri version binding via `getVersion`
// and the host detector via `isTauri`. pureui imports no @tauri-apps/api. These
// tests drive the getter through hand-written fakes for `isTauri`/`getVersion`
// and assert observable behavior (the resolved string) plus the side-effect
// contract (the injected getVersion is only consulted inside a Tauri host).

describe("createAppVersionGetter", () => {
  // TC-006 (version - fallback) - behavior: outside Tauri it resolves the
  // non-empty "dev" fallback without throwing.
  it("should resolve to the non-empty 'dev' fallback when isTauri returns false", async () => {
    const getVersion = vi.fn(async () => "1.2.3");
    const getAppVersion = createAppVersionGetter({
      isTauri: () => false,
      getVersion,
    });

    await expect(getAppVersion()).resolves.toBe("dev");
    const resolved = await getAppVersion();
    expect(resolved.length).toBeGreaterThan(0);
  });

  // TC-006 (version - fallback) - side-effect-contract: the non-Tauri branch
  // must NOT touch the injected native version binding.
  it("should not call the injected getVersion when isTauri returns false", async () => {
    const getVersion = vi.fn(async () => "1.2.3");
    const getAppVersion = createAppVersionGetter({
      isTauri: () => false,
      getVersion,
    });

    await getAppVersion();

    expect(getVersion).not.toHaveBeenCalled();
  });

  // AC-005 - behavior + side-effect-contract: inside a Tauri host it delegates
  // to the injected getVersion and surfaces its resolved value.
  it("should delegate to the injected getVersion when isTauri returns true", async () => {
    const getVersion = vi.fn(async () => "0.9.1");
    const getAppVersion = createAppVersionGetter({
      isTauri: () => true,
      getVersion,
    });

    await expect(getAppVersion()).resolves.toBe("0.9.1");
    expect(getVersion).toHaveBeenCalledTimes(1);
  });
});

describe("fallbackAppVersion", () => {
  // AC-005 - behavior: the standalone fallback resolves the "dev" sentinel.
  it("should resolve to 'dev' without throwing", async () => {
    await expect(fallbackAppVersion()).resolves.toBe("dev");
  });
});

describe("FALLBACK_VERSION", () => {
  // AC-005 - behavior: the exported sentinel is the non-empty "dev" string.
  it("should equal the non-empty 'dev' sentinel", () => {
    expect(FALLBACK_VERSION).toBe("dev");
    expect(FALLBACK_VERSION.length).toBeGreaterThan(0);
  });
});
