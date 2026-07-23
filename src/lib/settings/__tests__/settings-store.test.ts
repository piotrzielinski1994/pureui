import { readdirSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { SettingsStore } from "@/index";
import * as barrel from "@/index";

// R11 hoisted settings seam (AC-001..AC-004). Only the Tauri-free parts of the
// settings-persistence seam are hoisted: the generic port type
// `SettingsStore<TSettings>` (src/lib/settings/store.ts) and the generic
// hold-last-value fake `createInMemorySettingsStore<TSettings>(initial)`
// (src/lib/settings/in-memory-store.ts), both re-exported from the barrel. The
// concrete `createTauriSettingsStore` (imports @tauri-apps/plugin-store's
// LazyStore) stays app-side, mirroring the R14 folder-picker split. These assert
// observable fake behavior through the public barrel export (resolved values,
// save()->load() transition), plus the static purity contract that the settings
// dir defines no Tauri factory and imports no @tauri-apps/* (read off disk, like
// updater/__tests__/purity.test.ts + lib/__tests__/hoisted-helpers.test.ts).
// The lib fake has NO default; the required `initial` is pinned via @ts-expect-error.

const testDir = dirname(fileURLToPath(import.meta.url));
const settingsDir = resolve(testDir, ".."); // .../pureui/src/lib/settings

// The two hoisted settings source files (AC-001 port, AC-002 fake).
const SETTINGS_SOURCE_FILES = ["store.ts", "in-memory-store.ts"];

// Collect every non-test source module directly under the settings dir (skip the
// __tests__ dir - test files legitimately mention the forbidden names in
// comments/fakes; the purity contract is about production source).
function collectSettingsSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__" || entry.name === "test") continue;
      collectSettingsSourceFiles(full, acc);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry.name)) continue;
    if (/\.(test|stories)\.(ts|tsx)$/.test(entry.name)) continue;
    acc.push(full);
  }
  return acc;
}

// Extract every module specifier used in a static/dynamic import or re-export, so
// each can be tested against the forbidden-module patterns (mirrors the existing
// pureui purity scans).
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

describe("pureui createInMemorySettingsStore (AC-002, AC-004)", () => {
  // TC-001 -> AC-001, AC-002 - behavior: the generic fake is re-exported from the
  // barrel as a function (the surface every app consumes it through).
  it("should re-export createInMemorySettingsStore as a function from the pureui barrel", () => {
    expect(
      typeof (barrel as Record<string, unknown>).createInMemorySettingsStore,
    ).toBe("function");
  });

  // TC-003 -> AC-004 - behavior: load() resolves the seed when save() never ran.
  it("should resolve the seed if load() is called before any save()", async () => {
    const store = barrel.createInMemorySettingsStore({ a: 1 });

    await expect(store.load()).resolves.toEqual({ a: 1 });
  });

  // TC-004 -> AC-004 - behavior: save(next) replaces the held value and resolves
  // undefined; a subsequent load() resolves next, not the seed.
  it("should resolve the last-saved value not the seed if save() ran, and save() should resolve undefined", async () => {
    const store = barrel.createInMemorySettingsStore({ a: 1 });

    await expect(store.save({ a: 2 })).resolves.toBeUndefined();
    await expect(store.load()).resolves.toEqual({ a: 2 });
  });

  // TC-005 -> AC-002 - behavior: the fake is generic over an arbitrary
  // non-Settings TSettings, and the SettingsStore<T> type re-export type-checks
  // (the typed binding compiles).
  it("should resolve an arbitrary non-Settings payload if constructed generically over that type", async () => {
    const store: SettingsStore<{ a: number }> =
      barrel.createInMemorySettingsStore<{ a: number }>({ a: 1 });

    await expect(store.load()).resolves.toEqual({ a: 1 });
  });

  // TC-005 -> AC-002 - side-effect-contract: the lib fake requires `initial` (no
  // DEFAULT_SETTINGS default), so a no-argument call is a compile-time type error;
  // forced past the type checker it holds `undefined`, proving there is no default.
  it("should reject a no-argument call at compile time and resolve undefined if forced, proving no default", async () => {
    // @ts-expect-error - the pureui fake takes a REQUIRED `initial`; it has no default.
    const store = barrel.createInMemorySettingsStore();

    await expect(store.load()).resolves.toBeUndefined();
  });
});

describe("pureui settings dir purity (AC-003)", () => {
  // TC-002 -> AC-001, AC-002 - side-effect-contract: the settings dir ships the
  // hoisted port + fake source files.
  it("should ship store.ts and in-memory-store.ts under src/lib/settings", () => {
    const present = collectSettingsSourceFiles(settingsDir).map((f) =>
      relative(settingsDir, f).replace(/\\/g, "/"),
    );

    for (const expected of SETTINGS_SOURCE_FILES) {
      expect(present).toContain(expected);
    }
  });

  // TC-002 -> AC-003, AC-007 - side-effect-contract: the settings dir stays
  // Tauri-free - the hoisted port + fake source files import no @tauri-apps/*,
  // import no LazyStore, and define no createTauriSettingsStore (that factory
  // stays app-side). Reads the two expected files by path (not a dir glob) so the
  // assertion fails loudly if a source file is missing rather than passing
  // vacuously over an empty dir.
  it("should define no createTauriSettingsStore and import no LazyStore/@tauri-apps in src/lib/settings", () => {
    const importOffenders: string[] = [];
    const symbolOffenders: string[] = [];

    for (const rel of SETTINGS_SOURCE_FILES) {
      const source = readFileSync(resolve(settingsDir, rel), "utf8");

      for (const spec of importedSpecifiers(source)) {
        if (spec.startsWith("@tauri-apps/")) {
          importOffenders.push(`${rel} imports ${spec}`);
        }
      }
      if (/\bcreateTauriSettingsStore\b/.test(source)) {
        symbolOffenders.push(`${rel} defines createTauriSettingsStore`);
      }
      if (/\bLazyStore\b/.test(source)) {
        symbolOffenders.push(`${rel} references LazyStore`);
      }
    }

    expect(importOffenders).toEqual([]);
    expect(symbolOffenders).toEqual([]);
  });
});
