import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import * as barrel from "@/index";

// R15 static guard - mirrors updater/__tests__/purity.test.ts: it reads the
// actual source tree, package.json and vite.config.ts off disk (never trusting
// a mock) and asserts observable facts - a real barrel member, a declared
// dependency, a real vite external entry, and the hoisted hook's real import
// specifiers. Covers TC-001 (barrel export), TC-002 (dep declared +
// externalized) and TC-003 (hook purity - no app module / no @tauri-apps).

const testDir = dirname(fileURLToPath(import.meta.url));
const hookPath = resolve(testDir, "../use-action-hotkeys.ts");
const packageJsonPath = resolve(testDir, "../../../../package.json");
const viteConfigPath = resolve(testDir, "../../../../vite.config.ts");

// The hoisted hook may import ONLY these (plan File Structure): the React
// binding + the core hotkey type. No app module, no @tauri-apps, no settings.
const IMPORT_ALLOW_LIST = ["@tanstack/react-hotkeys", "@tanstack/hotkeys"];

const FORBIDDEN = [
  { label: "@tauri-apps/*", test: (s: string) => s.startsWith("@tauri-apps/") },
  {
    label: "@/lib/settings/*",
    test: (s: string) => s.startsWith("@/lib/settings/"),
  },
  {
    label: "@/lib/shortcuts/registry",
    test: (s: string) => s === "@/lib/shortcuts/registry",
  },
  {
    label: "an app resolve.ts",
    test: (s: string) => /(^|\/)resolve$/.test(s) && s.startsWith("@/"),
  },
];

// Extract every module specifier used in a static/dynamic import, re-export or
// require call (same scanner as updater/__tests__/purity.test.ts).
function importedSpecifiers(source: string): string[] {
  const specifiers: string[] = [];
  const patterns = [
    /\bfrom\s*["']([^"']+)["']/g,
    /\bimport\s*["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null = pattern.exec(source);
    while (match !== null) {
      specifiers.push(match[1]);
      match = pattern.exec(source);
    }
  }
  return specifiers;
}

describe("pureui barrel exports useActionHotkeys (AC-001 / TC-001)", () => {
  const api = barrel as Record<string, unknown>;

  // TC-001 - side-effect contract: the barrel re-exports a callable hook.
  it("should re-export useActionHotkeys as a function from @/index", () => {
    expect(typeof api.useActionHotkeys).toBe("function");
  });
});

describe("pureui declares + externalizes @tanstack/react-hotkeys (AC-002 / TC-002)", () => {
  // TC-002 - side-effect contract: the new dep is declared.
  it("should declare @tanstack/react-hotkeys in dependencies or peerDependencies", () => {
    const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      dependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
    };
    const declared = [
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.peerDependencies ?? {}),
    ];

    expect(declared).toContain("@tanstack/react-hotkeys");
  });

  // TC-002 - side-effect contract: the dep is externalized (never bundled).
  it("should list @tanstack/react-hotkeys in vite rollupOptions.external", () => {
    const viteConfig = readFileSync(viteConfigPath, "utf8");

    expect(viteConfig).toContain('"@tanstack/react-hotkeys"');
  });
});

describe("pureui useActionHotkeys purity (AC-003 / TC-003)", () => {
  // TC-003 - side-effect contract: the hoisted hook imports only allow-listed
  // packages - no app module, no @tauri-apps, no settings read.
  it("should import only @tanstack/react-hotkeys and @tanstack/hotkeys", () => {
    expect(existsSync(hookPath)).toBe(true);

    const specifiers = importedSpecifiers(readFileSync(hookPath, "utf8"));

    const offenders = specifiers.filter(
      (spec) => !IMPORT_ALLOW_LIST.includes(spec),
    );
    expect(offenders).toEqual([]);
  });

  // TC-003 - side-effect contract: explicit forbidden-module guard for a clear
  // failure message mapping directly to AC-003.
  it("should not import an app module or @tauri-apps", () => {
    expect(existsSync(hookPath)).toBe(true);

    const specifiers = importedSpecifiers(readFileSync(hookPath, "utf8"));

    const offenders = specifiers.filter((spec) =>
      FORBIDDEN.some((f) => f.test(spec)),
    );
    expect(offenders).toEqual([]);
  });
});
