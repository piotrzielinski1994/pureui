import { readdirSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import * as barrel from "@/index";

// AC-002 (purity) + AC-001 (barrel). pureui must stay toast-lib-free and
// @tauri-apps-free: every native + toast behavior enters through injected
// dependencies. This is a STATIC guard - it reads the actual source tree and
// package.json off disk (like config/__tests__/presets.test.ts) rather than
// trusting a mock. It also asserts the hoisted updater module ships its five
// source files and that the barrel re-exports the public updater API. We assert
// observable facts (files on disk, real import specifiers, real barrel members),
// never implementation internals.

const testDir = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(testDir, "../../.."); // .../pureui/src
const packageJsonPath = resolve(testDir, "../../../../package.json");

// The five hoisted updater source files (AC-001 / plan File Structure).
const UPDATER_SOURCE_FILES = [
  "lib/updater/update-controller.ts",
  "lib/updater/app-version.ts",
  "lib/updater/show-update-toast.ts",
  "lib/updater/update-checker.tsx",
  "lib/updater/updater-context.tsx",
];

// Recursively collect every non-test source module under src (skip test files,
// story files, and the vitest setup dir - those legitimately mention the
// forbidden names in fakes/comments/strings; AC-002 is about production source).
function collectSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__" || entry.name === "test") continue;
      collectSourceFiles(full, acc);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry.name)) continue;
    if (/\.(test|stories)\.(ts|tsx)$/.test(entry.name)) continue;
    acc.push(full);
  }
  return acc;
}

// Extract every module specifier used in a static/dynamic import, re-export, or
// require call, so we can test each against the forbidden-module patterns.
function importedSpecifiers(source: string): string[] {
  const specifiers: string[] = [];
  const patterns = [
    /\bfrom\s*["']([^"']+)["']/g, // import ... from "x" / export ... from "x"
    /\bimport\s*["']([^"']+)["']/g, // side-effect import "x"
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g, // dynamic import("x")
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g, // require("x")
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

const FORBIDDEN = [
  { label: "@tauri-apps/*", test: (s: string) => s.startsWith("@tauri-apps/") },
  {
    label: "sonner",
    test: (s: string) => s === "sonner" || s.startsWith("sonner/"),
  },
];

describe("pureui updater module (AC-001)", () => {
  // AC-001 - behavior: the mechanism is hoisted into pureui as five source files.
  it("should ship the five hoisted updater source files under src/lib/updater", () => {
    const present = collectSourceFiles(srcDir).map((f) =>
      relative(srcDir, f).replace(/\\/g, "/"),
    );

    for (const expected of UPDATER_SOURCE_FILES) {
      expect(present).toContain(expected);
    }
  });
});

describe("pureui purity - no @tauri-apps or toast lib imports (AC-002 / TC-017)", () => {
  // TC-017 - behavior: no production source file imports a forbidden module.
  it("should have no src file importing @tauri-apps/* or a toast library", () => {
    const offenders: string[] = [];

    for (const file of collectSourceFiles(srcDir)) {
      const specifiers = importedSpecifiers(readFileSync(file, "utf8"));
      for (const spec of specifiers) {
        const hit = FORBIDDEN.find((f) => f.test(spec));
        if (hit) {
          offenders.push(`${relative(srcDir, file)} imports ${spec}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  // TC-017 - behavior: package.json declares no @tauri-apps/* or toast-lib dep.
  it("should declare no @tauri-apps/* or toast-lib dependency in package.json", () => {
    const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
    };
    const declared = [
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {}),
      ...Object.keys(pkg.peerDependencies ?? {}),
    ];

    const offenders = declared.filter((name) =>
      FORBIDDEN.some((f) => f.test(name)),
    );

    expect(offenders).toEqual([]);
  });
});

describe("pureui barrel exports (AC-001)", () => {
  const api = barrel as Record<string, unknown>;

  // AC-001 - behavior: every updater VALUE symbol is re-exported from the barrel.
  it("should re-export the updater value symbols from @/index", () => {
    expect(typeof api.createUpdateController).toBe("function");
    expect(typeof api.createNoopUpdateController).toBe("function");
    expect(typeof api.createAppVersionGetter).toBe("function");
    expect(typeof api.fallbackAppVersion).toBe("function");
    expect(typeof api.showUpdateToast).toBe("function");
    expect(typeof api.UpdaterProvider).toBe("function");
    expect(typeof api.useUpdater).toBe("function");
    expect(typeof api.UpdateChecker).toBe("function");
  });

  // AC-001 - behavior: the FALLBACK_VERSION sentinel is re-exported from the barrel.
  it("should re-export FALLBACK_VERSION as 'dev' from @/index", () => {
    expect(api.FALLBACK_VERSION).toBe("dev");
  });
});
