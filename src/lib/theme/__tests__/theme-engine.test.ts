import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import * as barrel from "@/index";

// R13 AC-001 (barrel) + AC-002 (purity, targeted). The two hoisted theme-engine
// modules (apply-vars.ts / overrides.ts) must be re-exported from the barrel and
// must stay catalog-free + Tauri-free: they carry NO fixed token catalog (each
// app passes its own APP_TOKENS/EDITOR_TOKENS in), so they must import no
// `theme-defaults` module and no `@tauri-apps/*`. The whole-tree `@tauri-apps/*`
// scan already lives in updater/__tests__/purity.test.ts; this file adds the
// barrel-member assertions plus a TARGETED read of just these two new modules'
// import specifiers. We assert observable facts (real barrel members, real
// import specifiers off disk), never implementation internals.

const testDir = dirname(fileURLToPath(import.meta.url));
const themeDir = resolve(testDir, ".."); // .../pureui/src/lib/theme

// The two hoisted engine modules under test (plan File Structure).
const ENGINE_MODULES = ["apply-vars.ts", "overrides.ts"];

// Extract every module specifier used in a static/dynamic import, re-export, or
// require call (mirrors updater/__tests__/purity.test.ts).
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

describe("pureui theme engine barrel exports (AC-001 / TC-001)", () => {
  const api = barrel as Record<string, unknown>;

  // AC-001 / TC-001 - behavior: applyThemeVars is re-exported from @/index.
  it("should re-export applyThemeVars as a function from @/index", () => {
    expect(typeof api.applyThemeVars).toBe("function");
  });

  // AC-001 / TC-001 - behavior: applyDefaults is re-exported from @/index.
  it("should re-export applyDefaults as a function from @/index", () => {
    expect(typeof api.applyDefaults).toBe("function");
  });

  // AC-001 / TC-001 - behavior: diffOverrides is re-exported from @/index.
  it("should re-export diffOverrides as a function from @/index", () => {
    expect(typeof api.diffOverrides).toBe("function");
  });
});

describe("pureui theme engine purity - catalog-free + Tauri-free (AC-002 / TC-002)", () => {
  // AC-002 / TC-002 - behavior: neither new module imports a theme-defaults
  // catalog (each app supplies its own token arrays, so pureui carries none).
  it("should have neither apply-vars.ts nor overrides.ts import a theme-defaults catalog", () => {
    const offenders: string[] = [];

    for (const module of ENGINE_MODULES) {
      const specifiers = importedSpecifiers(
        readFileSync(resolve(themeDir, module), "utf8"),
      );
      for (const spec of specifiers) {
        if (/(^|\/)theme-defaults$/.test(spec)) {
          offenders.push(`${module} imports ${spec}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  // AC-002 / TC-002 - behavior: neither new module imports @tauri-apps/* (a
  // targeted echo of the whole-tree scan in updater/__tests__/purity.test.ts).
  it("should have neither apply-vars.ts nor overrides.ts import @tauri-apps/*", () => {
    const offenders: string[] = [];

    for (const module of ENGINE_MODULES) {
      const specifiers = importedSpecifiers(
        readFileSync(resolve(themeDir, module), "utf8"),
      );
      for (const spec of specifiers) {
        if (spec.startsWith("@tauri-apps/")) {
          offenders.push(`${module} imports ${spec}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
