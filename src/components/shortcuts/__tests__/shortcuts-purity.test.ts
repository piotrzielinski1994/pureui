import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import * as barrel from "@/index";

// R6b static guard - mirrors action-hotkeys-purity.test.ts / updater purity:
// read the actual component source, the barrel and package.json off disk (never
// a mock) and assert observable facts - the barrel re-exports both components as
// functions (TC-001), the two component files import ONLY allow-listed modules
// with no app module / no @tauri-apps (TC-002, AC-003), and the pureui version
// is bumped to 0.13.0 (AC-009).

const testDir = dirname(fileURLToPath(import.meta.url));
const rowPath = resolve(testDir, "../shortcut-row.tsx");
const sectionPath = resolve(testDir, "../shortcuts-section.tsx");
const packageJsonPath = resolve(testDir, "../../../../package.json");

// The two hoisted components may import ONLY these (plan File Structure):
// react, the core hotkey formatter, and pureui's own R6 core (Button,
// useRecordHotkey), sibling shortcut-row, and cn. No app module, no @tauri-apps.
const IMPORT_ALLOW_LIST = [
  "react",
  "@tanstack/hotkeys",
  "@/components/button/button",
  "@/lib/shortcuts/record-hotkey",
  "@/components/shortcuts/shortcut-row",
  "@/lib/utils",
];

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
// require call (same scanner as action-hotkeys-purity.test.ts).
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

describe("pureui barrel exports ShortcutRow + ShortcutsSection (AC-001 / AC-002 / TC-001)", () => {
  const api = barrel as Record<string, unknown>;

  // TC-001 - side-effect contract: the barrel re-exports the row component.
  it("should re-export ShortcutRow as a function from @/index", () => {
    expect(typeof api.ShortcutRow).toBe("function");
  });

  // TC-001 - side-effect contract: the barrel re-exports the section component.
  it("should re-export ShortcutsSection as a function from @/index", () => {
    expect(typeof api.ShortcutsSection).toBe("function");
  });
});

describe("pureui shortcut components purity (AC-003 / TC-002)", () => {
  const componentFiles = [
    { label: "shortcut-row.tsx", path: rowPath },
    { label: "shortcuts-section.tsx", path: sectionPath },
  ];

  // TC-002 - side-effect contract: the two components import only allow-listed
  // packages - no app module, no @tauri-apps, no settings/registry/resolve.
  for (const file of componentFiles) {
    it(`should import only allow-listed modules in ${file.label}`, () => {
      expect(existsSync(file.path)).toBe(true);

      const specifiers = importedSpecifiers(readFileSync(file.path, "utf8"));

      const offenders = specifiers.filter(
        (spec) => !IMPORT_ALLOW_LIST.includes(spec),
      );
      expect(offenders).toEqual([]);
    });

    // TC-002 - explicit forbidden-module guard for a clear failure message
    // mapping directly to AC-003.
    it(`should not import an app module or @tauri-apps in ${file.label}`, () => {
      expect(existsSync(file.path)).toBe(true);

      const specifiers = importedSpecifiers(readFileSync(file.path, "utf8"));

      const offenders = specifiers.filter((spec) =>
        FORBIDDEN.some((f) => f.test(spec)),
      );
      expect(offenders).toEqual([]);
    });
  }
});

describe("pureui version bump (AC-009)", () => {
  // AC-009 - side-effect contract: the minor bump to 0.13.0 is what the apps
  // pin their @pziel/pureui dependency to.
  it("should have bumped the pureui version to 0.13.0", () => {
    const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      version: string;
    };

    expect(pkg.version).toBe("0.13.0");
  });
});
