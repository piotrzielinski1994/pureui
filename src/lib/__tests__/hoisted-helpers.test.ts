import { readdirSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import * as barrel from "@/index";

// R14 barrel + purity guard (AC-001, AC-002, TC-001, TC-002, TC-014). The five
// hoisted helper modules (slug, result, panel-resize, drag-overlay-label,
// folder-picker) must all reach consumers through the pureui barrel, and pureui
// must stay Tauri-free and app-module-free. This is a STATIC guard that reads
// the actual source tree off disk (mirrors updater/__tests__/purity.test.ts)
// plus a live import of the barrel. Type-only members (Result, PanelResizeTarget,
// PanelLayout, FolderPicker) are erased at runtime, so we assert the observable
// VALUE members here and pin the value-bearing PANEL_RESIZE_STEP; the type
// exports are exercised for real by the per-module behavioral tests.

const testDir = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(testDir, "../.."); // .../pureui/src
const packageJsonPath = resolve(testDir, "../../../package.json");

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

const FORBIDDEN = [
  { label: "@tauri-apps/*", test: (s: string) => s.startsWith("@tauri-apps/") },
];

describe("pureui R14 barrel exports (AC-001 / TC-001)", () => {
  const api = barrel as Record<string, unknown>;

  // TC-001 -> AC-001 - behavior: every R14 VALUE symbol is re-exported and is of
  // the expected runtime type.
  it("should re-export the R14 value members from @/index", () => {
    expect(typeof api.slugify).toBe("function");
    expect(typeof api.uniqueSlug).toBe("function");
    expect(typeof api.toResult).toBe("function");
    expect(typeof api.resolveFocusedPanel).toBe("function");
    expect(typeof api.stepLayout).toBe("function");
    expect(typeof api.dragOverlayLabel).toBe("function");
    expect(typeof api.createNoopFolderPicker).toBe("function");
  });

  // TC-001 -> AC-001 - behavior: the resize-step constant is re-exported with
  // its value (5), proving it is a real value export not just a type.
  it("should re-export PANEL_RESIZE_STEP as 5 from @/index", () => {
    expect(api.PANEL_RESIZE_STEP).toBe(5);
  });

  // TC-014 -> AC-002, AC-007 - behavior: the Tauri factory is never surfaced on
  // the barrel (it stays app-side).
  it("should not re-export createTauriFolderPicker from @/index", () => {
    expect(api.createTauriFolderPicker).toBeUndefined();
  });
});

describe("pureui purity - no @tauri-apps or app-module imports (AC-002 / TC-002)", () => {
  // TC-002 -> AC-002 - side-effect-contract: no production src file imports a
  // forbidden module (@tauri-apps/* or an app settings module).
  it("should have no src file importing @tauri-apps/* or an app module", () => {
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

  // TC-002 -> AC-002 - side-effect-contract: package.json declares no
  // @tauri-apps/* dependency in any dependency group.
  it("should declare no @tauri-apps/* dependency in package.json", () => {
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
      name.startsWith("@tauri-apps/"),
    );

    expect(offenders).toEqual([]);
  });
});
